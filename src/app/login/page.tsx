import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

import { LoginForm } from './login-form'

export const metadata = { title: 'Sign in' }
export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  if (await getSession()) redirect('/')

  const { next } = await searchParams

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-canvas px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-mesh"
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-brand text-lg font-semibold text-white shadow-glow">
            L
          </span>
          <div>
            <h1 className="wordmark text-2xl text-ink">Leadscope</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Live pipeline intelligence for revenue teams
            </p>
          </div>
        </div>

        <LoginForm next={next} />

        <p className="mt-6 text-center text-xs text-ink-subtle">
          Demo data is generated locally and resets with{' '}
          <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">
            pnpm db:reset
          </code>
        </p>
      </div>
    </div>
  )
}
