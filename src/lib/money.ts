/**
 * All monetary values move through the app as integer cents. These helpers are
 * the only place cents become strings, which keeps rounding in one testable spot.
 */

const COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const FULL = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const PRECISE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** `1_234_500` -> `"$12.3K"` */
export function formatCompactMoney(cents: number): string {
  const dollars = cents / 100
  const sign = dollars < 0 ? '-' : ''
  return `${sign}$${COMPACT.format(Math.abs(dollars))}`
}

/** `1_234_500` -> `"$12,345"` */
export function formatMoney(cents: number): string {
  return FULL.format(cents / 100)
}

/** `1_234_567` -> `"$12,345.67"` */
export function formatPreciseMoney(cents: number): string {
  return PRECISE.format(cents / 100)
}

/** Parse a loosely typed money string (`"$12,345.60"`) into cents. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

/** `0.4213` -> `"42.1%"`. Pass `digits` to control precision. */
export function formatPercent(ratio: number, digits = 1): string {
  return `${(ratio * 100).toFixed(digits)}%`
}

/** `1234` -> `"1,234"` */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}
