import { and, count, eq, gte, lt, lte, sum } from 'drizzle-orm'

import { db } from '@/db'
import { activities, goals, leads, reps, teams } from '@/db/schema'
import {
  rankReps,
  type LeaderboardMetric,
  type RankableRep,
  type RankedRep,
} from '@/lib/analytics/leaderboard'

async function aggregate(from: Date, to: Date): Promise<Map<string, RankableRep>> {
  const [roster, wonRows, leadRows, touchRows] = await Promise.all([
    db
      .select({
        id: reps.id,
        name: reps.name,
        jobTitle: reps.jobTitle,
        avatarUrl: reps.avatarUrl,
        quotaCents: reps.quotaCents,
        team: teams.name,
      })
      .from(reps)
      .leftJoin(teams, eq(reps.teamId, teams.id))
      .where(eq(reps.active, true)),
    db
      .select({
        ownerId: leads.ownerId,
        deals: count(),
        revenue: sum(leads.valueCents),
      })
      .from(leads)
      .where(
        and(eq(leads.stage, 'won'), gte(leads.closedAt, from), lt(leads.closedAt, to)),
      )
      .groupBy(leads.ownerId),
    db
      .select({ ownerId: leads.ownerId, worked: count() })
      .from(leads)
      .where(and(gte(leads.createdAt, from), lt(leads.createdAt, to)))
      .groupBy(leads.ownerId),
    db
      .select({ repId: activities.repId, touches: count() })
      .from(activities)
      .where(and(gte(activities.createdAt, from), lt(activities.createdAt, to)))
      .groupBy(activities.repId),
  ])

  const byId = new Map<string, RankableRep>()

  for (const rep of roster) {
    byId.set(rep.id, {
      repId: rep.id,
      name: rep.name,
      jobTitle: rep.jobTitle,
      avatarUrl: rep.avatarUrl,
      team: rep.team,
      wins: 0,
      revenueCents: 0,
      leadsWorked: 0,
      touches: 0,
      quotaCents: rep.quotaCents,
    })
  }

  for (const row of wonRows) {
    const rep = byId.get(row.ownerId)
    if (!rep) continue
    rep.wins = row.deals
    rep.revenueCents = Number(row.revenue ?? 0)
  }
  for (const row of leadRows) {
    const rep = byId.get(row.ownerId)
    if (rep) rep.leadsWorked = row.worked
  }
  for (const row of touchRows) {
    const rep = byId.get(row.repId)
    if (rep) rep.touches = row.touches
  }

  return byId
}

export interface LeaderboardResult {
  metric: LeaderboardMetric
  rows: RankedRep[]
  windowDays: number
}

/**
 * Rank the team over a trailing window, including movement against the window
 * immediately before it — the "+2 / -1" chips next to each row.
 */
export async function getLeaderboard(options: {
  from: Date
  to: Date
  previousFrom: Date
  previousTo: Date
  metric: LeaderboardMetric
  limit: number
  q?: string
}): Promise<LeaderboardResult> {
  const [current, previous] = await Promise.all([
    aggregate(options.from, options.to),
    aggregate(options.previousFrom, options.previousTo),
  ])

  const previousRanks = new Map(
    rankReps([...previous.values()], options.metric).map((rep) => [
      rep.repId,
      rep.rank,
    ]),
  )

  let rows = rankReps([...current.values()], options.metric, previousRanks)

  if (options.q) {
    const term = options.q.toLowerCase()
    rows = rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        row.jobTitle.toLowerCase().includes(term) ||
        (row.team?.toLowerCase().includes(term) ?? false),
    )
  }

  return {
    metric: options.metric,
    rows: rows.slice(0, options.limit),
    windowDays: Math.round(
      (options.to.getTime() - options.from.getTime()) / 86_400_000,
    ),
  }
}

export interface QuotaProgress {
  repId: string
  name: string
  period: string
  targetCents: number
  achievedCents: number
  attainment: number
}

/** Month-to-date quota attainment for every rep with a goal set. */
export async function getQuotaProgress(period: string): Promise<QuotaProgress[]> {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return []

  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 1))

  const [targets, achieved] = await Promise.all([
    db
      .select({
        repId: goals.repId,
        targetCents: goals.targetCents,
        name: reps.name,
      })
      .from(goals)
      .innerJoin(reps, eq(goals.repId, reps.id))
      .where(eq(goals.period, period)),
    db
      .select({ ownerId: leads.ownerId, revenue: sum(leads.valueCents) })
      .from(leads)
      .where(
        and(
          eq(leads.stage, 'won'),
          gte(leads.closedAt, start),
          lte(leads.closedAt, end),
        ),
      )
      .groupBy(leads.ownerId),
  ])

  const revenueById = new Map(
    achieved.map((row) => [row.ownerId, Number(row.revenue ?? 0)]),
  )

  return targets
    .map((target) => {
      const achievedCents = revenueById.get(target.repId) ?? 0
      return {
        repId: target.repId,
        name: target.name,
        period,
        targetCents: target.targetCents,
        achievedCents,
        attainment: target.targetCents > 0 ? achievedCents / target.targetCents : 0,
      }
    })
    .sort((a, b) => b.attainment - a.attainment)
}
