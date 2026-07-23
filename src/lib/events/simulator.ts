import { and, count, eq, gte, inArray, sql, sum } from 'drizzle-orm'

import { db } from '@/db'
import {
  accounts,
  activities,
  leads,
  reps,
  type LeadSource,
  type LeadStage,
} from '@/db/schema'
import { scoreLead } from '@/lib/analytics/scoring'
import { env } from '@/lib/env'
import { Random } from '@/lib/rng'

import { bus } from './bus'
import type { PulseSnapshot } from './types'

/**
 * Pacing. A real 14-rep team logs a few hundred touches and closes one or two
 * deals a day. The feed needs to look alive, so touches run far faster than
 * life, but closes stay rare on purpose: at the original 8% of ticks the demo
 * closed ~120 deals an hour and "won today" swamped every other day on the
 * chart within minutes of leaving a tab open.
 */
const TICK_MS = 3_500
const PULSE_MS = 5_000
/** Keep running briefly after the last viewer leaves so a page reload is seamless. */
const IDLE_SHUTDOWN_MS = 30_000

const OPEN_STAGES: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
]

const NEXT_STAGE: Record<string, LeadStage> = {
  new: 'contacted',
  contacted: 'qualified',
  qualified: 'proposal',
  proposal: 'negotiation',
  negotiation: 'won',
}

const TOUCH_VERBS = {
  email_sent: 'Emailed',
  call_logged: 'Called',
  meeting_booked: 'Booked a demo with',
  note_added: 'Left a note on',
} as const

type TouchType = keyof typeof TOUCH_VERBS

/**
 * Drives the demo pipeline forward in real time.
 *
 * Every couple of seconds it picks a live deal and does something plausible to
 * it — logs a touch, advances a stage, closes it, or lets a brand new lead land.
 * Each action is written to the database *and* published to the event bus, so
 * what the ticker shows and what a page refresh shows never disagree.
 *
 * The simulator is what a webhook from a real CRM would be in production; the
 * rest of the app cannot tell the difference.
 */
class PipelineSimulator {
  private tickTimer: ReturnType<typeof setInterval> | null = null
  private pulseTimer: ReturnType<typeof setInterval> | null = null
  private idleTimer: ReturnType<typeof setTimeout> | null = null
  private rng = new Random(env.SEED ^ 0x5f3759df)
  private running = false
  private busy = false

  get isRunning(): boolean {
    return this.running
  }

