import { and, desc, eq, gte, lte } from 'drizzle-orm'

import { db } from '@/db'
import { accounts, activities, leads, reps, type NewActivity } from '@/db/schema'
import type { StageTransition } from '@/lib/analytics/velocity'

export interface ActivityFeedItem {
  id: string
  type: string
  summary: string
  createdAt: number
  valueCents: number | null
  fromStage: string | null
  toStage: string | null
  leadId: string
  leadName: string
  accountName: string
  repId: string
  repName: string
  repAvatarUrl: string | null
}

/** Newest-first activity feed, optionally scoped to one rep or one lead. */
export async function getActivityFeed(options: {
  limit?: number
  repId?: string
  leadId?: string
} = {}): Promise<ActivityFeedItem[]> {
  const filters = []
  if (options.repId) filters.push(eq(activities.repId, options.repId))
  if (options.leadId) filters.push(eq(activities.leadId, options.leadId))

  const rows = await db
    .select({
      id: activities.id,
      type: activities.type,
      summary: activities.summary,
      createdAt: activities.createdAt,
      valueCents: activities.valueCents,
      fromStage: activities.fromStage,
      toStage: activities.toStage,
      leadId: leads.id,
      leadName: leads.name,
      accountName: accounts.name,
      repId: reps.id,
      repName: reps.name,
      repAvatarUrl: reps.avatarUrl,
    })
    .from(activities)
    .innerJoin(leads, eq(activities.leadId, leads.id))
    .innerJoin(accounts, eq(leads.accountId, accounts.id))
    .innerJoin(reps, eq(activities.repId, reps.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(activities.createdAt))
    .limit(options.limit ?? 25)

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.getTime() }))
}

export async function recordActivity(activity: NewActivity): Promise<void> {
  await db.insert(activities).values(activity)
}

/** Stage transitions in a window, for the velocity report. */
export async function getStageTransitions(
  from: Date,
  to: Date,
): Promise<StageTransition[]> {
  const rows = await db
    .select({
      leadId: activities.leadId,
      fromStage: activities.fromStage,
      toStage: activities.toStage,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .where(
      and(
        eq(activities.type, 'stage_changed'),
        gte(activities.createdAt, from),
        lte(activities.createdAt, to),
      ),
    )

  return rows.map((row) => ({ ...row, createdAt: row.createdAt.getTime() }))
}

/** Distinct ISO days on which a rep logged anything — powers the streak badge. */
export async function getActiveDays(repId: string, from: Date): Promise<string[]> {
  const rows = await db
    .select({ createdAt: activities.createdAt })
    .from(activities)
    .where(and(eq(activities.repId, repId), gte(activities.createdAt, from)))

  return [
    ...new Set(rows.map((row) => row.createdAt.toISOString().slice(0, 10))),
  ].sort()
}
