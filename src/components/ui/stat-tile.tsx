import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { Card } from './card'
import { Delta } from './delta'
import { Sparkline } from './sparkline'

export function StatTile({
  label,
  value,
  change,
  icon: Icon,
  series,
  tone = 'brand',
  footnote,
  inverted,
  className,
}: {
  label: string
  value: ReactNode
  change?: number | null
  icon?: LucideIcon
  series?: readonly number[]
  tone?: 'brand' | 'positive' | 'negative' | 'muted'
  footnote?: ReactNode
  inverted?: boolean
  className?: string
}) {
  return (
    <Card className={cn('flex flex-col gap-3 p-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-subtle">
          {label}
        </span>
        {Icon ? <Icon className="h-4 w-4 text-ink-subtle" aria-hidden /> : null}
      </div>

      <div className="tnum text-2xl font-semibold leading-none text-ink">{value}</div>

      {series && series.length > 1 ? (
        <Sparkline values={series} tone={tone} className="h-8" />
      ) : null}

      {change !== undefined ? (
        <Delta change={change} inverted={inverted} />
      ) : footnote ? (
        <p className="text-xs text-ink-muted">{footnote}</p>
      ) : null}
    </Card>
  )
}
