import { getLeaderboard } from '@/db/queries/leaderboard'
import { handler, invalid, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { leaderboardQuerySchema, trailingWindow } from '@/lib/validation/common'
import { parseSearchParams } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()

  const parsed = parseSearchParams(
    leaderboardQuerySchema,
    new URL(request.url).searchParams,
  )
  if (!parsed.success) return invalid(parsed.error)

  const window = trailingWindow(parsed.data.days)

  return ok(
    await getLeaderboard({
      ...window,
      metric: parsed.data.metric,
      limit: parsed.data.limit,
      q: parsed.data.q,
    }),
  )
})
