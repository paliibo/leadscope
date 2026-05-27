import { getTimeseries } from '@/db/queries/metrics'
import { extendSeries } from '@/lib/analytics/forecast'
import { handler, invalid, ok } from '@/lib/api/respond'
import { canViewAllReps, requireSession } from '@/lib/auth'
import { rangeSchema, trailingWindow } from '@/lib/validation/common'
import { parseSearchParams } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STEP_MS = { day: 86_400_000, week: 604_800_000, month: 2_592_000_000 } as const

export const GET = handler(async (request: Request) => {
  const session = await requireSession()

  const url = new URL(request.url)
  const parsed = parseSearchParams(rangeSchema, url.searchParams)
  if (!parsed.success) return invalid(parsed.error)

  const ownerId = canViewAllReps(session) ? parsed.data.ownerId : session.repId
  const { from, to } = trailingWindow(parsed.data.days)

  const series = await getTimeseries({
    from,
    to,
    granularity: parsed.data.granularity,
    ownerId,
  })

  const horizon = Number(url.searchParams.get('forecast') ?? 0)

  return ok({
    ...series,
    forecast:
      horizon > 0
        ? extendSeries(
            series.wonRevenue,
            Math.min(horizon, 30),
            STEP_MS[parsed.data.granularity],
          )
        : null,
  })
})
