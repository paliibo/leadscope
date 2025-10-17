import type { SeriesPoint } from './series'

export interface Regression {
  slope: number
  intercept: number
  /** Coefficient of determination in `[0, 1]`. */
  r2: number
  /** Residual standard error; 0 when there are fewer than 3 samples. */
  standardError: number
  sampleSize: number
}

/**
 * Ordinary least squares over `(index, value)` pairs.
 *
 * Degenerate inputs are handled explicitly rather than returning NaN:
 * an empty series gives a flat zero line, a single point gives a flat line at
 * that point, and a series with zero variance in x gives slope 0.
 */
export function linearRegression(values: readonly number[]): Regression {
  const n = values.length
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0, standardError: 0, sampleSize: 0 }
  }
  if (n === 1) {
    return {
      slope: 0,
      intercept: values[0] as number,
      r2: 0,
      standardError: 0,
      sampleSize: 1,
    }
  }

  const meanX = (n - 1) / 2
  const meanY = values.reduce((sum, value) => sum + value, 0) / n

  let sxx = 0
  let sxy = 0
  for (let i = 0; i < n; i += 1) {
    const dx = i - meanX
    sxx += dx * dx
    sxy += dx * ((values[i] as number) - meanY)
  }

  const slope = sxx === 0 ? 0 : sxy / sxx
  const intercept = meanY - slope * meanX

  let ssRes = 0
  let ssTot = 0
  for (let i = 0; i < n; i += 1) {
    const predicted = intercept + slope * i
    const actual = values[i] as number
    ssRes += (actual - predicted) ** 2
    ssTot += (actual - meanY) ** 2
  }

  const r2 = ssTot === 0 ? (ssRes === 0 ? 1 : 0) : 1 - ssRes / ssTot
  const standardError = n > 2 ? Math.sqrt(ssRes / (n - 2)) : 0

  return { slope, intercept, r2, standardError, sampleSize: n }
}

export interface ForecastPoint {
  index: number
  value: number
  lower: number
  upper: number
}

/**
 * Project `periods` steps past the end of the series with a 95% prediction
 * interval. The interval widens as it moves away from the sample mean, which is
 * the honest shape for extrapolation.
 */
export function forecast(values: readonly number[], periods: number): ForecastPoint[] {
  if (periods < 1) return []
  const model = linearRegression(values)
  const n = model.sampleSize
  const meanX = (n - 1) / 2

  let sxx = 0
  for (let i = 0; i < n; i += 1) sxx += (i - meanX) ** 2

  const out: ForecastPoint[] = []
  for (let step = 1; step <= periods; step += 1) {
    const index = n - 1 + step
    const value = model.intercept + model.slope * index
    const leverage =
      n > 0 && sxx > 0 ? Math.sqrt(1 + 1 / n + (index - meanX) ** 2 / sxx) : 1
    const margin = 1.96 * model.standardError * leverage
    out.push({
      index,
      value: Math.max(0, value),
      lower: Math.max(0, value - margin),
      upper: Math.max(0, value + margin),
    })
  }
  return out
}

/**
 * Straight-line projection of where a period lands, given progress so far.
 * Used for "on track / behind" quota badges.
 */
export function projectPeriodTotal(
  achieved: number,
  elapsedDays: number,
  totalDays: number,
): number {
  if (elapsedDays <= 0) return 0
  if (totalDays <= 0) return achieved
  return Math.round((achieved / elapsedDays) * totalDays)
}

export type PaceVerdict = 'ahead' | 'on-track' | 'behind' | 'no-target'

/** Classify pace against a target with a +/-5% dead band around "on track". */
export function paceAgainstTarget(projected: number, target: number): PaceVerdict {
  if (target <= 0) return 'no-target'
  const ratio = projected / target
  if (ratio >= 1.05) return 'ahead'
  if (ratio >= 0.95) return 'on-track'
  return 'behind'
}

/** Attach a forecast tail to a dated series, continuing the cadence. */
export function extendSeries(
  points: readonly SeriesPoint[],
  periods: number,
  stepMs: number,
): Array<SeriesPoint & { forecast: boolean; lower?: number; upper?: number }> {
  const historical = points.map((point) => ({ ...point, forecast: false }))
  if (points.length === 0) return historical

  const last = points[points.length - 1] as SeriesPoint
  const projected = forecast(
    points.map((point) => point.value),
    periods,
  )

  return [
    ...historical,
    ...projected.map((point, offset) => {
      const timestamp = last.timestamp + stepMs * (offset + 1)
      return {
        date: new Date(timestamp).toISOString().slice(0, 10),
        timestamp,
        value: Math.round(point.value),
        lower: Math.round(point.lower),
        upper: Math.round(point.upper),
        forecast: true,
      }
    }),
  ]
}
