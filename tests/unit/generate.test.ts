/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest'

import { LEAD_STAGES } from '@/db/schema'
import { generateDataset, type GenerateOptions } from '@/lib/demo/generate'

const NOW = Date.UTC(2026, 6, 1)

const options: GenerateOptions = {
  seed: 20260101,
  now: NOW,
  days: 200,
  repCount: 6,
  accountCount: 30,
  leadCount: 400,
  passwordHash: 'scrypt$00$00',
}

const dataset = generateDataset(options)

describe('generateDataset', () => {
  it('is deterministic for a given seed', () => {
    const again = generateDataset(options)
    expect(again.leads.map((lead) => lead.id)).toEqual(
      dataset.leads.map((lead) => lead.id),
    )
    expect(again.activities).toHaveLength(dataset.activities.length)
  })

  it('produces a different book for a different seed', () => {
    const other = generateDataset({ ...options, seed: 777 })
    expect(other.leads[0]?.id).not.toBe(dataset.leads[0]?.id)
  })

  it('generates the requested volumes', () => {
    expect(dataset.leads).toHaveLength(options.leadCount)
    expect(dataset.accounts).toHaveLength(options.accountCount)
    // The demo admin account is added on top of the generated reps.
    expect(dataset.reps).toHaveLength(options.repCount + 1)
  })

  it('includes a signed-in-able demo account', () => {
    const demo = dataset.reps.find((rep) => rep.email === 'demo@leadscope.app')
    expect(demo).toBeDefined()
    expect(demo?.role).toBe('admin')
  })

  it('keeps every email and domain unique', () => {
    const emails = new Set(dataset.reps.map((rep) => rep.email))
    const domains = new Set(dataset.accounts.map((account) => account.domain))
    expect(emails.size).toBe(dataset.reps.length)
    expect(domains.size).toBe(dataset.accounts.length)
  })

  it('never places an event in the future', () => {
    for (const activity of dataset.activities) {
      expect(activity.createdAt.getTime()).toBeLessThanOrEqual(NOW)
    }
    for (const lead of dataset.leads) {
      expect(lead.createdAt.getTime()).toBeLessThanOrEqual(NOW)
      expect(lead.updatedAt.getTime()).toBeLessThanOrEqual(NOW)
      expect(lead.closedAt?.getTime() ?? 0).toBeLessThanOrEqual(NOW)
    }
  })

  it('closes exactly the leads that carry a close date', () => {
    for (const lead of dataset.leads) {
      const closed = lead.stage === 'won' || lead.stage === 'lost'
      expect(Boolean(lead.closedAt)).toBe(closed)
    }
  })

  it('never closes a deal before it was created', () => {
    for (const lead of dataset.leads) {
      if (!lead.closedAt) continue
      expect(lead.closedAt.getTime()).toBeGreaterThanOrEqual(lead.createdAt.getTime())
    }
  })

  it('gives every lead a creation event', () => {
    const created = dataset.activities.filter(
      (activity) => activity.type === 'lead_created',
    )
    expect(created).toHaveLength(dataset.leads.length)
  })

  it('references only real accounts and reps', () => {
    const accountIds = new Set(dataset.accounts.map((account) => account.id))
    const repIds = new Set(dataset.reps.map((rep) => rep.id))

    for (const lead of dataset.leads) {
      expect(accountIds.has(lead.accountId)).toBe(true)
      expect(repIds.has(lead.ownerId)).toBe(true)
    }
  })

  it('emits activities in chronological order', () => {
    for (let i = 1; i < dataset.activities.length; i += 1) {
      expect(dataset.activities[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        dataset.activities[i - 1]!.createdAt.getTime(),
      )
    }
  })

  it('lands a plausible win rate', () => {
    const won = dataset.leads.filter((lead) => lead.stage === 'won').length
    const lost = dataset.leads.filter((lead) => lead.stage === 'lost').length
    const rate = won / (won + lost)

    // Mid-market B2B win rates sit around 15-35%. Outside that band the demo
    // data stops looking like a real book of business.
    expect(rate).toBeGreaterThan(0.12)
    expect(rate).toBeLessThan(0.4)
  })

  it('leaves a live pipeline spread across every open stage', () => {
    const open = dataset.leads.filter(
      (lead) => lead.stage !== 'won' && lead.stage !== 'lost',
    )
    expect(open.length).toBeGreaterThan(20)

    for (const stage of ['new', 'contacted', 'qualified', 'proposal', 'negotiation']) {
      expect(open.filter((lead) => lead.stage === stage).length).toBeGreaterThan(0)
    }
  })

  it('only uses stages from the schema', () => {
    for (const lead of dataset.leads) {
      expect(LEAD_STAGES).toContain(lead.stage)
    }
  })

  it('gives every lost lead a reason', () => {
    for (const lead of dataset.leads) {
      if (lead.stage === 'lost') expect(lead.lostReason).toBeTruthy()
    }
  })

  it('never generates a free deal', () => {
    for (const lead of dataset.leads) {
      expect(lead.valueCents).toBeGreaterThan(0)
    }
  })

  it('scores every lead within range', () => {
    for (const lead of dataset.leads) {
      expect(lead.score).toBeGreaterThanOrEqual(0)
      expect(lead.score).toBeLessThanOrEqual(100)
    }
  })

  it('sets one goal per rep per month with no duplicates', () => {
    const keys = new Set(dataset.goals.map((goal) => `${goal.repId}:${goal.period}`))
    expect(keys.size).toBe(dataset.goals.length)
  })

  it('produces more arrivals on weekdays than at weekends', () => {
    let weekday = 0
    let weekend = 0
    for (const lead of dataset.leads) {
      const day = lead.createdAt.getUTCDay()
      if (day === 0 || day === 6) weekend += 1
      else weekday += 1
    }
    // Five weekdays to two weekend days, plus a deliberate weekend suppression.
    expect(weekday / 5).toBeGreaterThan(weekend / 2)
  })
})
