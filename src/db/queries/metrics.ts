import { and, avg, count, eq, gte, inArray, lt, lte, sum } from 'drizzle-orm'

import { db } from '@/db'
import { accounts, activities, leads, type LeadStage } from '@/db/schema'
import { toSeries, type Granularity, type SeriesPoint } from '@/lib/analytics/series'
import { percentChange } from '@/lib/utils'

const OPEN: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation']

export interface MetricDelta {
  current: number
  previous: number
  /** Percent change, or `null` when there is no baseline. */
  change: number | null
}

export interface OverviewMetrics {
  pipelineCents: number
  openLeads: number
  wonRevenue: MetricDelta
  newLeads: MetricDelta
  wonDeals: MetricDelta
  touches: MetricDelta
  winRate: number
  averageDealCents: number
}

function delta(current: number, previous: number): MetricDelta {
  return { current, previous, change: percentChange(current, previous) }
}

async function sumWonBetween(from: Date, to: Date, ownerId?: string) {
  const filters = [
    eq(leads.stage, 'won'),
    gte(leads.closedAt, from),
    lt(leads.closedAt, to),
  ]
  if (ownerId) filters.push(eq(leads.ownerId, ownerId))

  const [row] = await db
    .select({ total: sum(leads.valueCents), deals: count() })
    .from(leads)
    .where(and(...filters))

  return { cents: Number(row?.total ?? 0), deals: row?.deals ?? 0 }
}

async function countCreatedBetween(from: Date, to: Date, ownerId?: string) {
  const filters = [gte(leads.createdAt, from), lt(leads.createdAt, to)]
  if (ownerId) filters.push(eq(leads.ownerId, ownerId))

  const [row] = await db
    .select({ value: count() })
    .from(leads)
    .where(and(...filters))
  return row?.value ?? 0
}

async function countTouchesBetween(from: Date, to: Date, ownerId?: string) {
  const filters = [gte(activities.createdAt, from), lt(activities.createdAt, to)]
  if (ownerId) filters.push(eq(activities.repId, ownerId))

  const [row] = await db
    .select({ value: count() })
    .from(activities)
    .where(and(...filters))
  return row?.value ?? 0
}

/** Headline KPIs for the overview page, each with a period-over-period delta. */
export async function getOverviewMetrics(options: {
  from: Date
  to: Date
  previousFrom: Date
  previousTo: Date
  ownerId?: string
}): Promise<OverviewMetrics> {
  const { from, to, previousFrom, previousTo, ownerId } = options

  const openFilters = [inArray(leads.stage, OPEN)]
  if (ownerId) openFilters.push(eq(leads.ownerId, ownerId))

  const closedFilters = [
    inArray(leads.stage, ['won', 'lost'] as LeadStage[]),
    gte(leads.closedAt, from),
    lte(leads.closedAt, to),
  ]
  if (ownerId) closedFilters.push(eq(leads.ownerId, ownerId))

  const [
    openRow,
    currentWon,
    previousWon,
    currentLeads,
    previousLeads,
    currentTouches,
    previousTouches,
    closedRows,
    avgRow,
  ] = await Promise.all([
    db
      .select({ total: sum(leads.valueCents), value: count() })
      .from(leads)
      .where(and(...openFilters)),
    sumWonBetween(from, to, ownerId),
    sumWonBetween(previousFrom, previousTo, ownerId),
    countCreatedBetween(from, to, ownerId),
    countCreatedBetween(previousFrom, previousTo, ownerId),
    countTouchesBetween(from, to, ownerId),
    countTouchesBetween(previousFrom, previousTo, ownerId),
    db
      .select({ stage: leads.stage, value: count() })
      .from(leads)
      .where(and(...closedFilters))
      .groupBy(leads.stage),
    db
      .select({ value: avg(leads.valueCents) })
      .from(leads)
      .where(
        and(eq(leads.stage, 'won'), gte(leads.closedAt, from), lte(leads.closedAt, to)),
      ),
  ])

  const won = closedRows.find((row) => row.stage === 'won')?.value ?? 0
  const lost = closedRows.find((row) => row.stage === 'lost')?.value ?? 0

  return {
    pipelineCents: Number(openRow[0]?.total ?? 0),
    openLeads: openRow[0]?.value ?? 0,
    wonRevenue: delta(currentWon.cents, previousWon.cents),
    wonDeals: delta(currentWon.deals, previousWon.deals),
    newLeads: delta(currentLeads, previousLeads),
    touches: delta(currentTouches, previousTouches),
    winRate: won + lost === 0 ? 0 : won / (won + lost),
    averageDealCents: Math.round(Number(avgRow[0]?.value ?? 0)),
  }
}

