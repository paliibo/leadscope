import { NextResponse, type NextRequest } from 'next/server'

import { SESSION_COOKIE, readSessionToken } from '@/lib/auth/session'

/**
 * Gate every page and API route behind a session, except the login screen and
 * the endpoints it needs.
 *
 * Runs on the edge runtime, so it only uses jose (Web Crypto) — no node APIs.
 */
const PUBLIC_PATHS = new Set([
  '/login',
  '/api/auth/login',
  '/api/auth/session',
  // Orchestrators poll this without credentials.
  '/api/health',
])

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next()

  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value)
  if (session) return NextResponse.next()

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: { code: 'unauthorized', message: 'Authentication required' } },
      { status: 401 },
    )
  }

  const login = request.nextUrl.clone()
  login.pathname = '/login'
  // Preserve where they were headed so login can send them back.
  login.searchParams.set('next', pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    /*
     * Everything except Next's own assets, the favicon and public files.
     */
    '/((?!_next/static|_next/image|favicon.ico|fonts|images|.*\\.svg$).*)',
  ],
}
