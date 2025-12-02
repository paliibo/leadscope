import { handler, ok } from '@/lib/api/respond'
import { SESSION_COOKIE } from '@/lib/auth'

export const runtime = 'nodejs'

export const POST = handler(async () => {
  const response = ok({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 })
  return response
})
