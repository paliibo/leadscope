import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>

const KEY_LENGTH = 64
const SALT_LENGTH = 16

/**
 * Passwords are hashed with scrypt from node's stdlib — no native dependency to
 * compile, and memory-hard enough to make offline cracking expensive.
 *
 * Stored format: `scrypt$<hex salt>$<hex derived key>`.
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters')
  }
  const salt = randomBytes(SALT_LENGTH)
  const derived = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`
}

/**
 * Constant-time verification. Returns `false` for malformed hashes rather than
 * throwing, so a corrupted row can't be distinguished from a wrong password.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  const [, saltHex, keyHex] = parts
  if (!saltHex || !keyHex) return false

  let salt: Buffer
  let expected: Buffer
  try {
    salt = Buffer.from(saltHex, 'hex')
    expected = Buffer.from(keyHex, 'hex')
  } catch {
    return false
  }
  if (expected.length !== KEY_LENGTH) return false

  const derived = await scrypt(password, salt, KEY_LENGTH)
  return timingSafeEqual(derived, expected)
}
