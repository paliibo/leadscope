import { handler, ok } from '@/lib/api/respond'
import { getSession } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export const GET = handler(async () => ok({ session: await getSession() }))
