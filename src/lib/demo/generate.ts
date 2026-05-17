import {
  ACTIVITY_TYPES,
  LEAD_SOURCES,
  type ActivityType,
  type LeadSource,
  type LeadStage,
  type NewAccount,
  type NewActivity,
  type NewGoal,
  type NewLead,
  type NewRep,
  type NewTeam,
} from '@/db/schema'
import { scoreLead } from '@/lib/analytics/scoring'
import { Random } from '@/lib/rng'

import {
  BUYER_TITLES,
  COMPANY_PREFIXES,
  COMPANY_SUFFIXES,
  COUNTRIES,
  FIRST_NAMES,
  INDUSTRIES,
  LAST_NAMES,
  LOST_REASONS,
  NOTE_TEMPLATES,
  REP_TITLES,
  SIZE_BUCKETS,
  TEAM_NAMES,
} from './pools'

const DAY = 86_400_000

export interface GenerateOptions {
  seed: number
  /** End of the generated history — usually "now". */
  now: number
  /** How far back the history reaches. */
  days: number
  repCount: number
  accountCount: number
  leadCount: number
  /** Pre-computed scrypt hash shared by every demo login. */
  passwordHash: string
}

export interface GeneratedDataset {
  teams: NewTeam[]
  reps: NewRep[]
  accounts: NewAccount[]
  leads: NewLead[]
  activities: NewActivity[]
  goals: NewGoal[]
}

/** Base odds of advancing out of each stage, before rep and source modifiers. */
const ADVANCE_ODDS: Record<string, number> = {
  new: 0.86,
  contacted: 0.62,
  qualified: 0.56,
  proposal: 0.63,
  negotiation: 0.55,
}

/** Mean days a lead rests in a stage before the next transition. Tuned so the
 *  end-to-end cycle lands around 45 days, which is typical for mid-market B2B. */
const DWELL_DAYS: Record<string, number> = {
  new: 2.5,
  contacted: 6.0,
  qualified: 12.0,
  proposal: 13.0,
  negotiation: 9.0,
}

/**
 * Not every deal that fails to advance is dead. Roughly a third go quiet and sit
 * in place — that population is what the "stalled deals" report exists to catch,
 * and without it the pipeline board would only ever hold last week's arrivals.
 */
const STALL_SHARE = 0.34

/**
 * Quiet deals don't stay in the pipeline forever. Most get swept up in a
 * hygiene pass a month or two later and closed out; the rest linger, and those
 * are the ones worth surfacing. Without this the open pipeline would be a
 * 14-month graveyard and every velocity number computed from it would be wrong.
 */
const HYGIENE_CLOSE_SHARE = 0.82
const HYGIENE_MIN_DAYS = 35
const HYGIENE_MAX_DAYS = 95

const PIPELINE: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
]

/** Channels differ in quality; referrals close, cold ads mostly do not. */
const SOURCE_QUALITY: Record<LeadSource, number> = {
  referral: 1.35,
  inbound: 1.15,
  event: 1.0,
  partner: 0.95,
  outbound: 0.82,
  ads: 0.7,
}

const SOURCE_WEIGHTS: ReadonlyArray<readonly [LeadSource, number]> = [
  ['inbound', 30],
  ['outbound', 24],
  ['ads', 16],
  ['referral', 12],
  ['event', 10],
  ['partner', 8],
]

/** The subset of activity types that count as a touch on an open deal. */
type TouchType = Extract<
  ActivityType,
  'email_sent' | 'call_logged' | 'meeting_booked' | 'note_added'
>

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/**
 * Lead arrival intensity for a given day: a gentle growth trend, a weekday
 * bias, and a summer/December dip. Without this the charts look like noise
 * around a flat line, which reads as fake immediately.
 */
function arrivalWeight(date: Date, progress: number, rng: Random): number {
  const weekday = date.getUTCDay()
  const weekdayFactor = weekday === 0 ? 0.18 : weekday === 6 ? 0.25 : 1
  const month = date.getUTCMonth()
  const seasonFactor = month === 11 ? 0.72 : month === 7 ? 0.82 : 1
  const growth = 0.65 + progress * 0.7
  const jitter = 0.75 + rng.float() * 0.5
  return weekdayFactor * seasonFactor * growth * jitter
}

