import { furthestStages } from '@/db/queries/leads'
import { buildFunnel, biggestLeak, winRate } from '@/lib/analytics/funnel'
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
  const stages = await furthestStages(from, to)
  const rows = buildFunnel(stages)

  return ok({ rows, leak: biggestLeak(rows), winRate: winRate(stages) })
})
