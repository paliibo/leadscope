import { sql } from 'drizzle-orm'

import { db } from '@/db'
import { fail, handler, ok } from '@/lib/api/respond'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Liveness plus a real dependency check. A process that is up but cannot reach
 * its database is not healthy, and reporting it as such is how a bad deploy
 * stays in the load balancer.
 *
 * Public by design — it is in the middleware's allowlist so an orchestrator can
 * poll it without credentials, and it returns no data worth protecting.
 */
export const GET = handler(async () => {
  const startedAt = Date.now()
  try {
    await db.get(sql`select 1`)
  } catch (error) {
    console.error('[health] database unreachable', error)
    return fail(503, 'unhealthy', 'Database unreachable')
  }

  return ok({
    status: 'ok',
    database: 'reachable',
    latencyMs: Date.now() - startedAt,
    uptimeSeconds: Math.round(process.uptime()),
  })
})