function makeName(rng: Random): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`
}

export function generateDataset(options: GenerateOptions): GeneratedDataset {
  const rng = new Random(options.seed)
  const historyStart = options.now - options.days * DAY

  // ---------------------------------------------------------------- teams
  const teams: NewTeam[] = TEAM_NAMES.map((team, index) => ({
    id: `team_${slugify(team.name)}`,
    name: team.name,
    region: team.region,
    createdAt: new Date(historyStart - (index + 1) * 30 * DAY),
  }))

  // ----------------------------------------------------------------- reps
  const reps: NewRep[] = []
  /** Per-rep multiplier on conversion odds; the spread is what makes a leaderboard. */
  const repSkill = new Map<string, number>()

  const demoRep: NewRep = {
    id: 'rep_demo',
    name: 'Alex Rivera',
    email: 'demo@leadscope.app',
    passwordHash: options.passwordHash,
    role: 'admin',
    jobTitle: 'Head of Revenue',
    avatarUrl: 'https://i.pravatar.cc/160?u=leadscope-demo',
    teamId: teams[0]?.id ?? null,
    quotaCents: 180_000_00,
    startedAt: new Date(historyStart - 400 * DAY),
    active: true,
  }
  reps.push(demoRep)
  repSkill.set(demoRep.id, 1.2)

  const usedEmails = new Set<string>([demoRep.email])

  for (let i = 0; i < options.repCount; i += 1) {
    const name = makeName(rng)
    let email = `${slugify(name)}@leadscope.app`
    let suffix = 2
    while (usedEmails.has(email)) {
      email = `${slugify(name)}${suffix++}@leadscope.app`
    }
    usedEmails.add(email)

    const id = `rep_${slugify(name)}_${i}`
    const skill = Math.max(0.55, rng.normal(1, 0.22))
    repSkill.set(id, skill)

    reps.push({
      id,
      name,
      email,
      passwordHash: options.passwordHash,
      role: i < 2 ? 'manager' : 'rep',
      jobTitle: rng.pick(REP_TITLES),
      avatarUrl: `https://i.pravatar.cc/160?u=${encodeURIComponent(id)}`,
      teamId: rng.pick(teams).id,
      quotaCents: rng.int(60, 200) * 1000_00,
      startedAt: new Date(historyStart - rng.int(30, 900) * DAY),
      active: true,
    })
  }

  // ------------------------------------------------------------- accounts
  const accounts: NewAccount[] = []
  const usedDomains = new Set<string>()

  for (let i = 0; i < options.accountCount; i += 1) {
    let name = `${rng.pick(COMPANY_PREFIXES)} ${rng.pick(COMPANY_SUFFIXES)}`
    let domain = `${slugify(name)}.com`
    let suffix = 2
    while (usedDomains.has(domain)) {
      domain = `${slugify(name)}-${suffix}.com`
      name = `${name.split(' ')[0]} ${rng.pick(COMPANY_SUFFIXES)}`
      suffix += 1
    }
    usedDomains.add(domain)

    accounts.push({
      id: `acc_${i}_${slugify(domain).slice(0, 24)}`,
      name,
      domain,
      industry: rng.pick(INDUSTRIES),
      sizeBucket: rng.weighted([
        ['1-10', 12],
        ['11-50', 26],
        ['51-200', 30],
        ['201-1000', 20],
        ['1000+', 12],
      ] as ReadonlyArray<readonly [(typeof SIZE_BUCKETS)[number], number]>),
      country: rng.pick(COUNTRIES),
    })
  }

  // ---------------------------------------------------------------- leads
  const leads: NewLead[] = []
  const activities: NewActivity[] = []
  let activitySeq = 0

  /** Newest activity timestamp for the lead currently being generated. */
  let lastTouchAt = 0

  const pushActivity = (
    leadId: string,
    repId: string,
    type: ActivityType,
    summary: string,
    at: number,
    extra: Partial<NewActivity> = {},
  ) => {
    if (at > lastTouchAt) lastTouchAt = at
    activities.push({
      id: `act_${activitySeq++}`,
      leadId,
      repId,
      type,
      summary,
      createdAt: new Date(at),
      fromStage: extra.fromStage ?? null,
      toStage: extra.toStage ?? null,
      valueCents: extra.valueCents ?? null,
    })
  }

  // Distribute arrival dates according to the intensity curve.
  const dayWeights: number[] = []
  for (let day = 0; day < options.days; day += 1) {
    const date = new Date(historyStart + day * DAY)
    dayWeights.push(arrivalWeight(date, day / options.days, rng))
  }
  const weightTotal = dayWeights.reduce((sum, weight) => sum + weight, 0)

  const boardRankByStage = new Map<LeadStage, number>()

  for (let i = 0; i < options.leadCount; i += 1) {
    // Pick an arrival day proportional to that day's weight.
    let roll = rng.float() * weightTotal
    let dayIndex = 0
    while (dayIndex < dayWeights.length - 1) {
      roll -= dayWeights[dayIndex] as number
      if (roll <= 0) break
      dayIndex += 1
    }

    const createdAt =
      historyStart + dayIndex * DAY + rng.int(8, 19) * 3_600_000 + rng.int(0, 59) * 60_000

    const account = rng.pick(accounts)
    const owner = rng.pick(reps)
    const skill = repSkill.get(owner.id) ?? 1
    const source = rng.weighted(SOURCE_WEIGHTS)
    const quality = SOURCE_QUALITY[source]

    // Deal size scales with account headcount; log-normal-ish spread.
    const sizeMultiplier =
      { '1-10': 0.35, '11-50': 0.7, '51-200': 1.1, '201-1000': 2.1, '1000+': 4.2 }[
        account.sizeBucket
      ] ?? 1
    const valueCents = Math.max(
      1_500_00,
      Math.round(rng.normal(14_000, 6_500) * sizeMultiplier) * 100,
    )

    const leadName = makeName(rng)
    const leadId = `lead_${i}_${slugify(leadName)}`
    lastTouchAt = 0

    pushActivity(
      leadId,
      owner.id,
      'lead_created',
      `${leadName} came in from ${source}`,
      createdAt,
      { toStage: 'new' },
    )

    // Walk the pipeline until the lead stalls, closes, or runs past "now".
    let stage: LeadStage = 'new'
    let cursor = createdAt
    let closedAt: number | null = null
    let lostReason: string | null = null
    let touchCount = 0
    let hasMeeting = false

    for (let step = 0; step < PIPELINE.length; step += 1) {
      const current = PIPELINE[step] as LeadStage
      const dwell = Math.max(0.4, rng.normal(DWELL_DAYS[current] as number, 2.2))
      const nextAt = cursor + dwell * DAY

      // Log a couple of touches while the lead sits in this stage.
      const touches = rng.int(1, current === 'new' ? 2 : 3)
      for (let t = 0; t < touches; t += 1) {
        const at = cursor + ((t + 1) / (touches + 1)) * (nextAt - cursor)
        if (at > options.now) break
        const type = rng.weighted([
          ['email_sent', 40],
          ['call_logged', 26],
          ['note_added', 22],
          ['meeting_booked', 12],
        ] as ReadonlyArray<readonly [TouchType, number]>)
        if (type === 'meeting_booked') hasMeeting = true
        touchCount += 1
        const summary =
          type === 'email_sent'
            ? `Emailed ${leadName.split(' ')[0]} about next steps`
            : type === 'call_logged'
              ? `Call with ${leadName.split(' ')[0]} (${rng.int(6, 42)} min)`
              : type === 'meeting_booked'
                ? `Booked a demo with ${account.name}`
                : rng.pick(NOTE_TEMPLATES)
        pushActivity(leadId, owner.id, type, summary, at)
      }

      if (nextAt > options.now) break

      const odds = Math.min(0.97, (ADVANCE_ODDS[current] as number) * skill * quality)
      if (!rng.chance(odds)) {
        if (rng.chance(STALL_SHARE)) {
          // The deal goes quiet: still open, but nothing is moving. A stalled
          // deal is not abandoned though — reps keep poking at it, so scatter a
          // few follow-ups between here and now. Without them every stalled lead
          // would look untouched for a year and the "needs attention" report
          // would flag most of the open book.
          const followUps = rng.int(0, 3)
          for (let f = 0; f < followUps; f += 1) {
            const at = nextAt + rng.float() * (options.now - nextAt)
            if (at > options.now) continue
            touchCount += 1
            pushActivity(
              leadId,
              owner.id,
              'email_sent',
              `Followed up with ${leadName.split(' ')[0]} — no reply yet`,
              at,
            )
          }

          const sweepAt = nextAt + rng.int(HYGIENE_MIN_DAYS, HYGIENE_MAX_DAYS) * DAY
          if (sweepAt <= options.now && rng.chance(HYGIENE_CLOSE_SHARE)) {
            lostReason = 'No decision — went quiet'
            pushActivity(
              leadId,
              owner.id,
              'deal_lost',
              `${account.name} closed lost — no decision, went quiet`,
              sweepAt,
              { fromStage: current, toStage: 'lost', valueCents },
            )
            stage = 'lost'
            closedAt = sweepAt
            break
          }

          stage = current
          break
        }
        // The deal dies where it stands.
        lostReason = rng.pick(LOST_REASONS)
        pushActivity(
          leadId,
          owner.id,
          'deal_lost',
          `${account.name} closed lost — ${lostReason.toLowerCase()}`,
          nextAt,
          { fromStage: current, toStage: 'lost', valueCents },
        )
        stage = 'lost'
        closedAt = nextAt
        break
      }

      const next: LeadStage = step === PIPELINE.length - 1 ? 'won' : (PIPELINE[step + 1] as LeadStage)

      if (next === 'won') {
        pushActivity(
          leadId,
          owner.id,
          'deal_won',
          `${account.name} signed — ${(valueCents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}`,
          nextAt,
          { fromStage: current, toStage: 'won', valueCents },
        )
        stage = 'won'
        closedAt = nextAt
      } else {
        pushActivity(
          leadId,
          owner.id,
          'stage_changed',
          `Moved ${leadName} to ${next}`,
          nextAt,
          { fromStage: current, toStage: next },
        )
        stage = next
      }

      cursor = nextAt
      if (stage === 'won' || stage === 'lost') break
    }

    // Follow-ups are scattered rather than appended in order, so take the max
    // rather than trusting the last push.
    const lastTouch = lastTouchAt || createdAt
    const { score } = scoreLead({
      source,
      sizeBucket: account.sizeBucket,
      valueCents,
      engagementCount: touchCount,
      daysSinceLastTouch: Math.max(0, Math.floor((options.now - lastTouch) / DAY)),
      hasMeeting,
    })

    const rank = (boardRankByStage.get(stage) ?? 0) + 1
    boardRankByStage.set(stage, rank)

    leads.push({
      id: leadId,
      name: leadName,
      email: `${slugify(leadName)}@${account.domain}`,
      title: rng.pick(BUYER_TITLES),
      accountId: account.id,
      ownerId: owner.id,
      stage,
      source,
      valueCents,
      score,
      boardRank: rank,
      lostReason,
      createdAt: new Date(createdAt),
      updatedAt: new Date(Math.min(options.now, closedAt ?? lastTouch)),
      closedAt: closedAt === null ? null : new Date(closedAt),
    })
  }

  // ---------------------------------------------------------------- goals
  const goals: NewGoal[] = []
  const monthCount = Math.ceil(options.days / 30) + 1
  for (const rep of reps) {
    for (let m = 0; m < monthCount; m += 1) {
      const date = new Date(options.now)
      date.setUTCDate(1)
      date.setUTCMonth(date.getUTCMonth() - m)
      const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
      goals.push({
        id: `goal_${rep.id}_${period}`,
        repId: rep.id as string,
        period,
        targetCents: Math.round((rep.quotaCents ?? 0) * (0.9 + rng.float() * 0.25)),
      })
    }
  }

  activities.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  return { teams, reps, accounts, leads, activities, goals }
}

/** Exported for tests: the activity vocabulary the generator can emit. */
export const GENERATED_ACTIVITY_TYPES = ACTIVITY_TYPES
export const GENERATED_SOURCES = LEAD_SOURCES
