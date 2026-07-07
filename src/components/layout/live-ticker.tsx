'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarCheck,
  CircleDollarSign,
  Mail,
  Phone,
  Sparkles,
  StickyNote,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Avatar } from '@/components/ui'
import type { LeadscopeEvent } from '@/lib/events/types'
import { formatCompactMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

import { useLive } from '../providers/live-provider'

function iconFor(event: LeadscopeEvent): { Icon: LucideIcon; tone: string } {
  switch (event.type) {
    case 'lead.created':
      return { Icon: Sparkles, tone: 'text-violet' }
    case 'lead.stage_changed':
      return { Icon: ArrowRight, tone: 'text-brand' }
    case 'deal.won':
      return { Icon: CircleDollarSign, tone: 'text-positive' }
    case 'deal.lost':
      return { Icon: XCircle, tone: 'text-negative' }
    case 'lead.touched':
      return {
        Icon:
          event.activity === 'call_logged'
            ? Phone
            : event.activity === 'meeting_booked'
              ? CalendarCheck
              : event.activity === 'note_added'
                ? StickyNote
                : Mail,
        tone: 'text-ink-subtle',
      }
  }
}

function relativeTime(at: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000))
  if (seconds < 5) return 'now'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  return `${Math.floor(minutes / 60)}h`
}

/**
 * The live activity feed. New events animate in at the top; nothing below moves
 * more than it has to, so the list stays readable while it updates.
 */
export function LiveTicker({ limit = 12 }: { limit?: number }) {
  const { events } = useLive()
  const visible = events.slice(0, limit)

  // Relative timestamps are computed at render. During a quiet stretch nothing
  // re-renders, so tick the component to keep "2m ago" from freezing at "now".
  const [, tick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 20_000)
    return () => clearInterval(timer)
  }, [])

  // One list in both states, keeping the same label and live region. Swapping
  // the container out when the first event lands would mean assistive tech only
  // starts observing the region after it has already changed.
  return (
    <ul
      className="flex flex-col"
      aria-live="polite"
      aria-label="Live pipeline activity"
    >
      {visible.length === 0
        ? Array.from({ length: 5 }, (_, index) => (
            <li key={`skeleton-${index}`} className="flex items-center gap-3 py-2.5">
              <span className="skeleton h-8 w-8 rounded-full" />
              <span className="skeleton h-4 flex-1" />
            </li>
          ))
        : null}
      <AnimatePresence initial={false}>
        {visible.map((event) => {
          const { Icon, tone } = iconFor(event)
          return (
            <motion.li
              key={event.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-start gap-3 border-b border-line/60 py-2.5 last:border-0"
            >
              <Avatar name={event.actor.name} src={event.actor.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                  <Icon
                    className={cn('mr-1.5 inline h-3.5 w-3.5 align-[-2px]', tone)}
                    aria-hidden
                  />
                  {event.summary}
                </p>
                <p className="mt-0.5 truncate text-2xs text-ink-subtle">
                  {event.actor.name}
                  {event.type === 'deal.won' || event.type === 'lead.created'
                    ? ` · ${formatCompactMoney(event.subject.valueCents)}`
                    : ''}
                </p>
              </div>
              <span className="tnum shrink-0 pt-0.5 text-2xs text-ink-subtle">
                {relativeTime(event.at)}
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
