import { describe, expect, it } from 'vitest'

import {
  biggestLeak,
  buildFunnel,
  funnelIndex,
  stageIndex,
  winRate,
} from '@/lib/analytics/funnel'

import type { LeadStage } from '@/db/schema'

describe('stageIndex / funnelIndex', () => {
  it('orders the pipeline', () => {
    expect(stageIndex('new')).toBeLessThan(stageIndex('qualified'))
    expect(stageIndex('qualified')).toBeLessThan(stageIndex('won'))
  })

  it('places lost outside the funnel', () => {
    expect(funnelIndex('lost')).toBe(-1)
    expect(funnelIndex('won')).toBe(5)
  })
})

describe('buildFunnel', () => {
  it('counts cumulatively — reaching a stage counts for every earlier one', () => {
    const rows = buildFunnel(['proposal'])
    expect(rows.map((row) => row.count)).toEqual([1, 1, 1, 1, 0, 0])
  })

  it('computes conversion from the top and from the previous step', () => {
    const stages: LeadStage[] = [
      'new',
      'new',
      'contacted',
      'contacted',
      'qualified',
      'won',
    ]
    const rows = buildFunnel(stages)

    expect(rows[0]?.count).toBe(6)
    expect(rows[1]?.count).toBe(4)
    expect(rows[1]?.conversionFromTop).toBeCloseTo(4 / 6, 10)
    expect(rows[1]?.conversionFromPrevious).toBeCloseTo(4 / 6, 10)
    expect(rows[2]?.conversionFromPrevious).toBeCloseTo(2 / 4, 10)
    expect(rows[1]?.droppedOff).toBe(2)
  })

  it('ignores lost leads, which carry no funnel position', () => {
    // Callers pass the furthest stage reached, so a lost lead should already
    // have been resolved to the stage it died in.
    const rows = buildFunnel(['lost', 'lost', 'new'])
    expect(rows[0]?.count).toBe(1)
  })

  it('returns zeroed rows rather than NaN for no input', () => {
    const rows = buildFunnel([])
    expect(rows).toHaveLength(6)
    for (const row of rows) {
      expect(row.count).toBe(0)
      expect(row.conversionFromTop).toBe(0)
      expect(row.conversionFromPrevious).toBe(0)
    }
  })

  it('never reports a stage as larger than the one before it', () => {
    const rows = buildFunnel(['new', 'contacted', 'proposal', 'won', 'qualified'])
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.count).toBeLessThanOrEqual(rows[i - 1]!.count)
    }
  })
})

describe('winRate', () => {
  it('divides won by closed, not by total', () => {
    // Three open deals must not count as losses.
    const result = winRate(['won', 'won', 'lost', 'new', 'contacted', 'proposal'])
    expect(result).toEqual({ won: 2, lost: 1, open: 3, rate: 2 / 3 })
  })

  it('is zero before anything closes', () => {
    expect(winRate(['new', 'contacted']).rate).toBe(0)
  })

  it('is zero for no data at all', () => {
    expect(winRate([])).toEqual({ won: 0, lost: 0, open: 0, rate: 0 })
  })
})

describe('biggestLeak', () => {
  it('finds the largest single drop-off', () => {
    const rows = buildFunnel([
      'new',
      'new',
      'new',
      'new',
      'contacted',
      'contacted',
      'qualified',
    ])
    // 7 -> 3 into contacted is a bigger loss than 3 -> 1 into qualified.
    expect(biggestLeak(rows)?.stage).toBe('contacted')
  })

  it('returns null when nothing entered the funnel', () => {
    expect(biggestLeak(buildFunnel([]))).toBeNull()
  })
})
