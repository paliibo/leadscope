import { getIndustryBreakdown, getSourceBreakdown } from '@/db/queries/metrics'
import { handler, invalid, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { rangeSchema, trailingWindow } from '@/lib/validation/common'
import { parseSearchParams } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()

  const parsed = parseSearchParams(rangeSchema, new URL(request.url).searchParams)
  if (!parsed.success) return invalid(parsed.error)

  const { from, to } = trailingWindow(parsed.data.days)
  const [sources, industries] = await Promise.all([
    getSourceBreakdown(from, to),
    getIndustryBreakdown(),
  ])

  return ok({ sources, industries })
})
