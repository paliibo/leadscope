import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
  or,
  sql,
} from 'drizzle-orm'

import { db } from '@/db'
import {
  accounts,
  activities,
  leads,
  reps,
  type Lead,
  type LeadStage,
} from '@/db/schema'
import type { LeadListQuery, UpdateLeadInput } from '@/lib/validation/leads'

export interface LeadWithRelations extends Lead {
  accountName: string
  accountDomain: string
  accountIndustry: string
  accountSizeBucket: string
  ownerName: string
  ownerAvatarUrl: string | null
}

const selection = {
  id: leads.id,
  name: leads.name,
  email: leads.email,
  title: leads.title,
  accountId: leads.accountId,
  ownerId: leads.ownerId,
  stage: leads.stage,
  source: leads.source,
  valueCents: leads.valueCents,
  score: leads.score,
  boardRank: leads.boardRank,
  lostReason: leads.lostReason,
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
  closedAt: leads.closedAt,
  accountName: accounts.name,
  accountDomain: accounts.domain,
  accountIndustry: accounts.industry,
  accountSizeBucket: accounts.sizeBucket,
  ownerName: reps.name,
  ownerAvatarUrl: reps.avatarUrl,
}

function buildFilters(query: Partial<LeadListQuery>) {
  const filters = []

  if (query.q) {
    const term = `%${query.q.toLowerCase()}%`
    filters.push(
      or(
        like(sql`lower(${leads.name})`, term),
        like(sql`lower(${leads.email})`, term),
        like(sql`lower(${accounts.name})`, term),
        like(sql`lower(${leads.title})`, term),
      ),
    )
  }
  if (query.stage?.length) filters.push(inArray(leads.stage, query.stage))
  if (query.source?.length) filters.push(inArray(leads.source, query.source))
  if (query.ownerId) filters.push(eq(leads.ownerId, query.ownerId))
  if (query.minValue !== undefined) filters.push(gte(leads.valueCents, query.minValue))
  if (query.maxValue !== undefined) filters.push(lte(leads.valueCents, query.maxValue))

  return filters.length > 0 ? and(...filters) : undefined
}

const sortColumns = {
  createdAt: leads.createdAt,
  updatedAt: leads.updatedAt,
  value: leads.valueCents,
  score: leads.score,
  name: leads.name,
} as const

export interface LeadPage {
  items: LeadWithRelations[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/** Paginated, filtered, sorted lead list. One count query, one page query. */
export async function listLeads(query: LeadListQuery): Promise<LeadPage> {
  const where = buildFilters(query)
  const orderColumn = sortColumns[query.sort]
  const direction = query.dir === 'asc' ? asc : desc

  const [totalRow] = await db
    .select({ value: count() })
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .where(where)

  const total = totalRow?.value ?? 0

  const items = await db
    .select(selection)
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .innerJoin(reps, eq(leads.ownerId, reps.id))
    .where(where)
    .orderBy(direction(orderColumn), desc(leads.id))
    .limit(query.pageSize)
    .offset((query.page - 1) * query.pageSize)

  return {
    items: items as LeadWithRelations[],
    total,
    page: query.page,
    pageSize: query.pageSize,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
  }
}

/**
 * Every lead matching a filter, ignoring pagination. Used by the CSV export.
 * Hard-capped so a pathological filter can't try to stream the whole table into
 * memory at once.
 */
export async function listAllLeads(
  query: Omit<LeadListQuery, 'page' | 'pageSize'>,
  cap = 5000,
): Promise<LeadWithRelations[]> {
  const orderColumn = sortColumns[query.sort]
  const direction = query.dir === 'asc' ? asc : desc

  const rows = await db
    .select(selection)
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .innerJoin(reps, eq(leads.ownerId, reps.id))
    .where(buildFilters(query))
    .orderBy(direction(orderColumn), desc(leads.id))
    .limit(cap)

  return rows as LeadWithRelations[]
}

export async function getLead(id: string): Promise<LeadWithRelations | null> {
  const [row] = await db
    .select(selection)
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .innerJoin(reps, eq(leads.ownerId, reps.id))
    .where(eq(leads.id, id))
    .limit(1)

  return (row as LeadWithRelations | undefined) ?? null
}

/** Every open lead, grouped by stage and ordered for the kanban board. */
export async function getBoard(ownerId?: string) {
  const filters = [
    inArray(leads.stage, ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
  ]
  if (ownerId) filters.push(eq(leads.ownerId, ownerId))

  const rows = await db
    .select(selection)
    .from(leads)
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .innerJoin(reps, eq(leads.ownerId, reps.id))
    .where(and(...filters))
    .orderBy(asc(leads.boardRank), desc(leads.updatedAt))

  return rows as LeadWithRelations[]
}

/**
 * Apply a partial update. `closedAt` is derived from the stage rather than
 * accepted from the client so it can never drift out of sync with `stage`.
 */
export async function updateLead(
  id: string,
  input: UpdateLeadInput,
  now = Date.now(),
): Promise<LeadWithRelations | null> {
  const patch: Partial<Lead> = { updatedAt: new Date(now) }

  if (input.stage !== undefined) {
    patch.stage = input.stage
    patch.closedAt =
      input.stage === 'won' || input.stage === 'lost' ? new Date(now) : null
    if (input.stage !== 'lost') patch.lostReason = null
  }
  if (input.ownerId !== undefined) patch.ownerId = input.ownerId
  if (input.valueCents !== undefined) patch.valueCents = input.valueCents
  if (input.boardRank !== undefined) patch.boardRank = input.boardRank
  if (input.lostReason !== undefined) patch.lostReason = input.lostReason

  const updated = await db
    .update(leads)
    .set(patch)
    .where(eq(leads.id, id))
    .returning({ id: leads.id })

  if (updated.length === 0) return null
  return getLead(id)
}

/** Rewrite board ranks for one column in a single transaction. */
export async function reorderColumn(
  stage: LeadStage,
  orderedIds: readonly string[],
): Promise<void> {
  if (orderedIds.length === 0) return
  await db.transaction(async (tx) => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await tx
        .update(leads)
        .set({ stage, boardRank: index, updatedAt: new Date() })
        .where(eq(leads.id, orderedIds[index] as string))
    }
  })
}

/** Furthest stage each lead reached, used by the conversion funnel. */
export async function furthestStages(from: Date, to: Date): Promise<LeadStage[]> {
  const rows = await db
    .select({
      id: leads.id,
      stage: leads.stage,
      deepest: sql<string | null>`max(${activities.toStage})`,
    })
    .from(leads)
    .leftJoin(activities, eq(activities.leadId, leads.id))
    .where(and(gte(leads.createdAt, from), lte(leads.createdAt, to)))
    .groupBy(leads.id)

  return rows.map((row) => {
    if (row.stage !== 'lost') return row.stage
    // A lost lead still cleared whatever stage it died in; recover it from the log.
    const recovered = row.deepest as LeadStage | null
    return recovered && recovered !== 'lost' ? recovered : 'new'
  })
}

export async function countByStage(): Promise<Record<string, number>> {
  const rows = await db
    .select({ stage: leads.stage, value: count() })
    .from(leads)
    .groupBy(leads.stage)

  return Object.fromEntries(rows.map((row) => [row.stage, row.value]))
}
