import { createClient, type Client } from '@libsql/client'
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql'

import { env } from '@/lib/env'

import * as schema from './schema'

/**
 * Next.js re-evaluates modules on every hot reload in development, which would
 * otherwise leak a new libSQL connection per edit. Stashing the client on
 * `globalThis` keeps exactly one connection alive per process.
 */
const globalForDb = globalThis as unknown as {
  leadscopeClient?: Client
  leadscopeDb?: LibSQLDatabase<typeof schema>
}

function createDbClient(): Client {
  const client = createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN || undefined,
  })

  // Local SQLite defaults to a rollback journal and a zero busy timeout, so the
  // moment two requests write at once — the live simulator and a stage change,
  // say — one fails outright with SQLITE_BUSY. WAL lets readers run alongside a
  // writer, and the timeout makes concurrent writers queue instead of erroring.
  //
  // Executed one statement at a time: batch() opens a transaction, and
  // journal_mode cannot be changed from inside one.
  if (env.DATABASE_URL.startsWith('file:')) {
    void (async () => {
      for (const pragma of [
        'PRAGMA journal_mode = WAL',
        'PRAGMA busy_timeout = 5000',
      ]) {
        try {
          await client.execute(pragma)
        } catch (error) {
          console.error(`[db] failed to apply ${pragma}`, error)
        }
      }
    })()
  }

  return client
}

export const client: Client = globalForDb.leadscopeClient ?? createDbClient()

export const db: LibSQLDatabase<typeof schema> =
  globalForDb.leadscopeDb ?? drizzle(client, { schema })

if (env.NODE_ENV !== 'production') {
  globalForDb.leadscopeClient = client
  globalForDb.leadscopeDb = db
}

export { schema }
export * from './schema'
