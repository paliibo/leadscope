/**
 * Applies every pending SQL migration in ./drizzle.
 *
 * Migrations are generated (`pnpm db:generate`) and committed, rather than
 * pushed straight from the schema — so the exact DDL that ran in CI is the DDL
 * that ran locally. The server does the same thing on boot; this script exists
 * for the cases where you want it done explicitly, and want to see it happen.
 */
import { client } from '../src/db'
import { migrateDatabase } from '../src/db/bootstrap'

migrateDatabase(console.log)
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    client.close()
  })
