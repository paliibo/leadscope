import { migrate } from 'drizzle-orm/libsql/migrator'
/**
 * Applies every pending SQL migration in ./drizzle.
 *
 * Migrations are generated (`pnpm db:generate`) and committed, rather than
 * pushed straight from the schema — so the exact DDL that ran in CI is the DDL
 * that ran locally.
 */
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

import { client, db } from '../src/db'
import { env } from '../src/lib/env'

async function main() {
  if (env.DATABASE_URL.startsWith('file:')) {
    const path = env.DATABASE_URL.replace(/^file:/, '')
    mkdirSync(dirname(path), { recursive: true })
  }

  if (env.DATABASE_URL.startsWith('file:')) {
    // WAL is a persistent property of the file, so it is set once here rather
    // than by every connection at boot. It lets readers run alongside a writer,
    // which is what keeps the live simulator from blocking requests.
    const [mode] = (await client.execute('PRAGMA journal_mode = WAL')).rows
    console.log(`Journal mode: ${mode?.journal_mode ?? 'unknown'}`)
  }

  console.log(`Applying migrations to ${env.DATABASE_URL}`)
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations up to date.')
}

main()
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    client.close()
  })
