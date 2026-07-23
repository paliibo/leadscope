'use client'

import { useEffect, useRef, useState } from 'react'

import type { LeadscopeEvent, PulseSnapshot } from '@/lib/events/types'

export type ConnectionState = 'connecting' | 'live' | 'offline'

const MAX_EVENTS = 60

export interface LiveStream {
  events: LeadscopeEvent[]
  pulse: PulseSnapshot | null
  status: ConnectionState
  /** Latest event, or null before the first one arrives. */
  latest: LeadscopeEvent | null
}

/**
 * Subscribes to /api/stream.
 *
 * EventSource handles reconnection and Last-Event-ID on its own, so there is no
 * retry loop here — the only job is to keep a bounded buffer and surface the
 * connection state so the UI can say "reconnecting" honestly.
 */
export function useLiveStream(onEvent?: (event: LeadscopeEvent) => void): LiveStream {
  const [events, setEvents] = useState<LeadscopeEvent[]>([])
  const [pulse, setPulse] = useState<PulseSnapshot | null>(null)
  const [status, setStatus] = useState<ConnectionState>('connecting')

  // Kept in a ref so a new callback identity doesn't tear down the connection.
  const handlerRef = useRef(onEvent)
  handlerRef.current = onEvent

  useEffect(() => {
    const source = new EventSource('/api/stream')

    source.addEventListener('open', () => setStatus('live'))

    source.addEventListener('event', (message) => {
      setStatus('live')
      try {
        const event = JSON.parse(
          (message as MessageEvent<string>).data,
        ) as LeadscopeEvent
        setEvents((previous) => [event, ...previous].slice(0, MAX_EVENTS))
        handlerRef.current?.(event)
      } catch {
        // A malformed frame is not worth tearing the stream down for.
      }
    })

    source.addEventListener('pulse', (message) => {
      setStatus('live')
      try {
        setPulse(JSON.parse((message as MessageEvent<string>).data) as PulseSnapshot)
      } catch {
        /* ignore */
      }
    })

    source.addEventListener('error', () => {
      // EventSource reconnects itself; CLOSED means it gave up for good.
      setStatus(source.readyState === EventSource.CLOSED ? 'offline' : 'connecting')
    })

    return () => source.close()
  }, [])

  return { events, pulse, status, latest: events[0] ?? null }
}
