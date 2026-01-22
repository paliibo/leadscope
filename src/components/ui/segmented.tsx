'use client'

import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/**
 * Compact single-select control used for time ranges and metric switches.
 * Implemented as a radio group so arrow keys and screen readers behave, rather
 * than as a row of buttons that only looks like one.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  name,
  className,
  size = 'md',
}: {
  options: ReadonlyArray<SegmentedOption<T>>
  value: T
  onChange: (value: T) => void
  name: string
  className?: string
  size?: 'sm' | 'md'
}) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface-muted p-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-pill font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-2xs' : 'px-3 py-1.5 text-xs',
              active
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
