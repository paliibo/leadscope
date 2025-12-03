import { listLeads } from '@/db/queries/leads'
import { handler, invalid, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { leadListQuerySchema, parseSearchParams } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()

  const url = new URL(request.url)
  const parsed = parseSearchParams(leadListQuerySchema, url.searchParams)
  if (!parsed.success) return invalid(parsed.error)

  return ok(await listLeads(parsed.data))
})
