import { getOverviewMetrics } from '@/db/queries/metrics'
import { handler, invalid, ok } from '@/lib/api/respond'
import { canViewAllReps, requireSession } from '@/lib/auth'
import { parseSearchParams } from '@/lib/validation/leads'
import { rangeSchema, trailingWindow } from '@/lib/validation/common'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  const session = await requireSession()

  const parsed = parseSearchParams(rangeSchema, new URL(request.url).searchParams)
  if (!parsed.success) return invalid(parsed.error)

  // Reps only ever see their own book; managers and admins can scope to anyone.
  const ownerId = canViewAllReps(session) ? parsed.data.ownerId : session.repId

  const window = trailingWindow(parsed.data.days)
  return ok(await getOverviewMetrics({ ...window, ownerId }))
})
