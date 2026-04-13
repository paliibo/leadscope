import { describe, expect, it } from 'vitest'

import { longestStreak, rankReps, type RankableRep } from '@/lib/analytics/leaderboard'

function rep(overrides: Partial<RankableRep> & { repId: string }): RankableRep {
  return {
    name: overrides.repId,
    jobTitle: 'AE',
    avatarUrl: null,
    team: null,
    wins: 0,
    revenueCents: 0,
    leadsWorked: 0,
    touches: 0,
    quotaCents: 0,
    ...overrides,
  }
}

describe('rankReps', () => {
  it('orders by the selected metric', () => {
    const ranked = rankReps(
      [
        rep({ repId: 'a', revenueCents: 100 }),
        rep({ repId: 'b', revenueCents: 300 }),
        rep({ repId: 'c', revenueCents: 200 }),
      ],
      'revenue',
    )
    expect(ranked.map((row) => row.repId)).toEqual(['b', 'c', 'a'])
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 3])
  })

  it('uses competition ranking so ties share a place', () => {
    const ranked = rankReps(
      [
        rep({ repId: 'a', wins: 5, revenueCents: 10 }),
        rep({ repId: 'b', wins: 5, revenueCents: 10 }),
        rep({ repId: 'c', wins: 1 }),
      ],
      'wins',
    )
    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 3])
  })

  it('breaks ties deterministically by revenue then name', () => {
    const first = rankReps(
      [
        rep({ repId: 'zoe', name: 'Zoe', wins: 3, revenueCents: 50 }),
        rep({ repId: 'amy', name: 'Amy', wins: 3, revenueCents: 50 }),
      ],
      'wins',
    )
    const second = rankReps(
      [
        rep({ repId: 'amy', name: 'Amy', wins: 3, revenueCents: 50 }),
        rep({ repId: 'zoe', name: 'Zoe', wins: 3, revenueCents: 50 }),
      ],
      'wins',
    )
    expect(first.map((row) => row.repId)).toEqual(second.map((row) => row.repId))
    expect(first[0]?.name).toBe('Amy')
  })

  it('expresses each rep as a share of the leader', () => {
    const ranked = rankReps(
      [rep({ repId: 'a', revenueCents: 100 }), rep({ repId: 'b', revenueCents: 50 })],
      'revenue',
    )
    expect(ranked[0]?.shareOfLeader).toBe(1)
    expect(ranked[1]?.shareOfLeader).toBe(0.5)
  })

  it('gives everyone a zero share when nobody has sold anything', () => {
    const ranked = rankReps([rep({ repId: 'a' }), rep({ repId: 'b' })], 'revenue')
    expect(ranked.every((row) => row.shareOfLeader === 0)).toBe(true)
  })

  it('reports attainment only where a quota is set', () => {
    const ranked = rankReps(
      [
        rep({ repId: 'a', revenueCents: 150, quotaCents: 100 }),
        rep({ repId: 'b', revenueCents: 150, quotaCents: 0 }),
      ],
      'revenue',
    )
    expect(ranked.find((row) => row.repId === 'a')?.attainment).toBeCloseTo(1.5, 10)
    expect(ranked.find((row) => row.repId === 'b')?.attainment).toBeNull()
  })

  it('ranks by quota attainment, not raw revenue, when asked', () => {
    const ranked = rankReps(
      [
        rep({ repId: 'big-biller', revenueCents: 1000, quotaCents: 2000 }),
        rep({ repId: 'over-quota', revenueCents: 300, quotaCents: 100 }),
      ],
      'quota',
    )
    expect(ranked[0]?.repId).toBe('over-quota')
  })

  it('computes movement against the previous window', () => {
    const previous = new Map([
      ['a', 3],
      ['b', 1],
    ])
    const ranked = rankReps(
      [
        rep({ repId: 'a', revenueCents: 300 }),
        rep({ repId: 'b', revenueCents: 200 }),
        rep({ repId: 'c', revenueCents: 100 }),
      ],
      'revenue',
      previous,
    )
    expect(ranked.find((row) => row.repId === 'a')?.rankDelta).toBe(2)
    expect(ranked.find((row) => row.repId === 'b')?.rankDelta).toBe(-1)
    // Unranked last window, so there is nothing to compare against.
    expect(ranked.find((row) => row.repId === 'c')?.rankDelta).toBeNull()
  })

  it('returns nothing for an empty roster', () => {
    expect(rankReps([], 'revenue')).toEqual([])
  })
})

describe('longestStreak', () => {
  it('counts consecutive days', () => {
    expect(longestStreak(['2026-03-01', '2026-03-02', '2026-03-03'])).toBe(3)
  })

  it('resets across a gap and keeps the longest run', () => {
    expect(
      longestStreak(['2026-03-01', '2026-03-02', '2026-03-05', '2026-03-06', '2026-03-07']),
    ).toBe(3)
  })

  it('deduplicates and sorts its input', () => {
    expect(longestStreak(['2026-03-03', '2026-03-01', '2026-03-02', '2026-03-02'])).toBe(3)
  })

  it('handles month boundaries', () => {
    expect(longestStreak(['2026-02-28', '2026-03-01'])).toBe(2)
  })

  it('is zero with no activity', () => {
    expect(longestStreak([])).toBe(0)
  })
})
