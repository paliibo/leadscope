'use client'

import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { useLiveStream, type LiveStream } from '@/hooks/use-live-stream'
import { formatCompactMoney } from '@/lib/money'

import type { LeadscopeEvent } from '@/lib/events/types'
import type { ReactNode } from 'react'

const LiveContext = createContext<LiveStream | null>(null)

/** How long to batch invalidations for. Busy periods emit several events a second. */
const INVALIDATE_WINDOW_MS = 1_200

export function LiveProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const pending = useRef<Set<string>>(new Set())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    timer.current = null
    const keys = [...pending.current]
    pending.current.clear()
    for (const key of keys) {
      void queryClient.invalidateQueries({ queryKey: [key] })
    }
  }, [queryClient])

  const schedule = useCallback(
    (keys: string[]) => {
      for (const key of keys) pending.current.add(key)
      // Coalesce a burst of events into one refetch per key.
      timer.current ??= setTimeout(flush, INVALIDATE_WINDOW_MS)
    },
    [flush],
  )

  const onEvent = useCallback(
    (event: LeadscopeEvent) => {
      switch (event.type) {
        case 'lead.created':
          schedule(['board', 'leads', 'metrics'])
          break
        case 'lead.stage_changed':
          schedule(['board', 'leads', 'metrics', 'funnel'])
          break
        case 'lead.touched':
          schedule(['activity'])
          break
        case 'deal.won':
        case 'deal.lost':
          schedule(['board', 'leads', 'metrics', 'funnel', 'leaderboard'])
          break
      }

      // Only wins interrupt — everything else is visible in the ticker already.
      if (event.type === 'deal.won') {
        toast.success(`${event.subject.accountName} signed`, {
          description: `${formatCompactMoney(event.subject.valueCents)} closed by ${event.actor.name}`,
        })
      }
    },
    [schedule],
  )

  const stream = useLiveStream(onEvent)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  return <LiveContext.Provider value={stream}>{children}</LiveContext.Provider>
}

/** Live pipeline feed. Returns a quiet default outside the provider. */
export function useLive(): LiveStream {
  return (
    useContext(LiveContext) ?? {
      events: [],
      pulse: null,
      status: 'connecting',
      latest: null,
    }
  )
}
