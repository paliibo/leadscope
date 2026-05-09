import { Compass } from 'lucide-react'
import Link from 'next/link'

import { Card } from '@/components/ui'

export const metadata = { title: 'Not found' }

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
          <Compass className="h-5 w-5" aria-hidden />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">Page not found</h1>
        <p className="mt-2 text-sm text-ink-muted">
          That route does not exist in Leadscope.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex h-10 items-center rounded-pill bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand/90"
        >
          Back to the overview
        </Link>
      </Card>
    </div>
  )
}
