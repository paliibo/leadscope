import { count } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { resolve } from 'node:path'

import { hashPassword } from '@/lib/auth/password'
import { generateDataset } from '@/lib/demo/generate'
import { env } from '@/lib/env'

import { client, db } from './index'
import { accounts, activities, goals, leads, reps, teams } from './schema'

/**
 * Everything needed to take a database from "does not exist" to "serving the
 * demo", shared by the CLI scripts and the server's own boot hook.
 *
 * It is here, in the application, rather than left to whoever deploys it: a
 * fresh clone, a container on an empty volume and a serverless cold start all
 * begin with no tables, and each of them should end up in the same place
 * without a runbook.
 */

export type Log = (line: string) => void

const silent: Log = () => {}

/**
 * Resolved against the working directory, not this file. The traced standalone
 * and serverless bundles keep `drizzle/` at the project root, next to the code.
 */
const MIGRATIONS_FOLDER = resolve(process.cwd(), 'drizzle')

/** libSQL binds one variable per column, so keep batches well under the 999 limit. */
const BATCH_SIZE = 120

export const DEMO_CREDENTIALS = {
  email: 'demo@leadscope.app',
  password: 'demo1234',
} as const

export interface SeedSummary {
  teams: number
  reps: number
  accounts: number
  leads: number
  activities: number
  goals: number
  elapsedMs: number
}

export interface BootstrapResult {
  /** `null` when the database already had data and was left alone. */
  seeded: SeedSummary | null
}

/** Applies every pending SQL migration in ./drizzle. */
export async function migrateDatabase(log: Log = silent): Promise<void> {
  if (env.DATABASE_URL.startsWith('file:')) {
    // WAL is a persistent property of the file, so it is set once here rather
    // than by every connection at boot. It lets readers run alongside a writer,
    // which is what keeps the live simulator from blocking requests.
    const [mode] = (await client.execute('PRAGMA journal_mode = WAL')).rows
    log(`Journal mode: ${mode?.journal_mode ?? 'unknown'}`)
  }

  log(`Applying migrations to ${env.DATABASE_URL}`)
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER })
  log('Migrations up to date.')
}

/** True when nobody could sign in — the one table every other row hangs off. */
export async function isDatabaseEmpty(): Promise<boolean> {
  const [row] = await db.select({ n: count() }).from(reps)
  return (row?.n ?? 0) === 0
}

async function insertInBatches<T>(
  label: string,
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
  log: Log,
): Promise<number> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    await insert(rows.slice(i, i + BATCH_SIZE))
  }
  log(`  ${label.padEnd(12)} ${rows.length.toString().padStart(6)} rows`)
  return rows.length
}

/**
 * Replaces whatever is in the database with the deterministic 14-month demo
 * dataset. The same SEED always produces the same rows, so screenshots, tests
 * and the numbers quoted in the README stay in sync with what you get locally.
 */
export async function seedDatabase(log: Log = silent): Promise<SeedSummary> {
  const startedAt = performance.now()
  log(`Seeding Leadscope (seed=${env.SEED})`)

  log('- clearing existing rows')
  await db.delete(activities)
  await db.delete(goals)
  await db.delete(leads)
  await db.delete(accounts)
  await db.delete(reps)
  await db.delete(teams)

  log('- hashing demo password')
  const passwordHash = await hashPassword(DEMO_CREDENTIALS.password)

  log('- generating dataset')
  const dataset = generateDataset({
    seed: env.SEED,
    now: Date.now(),
    days: 420,
    repCount: 13,
    accountCount: 140,
    leadCount: 2400,
    passwordHash,
  })

  log('- writing rows')
  const summary: SeedSummary = {
    teams: await insertInBatches(
      'teams',
      dataset.teams,
      (batch) => db.insert(teams).values(batch),
      log,
    ),
    reps: await insertInBatches(
      'reps',
      dataset.reps,
      (batch) => db.insert(reps).values(batch),
      log,
    ),
    accounts: await insertInBatches(
      'accounts',
      dataset.accounts,
      (batch) => db.insert(accounts).values(batch),
      log,
    ),
    leads: await insertInBatches(
      'leads',
      dataset.leads,
      (batch) => db.insert(leads).values(batch),
      log,
    ),
    activities: await insertInBatches(
      'activities',
      dataset.activities,
      (batch) => db.insert(activities).values(batch),
      log,
    ),
    goals: await insertInBatches(
      'goals',
      dataset.goals,
      (batch) => db.insert(goals).values(batch),
      log,
    ),
    elapsedMs: 0,
  }
  summary.elapsedMs = performance.now() - startedAt

  log(`Done in ${(summary.elapsedMs / 1000).toFixed(2)}s.`)
  return summary
}

/**
 * Brings the database to a usable state and returns what it had to do: pending
 * migrations are applied, and a database with nobody in it is seeded.
 *
 * Idempotent and cheap — a no-op boot costs one query — so it is safe to run
 * on every start, which is exactly what `instrumentation.ts` does.
 */
export async function ensureDatabase(log: Log = silent): Promise<BootstrapResult> {
  await migrateDatabase(log)
  if (!(await isDatabaseEmpty())) return { seeded: null }
  return { seeded: await seedDatabase(log) }
}
