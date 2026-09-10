/**
 * Replaces the database contents with the deterministic 14-month demo dataset.
 *
 *   pnpm db:migrate && pnpm db:seed
 *
 * The server seeds an *empty* database by itself on boot; run this to reset one
 * that has drifted, or to regenerate it under a different SEED.
 */
import { client } from '../src/db'
import { DEMO_CREDENTIALS, seedDatabase } from '../src/db/bootstrap'

seedDatabase((line) => console.log(line))
  .then(() => {
    console.log(
      `\nSign in with  ${DEMO_CREDENTIALS.email} / ${DEMO_CREDENTIALS.password}\n`,
    )
  })
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    client.close()
  })
