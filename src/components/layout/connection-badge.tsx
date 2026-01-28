'use client'

import { cn } from '@/lib/utils'

import { useLive } from '../providers/live-provider'

const COPY = {
  live: { label: 'Live', tone: 'bg-positive', help: 'Streaming pipeline events' },
  connecting: { label: 'Connecting', tone: 'bg-warning', help: 'Reconnecting to the event stream' },
  offline: { label: 'Offline', tone: 'bg-negative', help: 'Event stream unavailable' },
} as const

/** Shows the real SSE connection state — never a decorative "live" dot. */
export function ConnectionBadge({ className }: { className?: string }) {
  const { status, pulse } = useLive()
  const copy = COPY[status]

  return (
    <span
      title={copy.help}
      className={cn(
        'inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-2.5 py-1 text-2xs font-medium text-ink-muted',
        className,
      )}
    >
      <span className="relative flex h-1.5 w-1.5">
        {status === 'live' ? (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', copy.tone)} />
        ) : null}
        <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', copy.tone)} />
      </span>
      {copy.label}
      {status === 'live' && pulse ? (
        <span className="tnum text-ink-subtle">{pulse.eventsPerMinute}/min</span>
      ) : null}
    </span>
  )
}