export interface TimeseriesResult {
  newLeads: SeriesPoint[]
  wonRevenue: SeriesPoint[]
  touches: SeriesPoint[]
}

/** Daily/weekly/monthly series backing the overview chart. */
export async function getTimeseries(options: {
  from: Date
  to: Date
  granularity: Granularity
  ownerId?: string
}): Promise<TimeseriesResult> {
  const { from, to, granularity, ownerId } = options

  const createdFilters = [gte(leads.createdAt, from), lte(leads.createdAt, to)]
  const wonFilters = [
    eq(leads.stage, 'won'),
    gte(leads.closedAt, from),
    lte(leads.closedAt, to),
  ]
  const touchFilters = [gte(activities.createdAt, from), lte(activities.createdAt, to)]

  if (ownerId) {
    createdFilters.push(eq(leads.ownerId, ownerId))
    wonFilters.push(eq(leads.ownerId, ownerId))
    touchFilters.push(eq(activities.repId, ownerId))
  }

  const [created, won, touched] = await Promise.all([
    db
      .select({ createdAt: leads.createdAt })
      .from(leads)
      .where(and(...createdFilters)),
    db
      .select({ closedAt: leads.closedAt, valueCents: leads.valueCents })
      .from(leads)
      .where(and(...wonFilters)),
    db
      .select({ createdAt: activities.createdAt })
      .from(activities)
      .where(and(...touchFilters)),
  ])

  return {
    newLeads: toSeries(created, {
      from,
      to,
      granularity,
      timestampOf: (row) => row.createdAt.getTime(),
    }),
    wonRevenue: toSeries(won, {
      from,
      to,
      granularity,
      timestampOf: (row) => (row.closedAt as Date).getTime(),
      weightOf: (row) => row.valueCents,
    }),
    touches: toSeries(touched, {
      from,
      to,
      granularity,
      timestampOf: (row) => row.createdAt.getTime(),
    }),
  }
}

export interface SourceBreakdownRow {
  source: string
  leads: number
  wonCents: number
  winRate: number
}

/** Which acquisition channels actually convert, not just which are loudest. */
export async function getSourceBreakdown(
  from: Date,
  to: Date,
): Promise<SourceBreakdownRow[]> {
  const rows = await db
    .select({ source: leads.source, stage: leads.stage, valueCents: leads.valueCents })
    .from(leads)
    .where(and(gte(leads.createdAt, from), lte(leads.createdAt, to)))

  const totals = new Map<
    string,
    { leads: number; won: number; lost: number; cents: number }
  >()

  for (const row of rows) {
    const entry = totals.get(row.source) ?? { leads: 0, won: 0, lost: 0, cents: 0 }
    entry.leads += 1
    if (row.stage === 'won') {
      entry.won += 1
      entry.cents += row.valueCents
    } else if (row.stage === 'lost') {
      entry.lost += 1
    }
    totals.set(row.source, entry)
  }

  return [...totals.entries()]
    .map(([source, entry]) => ({
      source,
      leads: entry.leads,
      wonCents: entry.cents,
      winRate: entry.won + entry.lost === 0 ? 0 : entry.won / (entry.won + entry.lost),
    }))
    .sort((a, b) => b.wonCents - a.wonCents)
}

export interface IndustryRow {
  industry: string
  leads: number
  pipelineCents: number
}

export async function getIndustryBreakdown(limit = 6): Promise<IndustryRow[]> {
  const rows = await db
    .select({
      industry: accounts.industry,
      leads: count(),
      pipelineCents: sum(leads.valueCents),
    })
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .where(inArray(leads.stage, OPEN))
    .groupBy(accounts.industry)

  return rows
    .map((row) => ({
      industry: row.industry,
      leads: row.leads,
      pipelineCents: Number(row.pipelineCents ?? 0),
    }))
    .sort((a, b) => b.pipelineCents - a.pipelineCents)
    .slice(0, limit)
}
