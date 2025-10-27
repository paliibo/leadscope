import { cookies } from 'next/headers'

import { SESSION_COOKIE, readSessionToken, type SessionPayload } from './session'

export * from './session'
export * from './password'

/** Current session, or `null` when signed out. Safe to call in any server component. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies()
  return readSessionToken(store.get(SESSION_COOKIE)?.value)
}

/** Same as {@link getSession} but throws — use inside handlers already behind auth. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) throw new UnauthorizedError()
  return session
}

export class UnauthorizedError extends Error {
  readonly status = 401
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends Error {
  readonly status = 403
  constructor(message = 'Insufficient permissions') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

/** Managers and admins can see the whole team; reps only see their own book. */
export function canViewAllReps(session: SessionPayload): boolean {
  return session.role === 'admin' || session.role === 'manager'
}
