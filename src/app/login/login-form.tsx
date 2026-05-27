'use client'

import { Loader2, LockKeyhole, Mail } from 'lucide-react'
import { useState } from 'react'

import { Button, Card, Input } from '@/components/ui'
import { ApiRequestError, api } from '@/lib/api/client'

const DEMO = { email: 'demo@leadscope.app', password: 'demo1234' }

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState(DEMO.email)
  const [password, setPassword] = useState(DEMO.password)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)

    try {
      await api.post('/api/auth/login', { email, password })

      // A full document load rather than router.replace(): the session cookie
      // changes what every server component on the next route renders, and a
      // client-side transition races the router cache. `replace` also keeps the
      // login screen out of the back stack.
      //
      // Only same-origin absolute paths are honoured, so a crafted
      // `?next=//evil.example` cannot turn this into an open redirect.
      const target = next && /^\/(?!\/)/.test(next) ? next : '/'
      window.location.replace(target)
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'Could not sign in. Please try again.',
      )
      setPending(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-ink">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<Mail className="h-4 w-4" aria-hidden />}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-ink">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            icon={<LockKeyhole className="h-4 w-4" aria-hidden />}
          />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" size="lg" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>

        <p className="text-center text-xs text-ink-subtle">
          Prefilled with the demo account — {DEMO.email} / {DEMO.password}
        </p>
      </form>
    </Card>
  )
}
