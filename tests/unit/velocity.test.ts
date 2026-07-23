import { describe, expect, it } from 'vitest'

import {
  salesCycle,
  stageDwellTimes,
  stalledLeads,
  type StageTransition,
} from '@/lib/analytics/velocity'

const DAY = 86_400_000
const T0 = Date.UTC(2026, 2, 1)

describe('stageDwellTimes', () => {
  it('measures the gap between consecutive transitions', () => {
    const transitions: StageTransition[] = [
      { leadId: 'a', fromStage: null, toStage: 'new', createdAt: T0 },
      { leadId: 'a', fromStage: 'new', toStage: 'contacted', createdAt: T0 + 2 * DAY },
      {
        leadId: 'a',
        fromStage: 'contacted',
        toStage: 'qualified',
        createdAt: T0 + 6 * DAY,
      },
    ]
    const dwell = stageDwellTimes(transitions)

    expect(dwell.find((row) => row.stage === 'new')?.averageDays).toBeCloseTo(2, 6)
    expect(dwell.find((row) => row.stage === 'contacted')?.averageDays).toBeCloseTo(
      4,
      6,
    )
  })

  it('does not sample a stage a lead has not left yet', () => {
    const dwell = stageDwellTimes([
      { leadId: 'a', fromStage: null, toStage: 'new', createdAt: T0 },
      { leadId: 'a', fromStage: 'new', toStage: 'contacted', createdAt: T0 + DAY },
    ])
    // 'contacted' is the last known position, so it contributes no sample.
    expect(dwell.find((row) => row.stage === 'contacted')).toBeUndefined()
  })

  it('reports median alongside mean, because dwell is long-tailed', () => {
    const transitions: StageTransition[] = []
    for (const [index, days] of [1, 1, 1, 90].entries()) {
      const id = `lead-${index}`
      transitions.push(
        { leadId: id, fromStage: null, toStage: 'new', createdAt: T0 },
        {
          leadId: id,
          fromStage: 'new',
          toStage: 'contacted',
          createdAt: T0 + days * DAY,
        },
      )
    }
    const row = stageDwellTimes(transitions).find((entry) => entry.stage === 'new')

    expect(row?.samples).toBe(4)
    expect(row?.medianDays).toBeCloseTo(1, 6)
    expect(row?.averageDays).toBeGreaterThan(20)
  })

  it('tolerates events arriving out of order', () => {
    const dwell = stageDwellTimes([
      { leadId: 'a', fromStage: 'new', toStage: 'contacted', createdAt: T0 + 3 * DAY },
      { leadId: 'a', fromStage: null, toStage: 'new', createdAt: T0 },
    ])
    expect(dwell.find((row) => row.stage === 'new')?.averageDays).toBeCloseTo(3, 6)
  })

  it('returns nothing for no transitions', () => {
    expect(stageDwellTimes([])).toEqual([])
  })
})

describe('salesCycle', () => {
  it('measures creation to close over won deals only', () => {
    const stats = salesCycle([
      { createdAt: T0, closedAt: T0 + 10 * DAY, stage: 'won' },
      { createdAt: T0, closedAt: T0 + 20 * DAY, stage: 'won' },
      { createdAt: T0, closedAt: T0 + 100 * DAY, stage: 'lost' },
      { createdAt: T0, closedAt: null, stage: 'proposal' },
    ])

    expect(stats.samples).toBe(2)
    expect(stats.averageDays).toBeCloseTo(15, 6)
    expect(stats.fastestDays).toBeCloseTo(10, 6)
    expect(stats.slowestDays).toBeCloseTo(20, 6)
  })

  it('is all zeroes when nothing has been won', () => {
    expect(salesCycle([{ createdAt: T0, closedAt: null, stage: 'new' }])).toEqual({
      averageDays: 0,
      medianDays: 0,
      fastestDays: 0,
      slowestDays: 0,
      samples: 0,
    })
  })
})

describe('stalledLeads', () => {
  const now = T0 + 100 * DAY

  it('finds open deals past the idle threshold', () => {
    const stalled = stalledLeads(
      [
        { id: 'fresh', stage: 'proposal', updatedAt: now - 2 * DAY, valueCents: 900 },
        { id: 'stale', stage: 'proposal', updatedAt: now - 30 * DAY, valueCents: 100 },
      ],
      now,
      14,
    )
    expect(stalled.map((lead) => lead.id)).toEqual(['stale'])
    expect(stalled[0]?.idleDays).toBe(30)
  })

  it('excludes closed deals — a won deal is not stalled', () => {
    const stalled = stalledLeads(
      [
        { id: 'won', stage: 'won', updatedAt: now - 90 * DAY, valueCents: 100 },
        { id: 'lost', stage: 'lost', updatedAt: now - 90 * DAY, valueCents: 100 },
      ],
      now,
    )
    expect(stalled).toEqual([])
  })

  it('sorts by value so the biggest stuck money surfaces first', () => {
    const stalled = stalledLeads(
      [
        { id: 'small', stage: 'new', updatedAt: now - 40 * DAY, valueCents: 100 },
        { id: 'big', stage: 'new', updatedAt: now - 20 * DAY, valueCents: 900 },
      ],
      now,
    )
    expect(stalled.map((lead) => lead.id)).toEqual(['big', 'small'])
  })

  it('breaks value ties on idle time', () => {
    const stalled = stalledLeads(
      [
        { id: 'newer', stage: 'new', updatedAt: now - 20 * DAY, valueCents: 500 },
        { id: 'older', stage: 'new', updatedAt: now - 60 * DAY, valueCents: 500 },
      ],
      now,
    )
    expect(stalled.map((lead) => lead.id)).toEqual(['older', 'newer'])
  })
})
