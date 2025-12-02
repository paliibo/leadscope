import type { NextResponse } from 'next/server'

import { findRepByEmail } from '@/db/queries/reps'
import { fail, handler, ok, parseBody } from '@/lib/api/respond'
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from '@/lib/auth'
import { loginSchema } from '@/lib/validation/common'

export const runtime = 'nodejs'

export const POST = handler(async (request: Request) => {
  const { email, password } = await parseBody(request, loginSchema)

  const rep = await findRepByEmail(email)

  // Run a comparison even when the account is missing, so response time doesn't
  // reveal which addresses exist.
  const valid = rep
    ? await verifyPassword(password, rep.passwordHash)
    : await verifyPassword(password, 'scrypt$00$00')

  if (!rep || !valid) {
    return fail(401, 'invalid_credentials', 'Email or password is incorrect')
  }

  const token = await createSessionToken({
    repId: rep.id,
    name: rep.name,
    email: rep.email,
    role: rep.role,
    avatarUrl: rep.avatarUrl,
  })

  const response: NextResponse = ok({
    rep: {
      id: rep.id,
      name: rep.name,
      email: rep.email,
      role: rep.role,
      avatarUrl: rep.avatarUrl,
    },
  })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions)
  return response
})
