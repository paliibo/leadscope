import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Period-over-period change chip.
 *
 * `null` means there was no baseline to compare against, which is rendered as a
 * dash — showing "+100%" against a zero baseline would be a lie.
 */
export function Delta({
  change,
  className,
  /** Set for metrics where a decrease is the good outcome (e.g. cycle length). */
  inverted = false,
  suffix = 'vs previous',
}: {
  change: number | null
  className?: string
  inverted?: boolean
  suffix?: string
}) {
  if (change === null) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-xs text-ink-subtle', className)}>
        <Minus className="h-3 w-3" aria-hidden />
        No baseline
      </span>
    )
  }

  const flat = Math.abs(change) < 0.5
  const good = inverted ? change < 0 : change > 0
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1 text-xs font-medium',
        flat ? 'text-ink-subtle' : good ? 'text-positive' : 'text-negative',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {change > 0 ? '+' : ''}
      {change.toFixed(1)}%
      <span className="font-normal text-ink-subtle">{suffix}</span>
    </span>
  )
}
