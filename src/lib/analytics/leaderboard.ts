export interface RankableRep {
  repId: string
  name: string
  jobTitle: string
  avatarUrl: string | null
  team: string | null
  /** Deals closed-won in the window. */
  wins: number
  /** Closed-won value in cents. */
  revenueCents: number
  /** New leads worked in the window. */
  leadsWorked: number
  /** Logged touches in the window. */
  touches: number
  quotaCents: number
}

export type LeaderboardMetric = 'revenue' | 'wins' | 'leads' | 'touches' | 'quota'

export interface RankedRep extends RankableRep {
  rank: number
  /** Primary metric value the ranking used. */
  metricValue: number
  /** Share of the leader's value, in `[0, 1]` — drives the progress bars. */
  shareOfLeader: number
  /** Quota attainment in `[0, ...]`; `null` when no quota is set. */
  attainment: number | null
  /** Positive means climbed since the previous window; `null` if unranked before. */
  rankDelta: number | null
}

function metricValue(rep: RankableRep, metric: LeaderboardMetric): number {
  switch (metric) {
    case 'revenue':
      return rep.revenueCents
    case 'wins':
      return rep.wins
    case 'leads':
      return rep.leadsWorked
    case 'touches':
      return rep.touches
    case 'quota':
      return rep.quotaCents > 0 ? rep.revenueCents / rep.quotaCents : 0
  }
}

/**
 * Rank reps by a metric using competition ranking (1, 2, 2, 4) so ties don't
 * silently invent an ordering. Ties break by revenue, then by name, keeping the
 * output stable across renders.
 */
export function rankReps(
  reps: readonly RankableRep[],
  metric: LeaderboardMetric,
  previousRanks?: ReadonlyMap<string, number>,
): RankedRep[] {
  const scored = reps
    .map((rep) => ({ rep, value: metricValue(rep, metric) }))
    .sort(
      (a, b) =>
        b.value - a.value ||
        b.rep.revenueCents - a.rep.revenueCents ||
        a.rep.name.localeCompare(b.rep.name),
    )

  const leaderValue = scored[0]?.value ?? 0

  const ranked: RankedRep[] = []
  let lastValue: number | null = null
  let lastRank = 0

  scored.forEach((entry, index) => {
    const rank = lastValue !== null && entry.value === lastValue ? lastRank : index + 1
    lastValue = entry.value
    lastRank = rank

    const previous = previousRanks?.get(entry.rep.repId)

    ranked.push({
      ...entry.rep,
      rank,
      metricValue: entry.value,
      shareOfLeader: leaderValue > 0 ? entry.value / leaderValue : 0,
      attainment:
        entry.rep.quotaCents > 0 ? entry.rep.revenueCents / entry.rep.quotaCents : null,
      rankDelta: previous === undefined ? null : previous - rank,
    })
  })

  return ranked
}

/** Longest run of consecutive active days, newest-first input tolerated. */
export function longestStreak(activeDays: readonly string[]): number {
  if (activeDays.length === 0) return 0
  const sorted = [...new Set(activeDays)].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i += 1) {
    const previous = Date.parse(sorted[i - 1] as string)
    const current = Date.parse(sorted[i] as string)
    const gapDays = Math.round((current - previous) / 86_400_000)
    run = gapDays === 1 ? run + 1 : 1
    if (run > best) best = run
  }
  return best
}
