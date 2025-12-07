import { and, gte, inArray, lte } from 'drizzle-orm'

import { db } from '@/db'
import { leads } from '@/db/schema'
import { getStageTransitions } from '@/db/queries/activities'
import { salesCycle, stageDwellTimes, stalledLeads } from '@/lib/analytics/velocity'
import { handler, invalid, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { parseSearchParams } from '@/lib/validation/leads'
import { rangeSchema, trailingWindow } from '@/lib/validation/common'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()

  const parsed = parseSearchParams(rangeSchema, new URL(request.url).searchParams)
  if (!parsed.success) return invalid(parsed.error)

  const { from, to } = trailingWindow(parsed.data.days)

  const [transitions, closed, open] = await Promise.all([
    getStageTransitions(from, to),
    db
      .select({
        createdAt: leads.createdAt,
        closedAt: leads.closedAt,
        stage: leads.stage,
      })
      .from(leads)
      .where(and(gte(leads.closedAt, from), lte(leads.closedAt, to))),
    db
      .select({
        id: leads.id,
        stage: leads.stage,
        updatedAt: leads.updatedAt,
        valueCents: leads.valueCents,
        name: leads.name,
      })
      .from(leads)
      .where(
        inArray(leads.stage, ['new', 'contacted', 'qualified', 'proposal', 'negotiation']),
      ),
  ])

  const now = Date.now()
  const stalled = stalledLeads(
    open.map((lead) => ({ ...lead, updatedAt: lead.updatedAt.getTime() })),
    now,
  )
  const namesById = new Map(open.map((lead) => [lead.id, lead.name]))

  return ok({
    dwell: stageDwellTimes(transitions),
    cycle: salesCycle(
      closed.map((lead) => ({
        createdAt: lead.createdAt.getTime(),
        closedAt: lead.closedAt?.getTime() ?? null,
        stage: lead.stage,
      })),
    ),
    stalled: stalled.slice(0, 10).map((lead) => ({
      ...lead,
      name: namesById.get(lead.id) ?? 'Unknown',
    })),
    stalledTotal: stalled.length,
    stalledValueCents: stalled.reduce((sum, lead) => sum + lead.valueCents, 0),
  })
})
