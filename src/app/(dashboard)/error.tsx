'use client'

import { RotateCw, TriangleAlert } from 'lucide-react'

import { Button, Card } from '@/components/ui'

/**
 * Scoped to the dashboard segment, so a failing page keeps the sidebar, the
 * topbar and the live connection rather than blanking the whole app.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <Card className="mx-auto mt-10 max-w-md p-6 text-center">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-negative/10 text-negative">
        <TriangleAlert className="h-5 w-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-base font-semibold text-ink">This view failed to load</h2>
      <p className="mt-2 text-sm text-ink-muted">
        {error.message || 'The request did not complete.'}
      </p>
      <Button variant="primary" onClick={reset} className="mt-5">
        <RotateCw className="h-4 w-4" aria-hidden />
        Retry
      </Button>
    </Card>
  )
}
