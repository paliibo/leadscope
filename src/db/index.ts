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
  return createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN || undefined,
  })
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
