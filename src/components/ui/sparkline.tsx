import { cn } from '@/lib/utils'

/**
 * A dependency-free sparkline. Chart.js is already in the bundle for the big
 * charts, but instantiating a canvas per KPI tile costs far more than drawing
 * one path, and these never need axes, tooltips or interaction.
 */
export function Sparkline({
  values,
  className,
  width = 120,
  height = 32,
  tone = 'brand',
  filled = true,
}: {
  values: readonly number[]
  className?: string
  width?: number
  height?: number
  tone?: 'brand' | 'positive' | 'negative' | 'muted'
  filled?: boolean
}) {
  if (values.length < 2) {
    return <div className={cn('h-8', className)} aria-hidden />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const padding = 2

  const points = values.map((value, index) => {
    const x = index * stepX
    const y =
      height - padding - ((value - min) / span) * (height - padding * 2)
    return [x, y] as const
  })

  const line = points
    .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')

  const area = `${line} L${width},${height} L0,${height} Z`

  const strokes = {
    brand: 'stroke-brand',
    positive: 'stroke-positive',
    negative: 'stroke-negative',
    muted: 'stroke-ink-subtle',
  } as const
  const fills = {
    brand: 'fill-brand/10',
    positive: 'fill-positive/10',
    negative: 'fill-negative/10',
    muted: 'fill-ink-subtle/10',
  } as const

  const last = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn('h-8 w-full overflow-visible', className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      {filled ? <path d={area} className={fills[tone]} /> : null}
      <path
        d={line}
        fill="none"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={strokes[tone]}
        vectorEffect="non-scaling-stroke"
      />
      {last ? (
        <circle
          cx={last[0]}
          cy={last[1]}
          r={2.5}
          className={cn(strokes[tone], 'fill-surface')}
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  )
}
