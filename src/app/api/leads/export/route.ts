import { listAllLeads } from '@/db/queries/leads'
import { handler, invalid } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { leadListQuerySchema, parseSearchParams } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COLUMNS = [
  'id',
  'name',
  'email',
  'title',
  'account',
  'owner',
  'stage',
  'source',
  'value_usd',
  'score',
  'created_at',
  'closed_at',
] as const

/** RFC 4180 escaping: wrap in quotes and double any embedded quote. */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const GET = handler(async (request: Request) => {
  await requireSession()

  const parsed = parseSearchParams(
    leadListQuerySchema,
    new URL(request.url).searchParams,
  )
  if (!parsed.success) return invalid(parsed.error)

  // Export ignores pagination — the point is to get everything that matches.
  const items = await listAllLeads(parsed.data)

  const rows = items.map((lead) =>
    [
      lead.id,
      lead.name,
      lead.email,
      lead.title,
      lead.accountName,
      lead.ownerName,
      lead.stage,
      lead.source,
      (lead.valueCents / 100).toFixed(2),
      lead.score,
      lead.createdAt.toISOString(),
      lead.closedAt?.toISOString() ?? '',
    ]
      .map(csvCell)
      .join(','),
  )

  const csv = [COLUMNS.join(','), ...rows].join('\r\n')
  const stamp = new Date().toISOString().slice(0, 10)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="leadscope-leads-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
})
