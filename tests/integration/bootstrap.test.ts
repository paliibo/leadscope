// @vitest-environment node
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The one suite that touches a real database. It points the app at a SQLite
 * file inside a directory that does not exist yet, then imports the modules —
 * the environment is read once at load, so the order matters.
 */
const root = mkdtempSync(join(tmpdir(), 'leadscope-bootstrap-'))
const databaseDir = join(root, 'nested')
const databasePath = join(databaseDir, 'leadscope.db')
process.env.DATABASE_URL = `file:${databasePath}`
process.env.SEED = '20260101'
process.env.LIVE_SIMULATOR = '0'

const directoryExistedBeforeImport = existsSync(databaseDir)

const { client, db } = await import('@/db')
const { DEMO_CREDENTIALS, ensureDatabase, isDatabaseEmpty } =
  await import('@/db/bootstrap')
const { findRepByEmail } = await import('@/db/queries/reps')
const { leads } = await import('@/db/schema')
const { verifyPassword } = await import('@/lib/auth/password')

afterAll(() => {
  client.close()
  rmSync(root, { recursive: true, force: true })
})

describe('the database client', () => {
  it('creates the missing directory rather than failing with SQLITE_CANTOPEN', () => {
    expect(directoryExistedBeforeImport).toBe(false)
    expect(existsSync(databaseDir)).toBe(true)
  })
})

describe('ensureDatabase', () => {
  it('migrates and seeds a database that has nothing in it', async () => {
    // No tables yet: the client opened the file, nothing more.
    await expect(isDatabaseEmpty()).rejects.toThrow(/no such table/)

    const result = await ensureDatabase()

    expect(existsSync(databasePath)).toBe(true)
    expect(result.seeded).not.toBeNull()
    expect(result.seeded?.leads).toBe(2400)
    expect(result.seeded?.reps).toBeGreaterThan(0)
    expect(await isDatabaseEmpty()).toBe(false)
  }, 30_000)

  it('leaves a populated database alone on the next boot', async () => {
    const before = await db.$count(leads)

    const result = await ensureDatabase()

    expect(result.seeded).toBeNull()
    expect(await db.$count(leads)).toBe(before)
  }, 30_000)

  it('seeds a demo account whose password verifies', async () => {
    const rep = await findRepByEmail(DEMO_CREDENTIALS.email)

    expect(rep).not.toBeNull()
    expect(await verifyPassword(DEMO_CREDENTIALS.password, rep!.passwordHash)).toBe(
      true,
    )
  })
})
