/**
 * Runs once per server instance, before it serves its first request — under
 * `next dev`, `next start`, the Docker image and a serverless cold start alike.
 *
 * The one job here is making sure the database exists: migrations are applied
 * and an empty database is seeded with the demo dataset. That is what lets a
 * fresh clone, a container on a blank volume and a hosted demo all come up
 * with `pnpm dev`, `docker compose up` or a deploy and nothing else.
 */
export async function register(): Promise<void> {
  // This file is compiled once per runtime, and the condition is inlined as a
  // constant in each build. Keeping the import inside the block is what stops
  // the edge bundle (which only exists for the middleware) from pulling in
  // node-only modules it could never load.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootDatabase } = await import('@/db/boot')
    await bootDatabase()
  }
}
