import { env } from '@/lib/env'

import { ensureDatabase } from './bootstrap'

/**
 * The server-start half of the bootstrap: decide whether to run it, run it,
 * and say so once. Called from `instrumentation.ts` under the Node runtime.
 */
export async function bootDatabase(): Promise<void> {
  // `next build` evaluates route modules to collect page data; it must not
  // seed a database it will never serve from.
  if (process.env.NEXT_PHASE === 'phase-production-build') return
  if (!env.DB_BOOTSTRAP) return

  const { seeded } = await ensureDatabase()
  if (seeded) {
    // eslint-disable-next-line no-console -- a one-line boot notice is the point
    console.info(
      `[db] ${env.DATABASE_URL} was empty; seeded ${seeded.leads} leads and ` +
        `${seeded.activities} activities in ${(seeded.elapsedMs / 1000).toFixed(1)}s`,
    )
  }
}
