import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export type Granularity = 'day' | 'week' | 'month'

export interface SeriesPoint {
  /** Bucket start, ISO-8601 date (`2026-03-04`). */
  date: string
  /** Bucket start as epoch ms — handy for chart scales. */
  timestamp: number
  value: number
}

interface Bucketed {
  key: string
  timestamp: number
}

/** Snap a timestamp to the start of its bucket for the given granularity. */
export function bucketStart(timestamp: number, granularity: Granularity): Bucketed {
  const date = new Date(timestamp)
  const start =
    granularity === 'day'
      ? startOfDay(date)
      : granularity === 'week'
        ? startOfWeek(date, { weekStartsOn: 1 })
        : startOfMonth(date)
  return { key: format(start, 'yyyy-MM-dd'), timestamp: start.getTime() }
}

function advance(timestamp: number, granularity: Granularity): number {
  const date = new Date(timestamp)
  if (granularity === 'day') return addDays(date, 1).getTime()
  if (granularity === 'week') return addWeeks(date, 1).getTime()
  return addMonths(date, 1).getTime()
}

/**
 * Turn raw records into an evenly spaced series. Buckets with no records are
 * emitted as zeroes — a chart with holes in it lies about the shape of the data.
 */
export function toSeries<T>(
  records: readonly T[],
  options: {
    from: Date
    to: Date
    granularity: Granularity
    timestampOf: (record: T) => number
    valueOf?: (record: T) => number
  },
): SeriesPoint[] {
  const { from, to, granularity, timestampOf, valueOf = () => 1 } = options

  const totals = new Map<string, number>()
  for (const record of records) {
    const { key } = bucketStart(timestampOf(record), granularity)
    totals.set(key, (totals.get(key) ?? 0) + valueOf(record))
  }

  const points: SeriesPoint[] = []
  let cursor = bucketStart(from.getTime(), granularity).timestamp
  const end = bucketStart(to.getTime(), granularity).timestamp

  // Guard against a reversed range producing an unbounded loop.
  if (cursor > end) return points

  while (cursor <= end) {
    const key = format(new Date(cursor), 'yyyy-MM-dd')
    points.push({ date: key, timestamp: cursor, value: totals.get(key) ?? 0 })
    cursor = advance(cursor, granularity)
  }

  return points
}

/**
 * Trailing simple moving average. The first `window - 1` points average over
 * however many samples exist so the line starts at the same x as the raw series.
 */
export function movingAverage(values: readonly number[], window: number): number[] {
  if (window < 1) throw new RangeError('movingAverage: window must be >= 1')
  const out: number[] = []
  let runningSum = 0
  for (let i = 0; i < values.length; i += 1) {
    runningSum += values[i] as number
    if (i >= window) runningSum -= values[i - window] as number
    const span = Math.min(i + 1, window)
    out.push(runningSum / span)
  }
  return out
}

/** Split a series into the trailing `days` and the equally long window before it. */
export function splitForComparison(
  points: readonly SeriesPoint[],
  days: number,
): { current: SeriesPoint[]; previous: SeriesPoint[] } {
  const current = points.slice(-days)
  const previous = points.slice(Math.max(0, points.length - days * 2), -days)
  return { current, previous }
}

/** Whole days between two instants, ignoring time-of-day. */
export function daysBetween(from: Date | number, to: Date | number): number {
  return differenceInCalendarDays(new Date(to), new Date(from))
}
