import { cn, clamp } from '@/lib/utils'

export function Progress({
  value,
  className,
  tone = 'brand',
  label,
}: {
  /** Ratio in `[0, 1]`; values above 1 are clamped but colour-shifted. */
  value: number
  className?: string
  tone?: 'brand' | 'positive' | 'warning' | 'negative'
  label?: string
}) {
  const pct = clamp(value, 0, 1) * 100
  const tones = {
    brand: 'bg-brand',
    positive: 'bg-positive',
    warning: 'bg-warning',
    negative: 'bg-negative',
  } as const

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={label}
      className={cn(
        'h-1.5 w-full overflow-hidden rounded-pill bg-surface-muted',
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-pill transition-[width] duration-500',
          tones[tone],
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/** Circular variant used for quota attainment. */
export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  children,
}: {
  value: number
  size?: number
  strokeWidth?: number
  children?: React.ReactNode
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamp(value, 0, 1))

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-surface-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            'transition-[stroke-dashoffset] duration-700',
            value >= 1
              ? 'stroke-positive'
              : value >= 0.7
                ? 'stroke-brand'
                : 'stroke-warning',
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {children}
      </span>
    </div>
  )
}
