import { SignJWT, jwtVerify } from 'jose'

import type { RepRole } from '@/db/schema'
import { env } from '@/lib/env'

export const SESSION_COOKIE = 'leadscope_session'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

export interface SessionPayload {
  repId: string
  name: string
  email: string
  role: RepRole
  avatarUrl: string | null
}

const secret = new TextEncoder().encode(env.AUTH_SECRET)

/** Issue a signed, 7-day session token. */
export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('leadscope')
    .setAudience('leadscope-app')
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(secret)
}

/**
 * Verify a token. Any failure — expired, wrong signature, tampered claims —
 * collapses to `null`; callers treat that as "signed out".
 *
 * Uses only Web Crypto so it is safe to call from edge middleware.
 */
export async function readSessionToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'leadscope',
      audience: 'leadscope-app',
    })
    if (
      typeof payload.repId !== 'string' ||
      typeof payload.name !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.role !== 'string'
    ) {
      return null
    }
    return {
      repId: payload.repId,
      name: payload.name,
      email: payload.email,
      role: payload.role as RepRole,
      avatarUrl: (payload.avatarUrl as string | null | undefined) ?? null,
    }
  } catch {
    return null
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  maxAge: SESSION_MAX_AGE_SECONDS,
  secure: env.NODE_ENV === 'production',
} as const