  /** Called when an SSE client connects. Idempotent. */
  ensureStarted(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer)
      this.idleTimer = null
    }
    if (this.running || !env.LIVE_SIMULATOR) return

    this.running = true
    this.tickTimer = setInterval(() => {
      void this.tick()
    }, TICK_MS)
    this.pulseTimer = setInterval(() => {
      void this.emitPulse()
    }, PULSE_MS)

    // Node keeps the process alive for pending timers; these are background work.
    this.tickTimer.unref?.()
    this.pulseTimer.unref?.()
  }

  /** Called when an SSE client disconnects; stops only once nobody is watching. */
  scheduleStopIfIdle(): void {
    if (bus.subscriberCount > 0 || this.idleTimer) return
    this.idleTimer = setTimeout(() => {
      this.idleTimer = null
      if (bus.subscriberCount === 0) this.stop()
    }, IDLE_SHUTDOWN_MS)
    this.idleTimer.unref?.()
  }

  stop(): void {
    if (this.tickTimer) clearInterval(this.tickTimer)
    if (this.pulseTimer) clearInterval(this.pulseTimer)
    this.tickTimer = null
    this.pulseTimer = null
    this.running = false
  }

  private async tick(): Promise<void> {
    // Ticks are cheap but not instant; skip rather than pile up behind a slow one.
    if (this.busy) return
    this.busy = true
    try {
      const action = this.rng.weighted([
        ['touch', 76],
        ['advance', 17],
        ['create', 7],
      ] as ReadonlyArray<readonly ['touch' | 'advance' | 'create', number]>)

      if (action === 'create') await this.createLead()
      else await this.actOnOpenLead(action)
    } catch (error) {
      console.error('[simulator] tick failed', error)
    } finally {
      this.busy = false
    }
  }

  private async pickOpenLead() {
    // ORDER BY RANDOM() over a few thousand rows is fine and keeps this one query.
    const [row] = await db
      .select({
        id: leads.id,
        name: leads.name,
        stage: leads.stage,
        valueCents: leads.valueCents,
        ownerId: leads.ownerId,
        ownerName: reps.name,
        ownerAvatar: reps.avatarUrl,
        accountName: accounts.name,
      })
      .from(leads)
      .innerJoin(reps, eq(leads.ownerId, reps.id))
      .innerJoin(accounts, eq(leads.accountId, accounts.id))
      .where(inArray(leads.stage, OPEN_STAGES))
      .orderBy(sql`random()`)
      .limit(1)

    return row ?? null
  }

  private async actOnOpenLead(action: 'touch' | 'advance'): Promise<void> {
    const lead = await this.pickOpenLead()
    if (!lead) return

    const now = Date.now()
    const actor = {
      repId: lead.ownerId,
      name: lead.ownerName,
      avatarUrl: lead.ownerAvatar,
    }
    const subject = {
      leadId: lead.id,
      leadName: lead.name,
      accountName: lead.accountName,
      valueCents: lead.valueCents,
    }

    if (action === 'touch') {
      const type = this.rng.weighted([
        ['email_sent', 42],
        ['call_logged', 26],
        ['note_added', 20],
        ['meeting_booked', 12],
      ] as ReadonlyArray<readonly [TouchType, number]>)

      // The account is rendered on the feed's second line, so leaving it out of
      // the headline keeps it from truncating in a narrow column.
      const summary = `${TOUCH_VERBS[type]} ${lead.name}`

      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: lead.id,
        repId: lead.ownerId,
        type,
        summary,
        createdAt: new Date(now),
      })
      await db
        .update(leads)
        .set({ updatedAt: new Date(now) })
        .where(eq(leads.id, lead.id))

      bus.publish({ type: 'lead.touched', activity: type, actor, subject, summary })
      return
    }

    // Deals only close by advancing out of negotiation — there is no separate
    // "close a random deal" action. That ties the win rate to how many deals
    // actually reach the last stage, the way it works in life.
    if (lead.stage === 'negotiation') {
      const won = this.rng.chance(0.55)
      const stage: LeadStage = won ? 'won' : 'lost'
      const summary = won
        ? `${lead.accountName} signed`
        : `${lead.accountName} closed lost`

      await db
        .update(leads)
        .set({ stage, closedAt: new Date(now), updatedAt: new Date(now) })
        .where(eq(leads.id, lead.id))
      await db.insert(activities).values({
        id: crypto.randomUUID(),
        leadId: lead.id,
        repId: lead.ownerId,
        type: won ? 'deal_won' : 'deal_lost',
        summary,
        fromStage: lead.stage,
        toStage: stage,
        valueCents: lead.valueCents,
        createdAt: new Date(now),
      })

      bus.publish({
        type: won ? 'deal.won' : 'deal.lost',
        actor,
        subject,
        summary,
      })
      return
    }

    const toStage = NEXT_STAGE[lead.stage]
    if (!toStage) return

    const summary = `Moved ${lead.name} to ${toStage}`
    await db
      .update(leads)
      .set({ stage: toStage, updatedAt: new Date(now) })
      .where(eq(leads.id, lead.id))
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      leadId: lead.id,
      repId: lead.ownerId,
      type: 'stage_changed',
      summary,
      fromStage: lead.stage,
      toStage,
      createdAt: new Date(now),
    })

    bus.publish({
      type: 'lead.stage_changed',
      fromStage: lead.stage,
      toStage,
      actor,
      subject,
      summary,
    })
  }

  private async createLead(): Promise<void> {
    const [account] = await db
      .select()
      .from(accounts)
      .orderBy(sql`random()`)
      .limit(1)
    const [owner] = await db
      .select()
      .from(reps)
      .where(eq(reps.active, true))
      .orderBy(sql`random()`)
      .limit(1)

    if (!account || !owner) return

    const now = Date.now()
    const source = this.rng.weighted([
      ['inbound', 32],
      ['outbound', 24],
      ['ads', 16],
      ['referral', 12],
      ['event', 9],
      ['partner', 7],
    ] as ReadonlyArray<readonly [LeadSource, number]>)

    const first = this.rng.pick([
      'Nadia',
      'Rhys',
      'Imani',
      'Kofi',
      'Lena',
      'Tomas',
      'Ada',
      'Milo',
    ])
    const last = this.rng.pick([
      'Brandt',
      'Okonkwo',
      'Reyes',
      'Lindholm',
      'Sato',
      'Moreau',
    ])
    const name = `${first} ${last}`
    const valueCents = Math.max(
      2_000_00,
      Math.round(this.rng.normal(16_000, 7_000)) * 100,
    )

    const { score } = scoreLead({
      source,
      sizeBucket: account.sizeBucket,
      valueCents,
      engagementCount: 0,
      daysSinceLastTouch: 0,
      hasMeeting: false,
    })

    const id = crypto.randomUUID()
    await db.insert(leads).values({
      id,
      name,
      email: `${first.toLowerCase()}.${last.toLowerCase()}@${account.domain}`,
      title: this.rng.pick([
        'Head of Operations',
        'VP of Sales',
        'Director of Growth',
        'Chief Technology Officer',
      ]),
      accountId: account.id,
      ownerId: owner.id,
      stage: 'new',
      source,
      valueCents,
      score,
      boardRank: -now,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
    await db.insert(activities).values({
      id: crypto.randomUUID(),
      leadId: id,
      repId: owner.id,
      type: 'lead_created',
      summary: `${name} came in from ${source}`,
      toStage: 'new',
      createdAt: new Date(now),
    })

    bus.publish({
      type: 'lead.created',
      source,
      score,
      actor: { repId: owner.id, name: owner.name, avatarUrl: owner.avatarUrl },
      subject: {
        leadId: id,
        leadName: name,
        accountName: account.name,
        valueCents,
      },
      summary: `${name} at ${account.name} came in from ${source}`,
    })
  }

  private async emitPulse(): Promise<void> {
    try {
      bus.publishPulse(await readPulse())
    } catch (error) {
      console.error('[simulator] pulse failed', error)
    }
  }
}

/** Current top-line numbers, published alongside the event stream. */
export async function readPulse(): Promise<PulseSnapshot> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  const [openRow, wonRow] = await Promise.all([
    db
      .select({ leads: count(), pipeline: sum(leads.valueCents) })
      .from(leads)
      .where(inArray(leads.stage, OPEN_STAGES)),
    db
      .select({ deals: count(), revenue: sum(leads.valueCents) })
      .from(leads)
      .where(and(eq(leads.stage, 'won'), gte(leads.closedAt, startOfDay))),
  ])

  return {
    openLeads: openRow[0]?.leads ?? 0,
    pipelineCents: Number(openRow[0]?.pipeline ?? 0),
    wonTodayCents: Number(wonRow[0]?.revenue ?? 0),
    wonTodayCount: wonRow[0]?.deals ?? 0,
    eventsPerMinute: bus.eventsPerMinute(),
  }
}

const globalForSimulator = globalThis as unknown as {
  leadscopeSimulator?: PipelineSimulator
}

export const simulator: PipelineSimulator =
  globalForSimulator.leadscopeSimulator ?? new PipelineSimulator()

if (env.NODE_ENV !== 'production') {
  globalForSimulator.leadscopeSimulator = simulator
}
