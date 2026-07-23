'use client'

import { RotateCw, TriangleAlert } from 'lucide-react'
import { useEffect } from 'react'

import { Button, Card } from '@/components/ui'

/**
 * Root error boundary. Renders for any uncaught error in a page or layout below
 * it, replacing Next's default overlay in production.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In a real deployment this is where the error would go to Sentry et al.
    console.error('[leadscope] unhandled error', error)
  }, [error])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-negative/10 text-negative">
          <TriangleAlert className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-muted">
          The page hit an error it could not recover from. Retrying usually works; if it
          does not, the server log has the detail.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-2xs text-ink-subtle">
            Reference {error.digest}
          </p>
        ) : null}
        <Button variant="primary" onClick={reset} className="mt-5">
          <RotateCw className="h-4 w-4" aria-hidden />
          Try again
        </Button>
      </Card>
    </div>
  )
}
