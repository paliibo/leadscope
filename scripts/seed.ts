/**
 * Seeds the local database with a deterministic 14-month demo dataset.
 *
 *   pnpm db:push && pnpm db:seed
 *
 * The same SEED always produces the same rows, so screenshots, tests and the
 * numbers quoted in the README stay in sync with what you get locally.
 */
import { performance } from 'node:perf_hooks'

import { client, db } from '../src/db'
import {
  accounts,
  activities,
  goals,
  leads,
  reps,
  teams,
} from '../src/db/schema'
import { generateDataset } from '../src/lib/demo/generate'
import { env } from '../src/lib/env'
import { hashPassword } from '../src/lib/auth/password'

/** libSQL binds one variable per column, so keep batches well under the 999 limit. */
const BATCH_SIZE = 120

async function insertInBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE))
  }
  console.log(`  ${label.padEnd(12)} ${rows.length.toString().padStart(6)} rows`)
}

async function main() {
  const startedAt = performance.now()
  console.log(`\nSeeding Leadscope (seed=${env.SEED})\n`)

  console.log('- clearing existing rows')
  await db.delete(activities)
  await db.delete(goals)
  await db.delete(leads)
  await db.delete(accounts)
  await db.delete(reps)
  await db.delete(teams)

  console.log('- hashing demo password')
  const passwordHash = await hashPassword('demo1234')

  console.log('- generating dataset')
  const dataset = generateDataset({
    seed: env.SEED,
    now: Date.now(),
    days: 420,
    repCount: 13,
    accountCount: 140,
    leadCount: 2400,
    passwordHash,
  })

  console.log('- writing rows')
  await insertInBatches('teams', dataset.teams, (batch) =>
    db.insert(teams).values(batch),
  )
  await insertInBatches('reps', dataset.reps, (batch) => db.insert(reps).values(batch))
  await insertInBatches('accounts', dataset.accounts, (batch) =>
    db.insert(accounts).values(batch),
  )
  await insertInBatches('leads', dataset.leads, (batch) =>
    db.insert(leads).values(batch),
  )
  await insertInBatches('activities', dataset.activities, (batch) =>
    db.insert(activities).values(batch),
  )
  await insertInBatches('goals', dataset.goals, (batch) =>
    db.insert(goals).values(batch),
  )

  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(2)
  console.log(`\nDone in ${elapsed}s.`)
  console.log('Sign in with  demo@leadscope.app / demo1234\n')
}

main()
  .catch((error) => {
    console.error('\nSeed failed:', error)
    process.exitCode = 1
  })
  .finally(() => {
    client.close()
  })
