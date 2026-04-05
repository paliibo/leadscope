import { describe, expect, it } from 'vitest'

import {
  extendSeries,
  forecast,
  linearRegression,
  paceAgainstTarget,
  projectPeriodTotal,
} from '@/lib/analytics/forecast'

describe('linearRegression', () => {
  it('recovers a perfect line exactly', () => {
    const model = linearRegression([0, 2, 4, 6, 8])
    expect(model.slope).toBeCloseTo(2, 10)
    expect(model.intercept).toBeCloseTo(0, 10)
    expect(model.r2).toBeCloseTo(1, 10)
    expect(model.standardError).toBeCloseTo(0, 10)
  })

  it('finds a negative slope', () => {
    expect(linearRegression([10, 8, 6, 4]).slope).toBeCloseTo(-2, 10)
  })

  it('reports a flat line as zero slope with no explanatory power', () => {
    const model = linearRegression([5, 5, 5, 5])
    expect(model.slope).toBe(0)
    expect(model.intercept).toBeCloseTo(5, 10)
    // Every residual is zero *and* every deviation is zero: the fit is perfect
    // but explains nothing. We report 1 because SSres is 0.
    expect(model.r2).toBe(1)
  })

  it('never returns NaN for degenerate input', () => {
    const empty = linearRegression([])
    expect(empty).toEqual({
      slope: 0,
      intercept: 0,
      r2: 0,
      standardError: 0,
      sampleSize: 0,
    })

    const single = linearRegression([42])
    expect(single.slope).toBe(0)
    expect(single.intercept).toBe(42)
    expect(Number.isNaN(single.r2)).toBe(false)
  })

  it('gives a lower r2 for noisy data than for clean data', () => {
    const clean = linearRegression([1, 2, 3, 4, 5, 6])
    const noisy = linearRegression([1, 6, 2, 5, 3, 6])
    expect(noisy.r2).toBeLessThan(clean.r2)
  })
})

describe('forecast', () => {
  it('continues the trend', () => {
    const [next] = forecast([0, 2, 4, 6], 1)
    expect(next?.value).toBeCloseTo(8, 6)
    expect(next?.index).toBe(4)
  })

  it('widens the interval the further out it projects', () => {
    const points = forecast([1, 3, 2, 5, 4, 7, 6, 9], 4)
    const widths = points.map((point) => point.upper - point.lower)
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]!).toBeGreaterThanOrEqual(widths[i - 1]!)
    }
  })

  it('never projects negative revenue', () => {
    // A steep decline would cross zero; revenue cannot.
    for (const point of forecast([100, 70, 40, 10], 5)) {
      expect(point.value).toBeGreaterThanOrEqual(0)
      expect(point.lower).toBeGreaterThanOrEqual(0)
    }
  })

  it('returns nothing when asked for no periods', () => {
    expect(forecast([1, 2, 3], 0)).toEqual([])
    expect(forecast([1, 2, 3], -1)).toEqual([])
  })
})

describe('projectPeriodTotal', () => {
  it('extrapolates a partial period linearly', () => {
    expect(projectPeriodTotal(50, 10, 30)).toBe(150)
  })

  it('is zero before any time has elapsed', () => {
    expect(projectPeriodTotal(0, 0, 30)).toBe(0)
  })

  it('falls back to what is achieved when the period has no length', () => {
    expect(projectPeriodTotal(80, 5, 0)).toBe(80)
  })
})

describe('paceAgainstTarget', () => {
  it('classifies with a dead band around on-track', () => {
    expect(paceAgainstTarget(120, 100)).toBe('ahead')
    expect(paceAgainstTarget(100, 100)).toBe('on-track')
    expect(paceAgainstTarget(96, 100)).toBe('on-track')
    expect(paceAgainstTarget(80, 100)).toBe('behind')
  })

  it('reports no verdict without a target', () => {
    expect(paceAgainstTarget(500, 0)).toBe('no-target')
  })
})

describe('extendSeries', () => {
  // Local-time timestamps: extendSeries labels its projection with local
  // calendar days, matching how the history buckets are labelled.
  const points = [
    { date: '2026-01-01', timestamp: new Date(2026, 0, 1, 12).getTime(), value: 10 },
    { date: '2026-01-02', timestamp: new Date(2026, 0, 2, 12).getTime(), value: 20 },
    { date: '2026-01-03', timestamp: new Date(2026, 0, 3, 12).getTime(), value: 30 },
  ]

  it('marks history and projection distinctly', () => {
    const extended = extendSeries(points, 2, 86_400_000)
    expect(extended).toHaveLength(5)
    expect(extended.slice(0, 3).every((point) => !point.forecast)).toBe(true)
    expect(extended.slice(3).every((point) => point.forecast)).toBe(true)
  })

  it('continues the date cadence', () => {
    const extended = extendSeries(points, 1, 86_400_000)
    expect(extended[3]?.date).toBe('2026-01-04')
  })

  it('returns history untouched for an empty series', () => {
    expect(extendSeries([], 3, 86_400_000)).toEqual([])
  })
})
