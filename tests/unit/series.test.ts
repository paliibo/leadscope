import { describe, expect, it } from 'vitest'

import {
  bucketStart,
  daysBetween,
  movingAverage,
  splitForComparison,
  toSeries,
} from '@/lib/analytics/series'

/**
 * Dates are constructed in local time throughout: the bucketing helpers use
 * local calendar days, so a UTC literal would make these assertions pass or fail
 * depending on the runner's timezone.
 */
const day = (iso: string) => {
  const [year, month, date] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, date!, 12, 0, 0)
}

const at = (iso: string, hour: number) => {
  const [year, month, date] = iso.split('-').map(Number)
  return new Date(year!, month! - 1, date!, hour).getTime()
}

describe('toSeries', () => {
  const records = [
    { at: at('2026-03-02', 9), value: 5 },
    { at: at('2026-03-02', 18), value: 7 },
    { at: at('2026-03-04', 10), value: 2 },
  ]

  it('counts records per bucket by default', () => {
    const series = toSeries(records, {
      from: day('2026-03-01'),
      to: day('2026-03-04'),
      granularity: 'day',
      timestampOf: (record) => record.at,
    })
    expect(series.map((point) => point.value)).toEqual([0, 2, 0, 1])
  })

  it('sums a weight when one is supplied', () => {
    const series = toSeries(records, {
      from: day('2026-03-01'),
      to: day('2026-03-04'),
      granularity: 'day',
      timestampOf: (record) => record.at,
      weightOf: (record) => record.value,
    })
    expect(series.map((point) => point.value)).toEqual([0, 12, 0, 2])
  })

  it('emits empty buckets rather than skipping them', () => {
    const series = toSeries([], {
      from: day('2026-03-01'),
      to: day('2026-03-05'),
      granularity: 'day',
      timestampOf: () => 0,
    })
    expect(series).toHaveLength(5)
    expect(series.every((point) => point.value === 0)).toBe(true)
  })

  it('returns nothing for a reversed range instead of looping forever', () => {
    const series = toSeries([], {
      from: day('2026-03-10'),
      to: day('2026-03-01'),
      granularity: 'day',
      timestampOf: () => 0,
    })
    expect(series).toEqual([])
  })

  it('groups weeks from Monday', () => {
    // 2026-03-04 is a Wednesday; its week starts Monday 2026-03-02.
    expect(bucketStart(at('2026-03-04', 12), 'week').key).toBe('2026-03-02')
  })

  it('groups months from the first', () => {
    expect(bucketStart(at('2026-03-19', 12), 'month').key).toBe('2026-03-01')
  })
})

describe('movingAverage', () => {
  it('averages over the trailing window once it is full', () => {
    expect(movingAverage([1, 2, 3, 4, 5], 3)).toEqual([1, 1.5, 2, 3, 4])
  })

  it('starts at the same x as the raw series', () => {
    const values = [4, 8, 12]
    expect(movingAverage(values, 7)).toHaveLength(values.length)
  })

  it('is the identity for a window of one', () => {
    expect(movingAverage([3, 1, 4], 1)).toEqual([3, 1, 4])
  })

  it('rejects a window below one', () => {
    expect(() => movingAverage([1, 2], 0)).toThrow(RangeError)
  })
})

describe('splitForComparison', () => {
  const points = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-03-${String(index + 1).padStart(2, '0')}`,
    timestamp: index,
    value: index,
  }))

  it('splits into two equal trailing windows', () => {
    const { current, previous } = splitForComparison(points, 3)
    expect(current.map((point) => point.value)).toEqual([7, 8, 9])
    expect(previous.map((point) => point.value)).toEqual([4, 5, 6])
  })

  it('returns a short previous window when there is not enough history', () => {
    const { current, previous } = splitForComparison(points.slice(0, 4), 3)
    expect(current).toHaveLength(3)
    expect(previous).toHaveLength(1)
  })
})

describe('daysBetween', () => {
  it('counts calendar days, ignoring time of day', () => {
    expect(daysBetween(at('2026-03-01', 23), at('2026-03-03', 1))).toBe(2)
  })

  it('is negative when the range runs backwards', () => {
    expect(daysBetween(at('2026-03-05', 12), at('2026-03-01', 12))).toBe(-4)
  })
})
