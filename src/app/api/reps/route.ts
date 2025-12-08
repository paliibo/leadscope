import { listReps } from '@/db/queries/reps'
import { handler, ok } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => {
  await requireSession()
  return ok({ reps: await listReps() })
})
