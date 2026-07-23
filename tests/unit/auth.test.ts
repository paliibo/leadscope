/**
 * @vitest-environment node
 *
 * jsdom's TextEncoder returns a Uint8Array from a different realm, which jose
 * rejects with "payload must be an instance of Uint8Array". This code only ever
 * runs in node or on the edge runtime, so test it where it actually lives.
 */
import { describe, expect, it } from 'vitest'

import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionToken, readSessionToken } from '@/lib/auth/session'

describe('password hashing', () => {
  it('verifies a correct password', async () => {
    const hash = await hashPassword('correct horse battery')
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery')
    await expect(verifyPassword('wrong horse battery', hash)).resolves.toBe(false)
  })

  it('salts, so the same password hashes differently every time', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same password'),
      hashPassword('same password'),
    ])
    expect(first).not.toBe(second)
    await expect(verifyPassword('same password', first)).resolves.toBe(true)
    await expect(verifyPassword('same password', second)).resolves.toBe(true)
  })

  it('stores an identifiable, parseable format', async () => {
    const hash = await hashPassword('another password')
    const [algorithm, salt, key] = hash.split('$')
    expect(algorithm).toBe('scrypt')
    expect(salt).toMatch(/^[0-9a-f]{32}$/)
    expect(key).toMatch(/^[0-9a-f]{128}$/)
  })

  it('refuses to hash a password that is too short', async () => {
    await expect(hashPassword('short')).rejects.toThrow(/at least 8/)
  })

  it('returns false rather than throwing on a malformed hash', async () => {
    for (const bad of [
      '',
      'garbage',
      'scrypt$only-two',
      'bcrypt$aa$bb',
      'scrypt$zz$zz',
    ]) {
      await expect(verifyPassword('anything', bad)).resolves.toBe(false)
    }
  })
})

describe('session tokens', () => {
  const payload = {
    repId: 'rep_demo',
    name: 'Alex Rivera',
    email: 'demo@leadscope.app',
    role: 'admin' as const,
    avatarUrl: null,
  }

  it('round-trips a session', async () => {
    const token = await createSessionToken(payload)
    await expect(readSessionToken(token)).resolves.toEqual(payload)
  })

  it('treats a missing token as signed out', async () => {
    await expect(readSessionToken(undefined)).resolves.toBeNull()
    await expect(readSessionToken('')).resolves.toBeNull()
  })

  it('rejects a tampered token', async () => {
    const token = await createSessionToken(payload)
    const [header, body, signature] = token.split('.')

    // Flip the last character of the payload segment.
    const mutated =
      (body as string).slice(0, -1) + ((body as string).at(-1) === 'a' ? 'b' : 'a')
    await expect(
      readSessionToken(`${header}.${mutated}.${signature}`),
    ).resolves.toBeNull()
  })

  it('rejects a token signed by someone else', async () => {
    const forged =
      'eyJhbGciOiJIUzI1NiJ9.eyJyZXBJZCI6ImF0dGFja2VyIn0.not-a-real-signature'
    await expect(readSessionToken(forged)).resolves.toBeNull()
  })

  it('rejects a well-formed token missing required claims', async () => {
    // A token whose payload lacks repId must not produce a half-built session.
    const token = await createSessionToken(payload)
    const parts = token.split('.')
    const stripped = Buffer.from(JSON.stringify({ iss: 'leadscope' })).toString(
      'base64url',
    )
    await expect(
      readSessionToken(`${parts[0]}.${stripped}.${parts[2]}`),
    ).resolves.toBeNull()
  })
})
