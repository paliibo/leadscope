import { describe, expect, it } from 'vitest'

import {
  formatCompactMoney,
  formatCount,
  formatMoney,
  formatPercent,
  formatPreciseMoney,
  parseMoneyToCents,
} from '@/lib/money'

describe('formatCompactMoney', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatCompactMoney(1_234_500)).toBe('$12.3K')
    expect(formatCompactMoney(450_000_000)).toBe('$4.5M')
  })

  it('keeps small amounts readable', () => {
    expect(formatCompactMoney(0)).toBe('$0')
    expect(formatCompactMoney(99)).toBe('$0.99')
  })

  it('puts the sign outside the currency symbol', () => {
    expect(formatCompactMoney(-1_234_500)).toBe('-$12.3K')
  })
})

describe('formatMoney', () => {
  it('renders whole dollars with separators', () => {
    expect(formatMoney(1_234_500)).toBe('$12,345')
  })

  it('rounds rather than truncating', () => {
    expect(formatMoney(1_234_560)).toBe('$12,346')
  })
})

describe('formatPreciseMoney', () => {
  it('always shows two decimals', () => {
    expect(formatPreciseMoney(1_234_567)).toBe('$12,345.67')
    expect(formatPreciseMoney(100)).toBe('$1.00')
  })
})

describe('parseMoneyToCents', () => {
  it('strips currency symbols and separators', () => {
    expect(parseMoneyToCents('$12,345.60')).toBe(1_234_560)
    expect(parseMoneyToCents('1000')).toBe(100_000)
  })

  it('handles negatives', () => {
    expect(parseMoneyToCents('-$45.50')).toBe(-4550)
  })

  it('returns null for input with no number in it', () => {
    expect(parseMoneyToCents('')).toBeNull()
    expect(parseMoneyToCents('abc')).toBeNull()
    expect(parseMoneyToCents('$')).toBeNull()
    expect(parseMoneyToCents('-')).toBeNull()
    expect(parseMoneyToCents('.')).toBeNull()
  })

  it('round-trips through formatPreciseMoney', () => {
    const cents = 987_654
    expect(parseMoneyToCents(formatPreciseMoney(cents))).toBe(cents)
  })
})

describe('formatPercent', () => {
  it('defaults to one decimal place', () => {
    expect(formatPercent(0.4213)).toBe('42.1%')
  })

  it('honours the requested precision', () => {
    expect(formatPercent(0.4213, 0)).toBe('42%')
    expect(formatPercent(0.4213, 3)).toBe('42.130%')
  })
})

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(1234)).toBe('1,234')
    expect(formatCount(7)).toBe('7')
  })
})
