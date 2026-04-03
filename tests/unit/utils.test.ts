import { describe, expect, it } from 'vitest'

import {
  chunk,
  clamp,
  groupBy,
  hueFromString,
  initials,
  percentChange,
  sumBy,
} from '@/lib/utils'

describe('clamp', () => {
  it('bounds a value on both sides', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-1, 0, 10)).toBe(0)
    expect(clamp(11, 0, 10)).toBe(10)
  })

  it('rejects an inverted range instead of returning nonsense', () => {
    expect(() => clamp(5, 10, 0)).toThrow(RangeError)
  })
})

describe('chunk', () => {
  it('splits into equal parts', () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('leaves a short final chunk', () => {
    expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]])
  })

  it('returns nothing for an empty list', () => {
    expect(chunk([], 3)).toEqual([])
  })

  it('rejects a non-positive size rather than looping forever', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError)
  })
})

describe('groupBy', () => {
  it('buckets by the derived key and preserves order', () => {
    const items = [
      { stage: 'new', id: 1 },
      { stage: 'won', id: 2 },
      { stage: 'new', id: 3 },
    ]
    expect(groupBy(items, (item) => item.stage)).toEqual({
      new: [items[0], items[2]],
      won: [items[1]],
    })
  })
})

describe('sumBy', () => {
  it('sums a projection', () => {
    expect(sumBy([{ n: 1 }, { n: 2 }], (item) => item.n)).toBe(3)
  })

  it('is zero for an empty list', () => {
    expect(sumBy([], () => 1)).toBe(0)
  })
})

describe('percentChange', () => {
  it('computes growth and decline', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })

  it('returns null when there is no baseline to compare against', () => {
    // Reporting +100% against a zero baseline would be a lie.
    expect(percentChange(10, 0)).toBeNull()
  })

  it('treats zero-to-zero as flat rather than undefined', () => {
    expect(percentChange(0, 0)).toBe(0)
  })

  it('uses the magnitude of a negative baseline', () => {
    expect(percentChange(-50, -100)).toBe(50)
  })
})

describe('initials', () => {
  it('takes the first and last name', () => {
    expect(initials('Ada Lovelace')).toBe('AL')
    expect(initials('Bogdan Palii Something')).toBe('BS')
  })

  it('falls back to one letter for a single name', () => {
    expect(initials('Prince')).toBe('P')
  })

  it('survives empty and whitespace-only input', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
  })
})

describe('hueFromString', () => {
  it('is deterministic', () => {
    expect(hueFromString('Ada Lovelace')).toBe(hueFromString('Ada Lovelace'))
  })

  it('always lands inside the colour wheel', () => {
    for (const name of ['a', 'Zebra', '', 'a very long name indeed', '🙂']) {
      const hue = hueFromString(name)
      expect(hue).toBeGreaterThanOrEqual(0)
      expect(hue).toBeLessThan(360)
    }
  })
})
