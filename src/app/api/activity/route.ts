import { getActivityFeed } from '@/db/queries/activities'
import { handler, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()

  const params = new URL(request.url).searchParams
  const limit = Math.min(Number(params.get('limit') ?? 25) || 25, 100)

  return ok({
    items: await getActivityFeed({
      limit,
      repId: params.get('repId') ?? undefined,
      leadId: params.get('leadId') ?? undefined,
    }),
  })
})
