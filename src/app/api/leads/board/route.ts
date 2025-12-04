import { z } from 'zod'

import { getBoard, reorderColumn } from '@/db/queries/leads'
import { handler, ok, parseBody } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { stageSchema } from '@/lib/validation/leads'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async (request: Request) => {
  await requireSession()
  const ownerId = new URL(request.url).searchParams.get('ownerId') ?? undefined
  return ok({ leads: await getBoard(ownerId) })
})

const reorderSchema = z.object({
  stage: stageSchema,
  /** Full ordered id list for the column, front to back. */
  orderedIds: z.array(z.string().min(1)).max(500),
})

/**
 * Persist a column's order after a drag. The client sends the whole column
 * rather than a delta — it is a handful of ids, and it makes the write
 * idempotent, so a retried request can't scramble the board.
 */
export const PUT = handler(async (request: Request) => {
  await requireSession()
  const { stage, orderedIds } = await parseBody(request, reorderSchema)
  await reorderColumn(stage, orderedIds)
  return ok({ ok: true, stage, count: orderedIds.length })
})
