import { describe, expect, it } from 'vitest'

import { Random, mulberry32 } from '@/lib/rng'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('produces different streams for different seeds', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('stays inside [0, 1)', () => {
    const next = mulberry32(7)
    for (let i = 0; i < 5000; i += 1) {
      const value = next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })
})

describe('Random', () => {
  it('reproduces the same sequence from the same seed', () => {
    const a = new Random(2026)
    const b = new Random(2026)
    expect(Array.from({ length: 10 }, () => a.int(0, 100))).toEqual(
      Array.from({ length: 10 }, () => b.int(0, 100)),
    )
  })

  it('bounds int() inclusively on both ends', () => {
    const rng = new Random(3)
    const seen = new Set<number>()
    for (let i = 0; i < 2000; i += 1) seen.add(rng.int(1, 3))
    expect([...seen].sort()).toEqual([1, 2, 3])
  })

  it('rejects an inverted int range', () => {
    expect(() => new Random(1).int(5, 1)).toThrow(RangeError)
  })

  it('honours weighting', () => {
    const rng = new Random(11)
    let heavy = 0
    for (let i = 0; i < 4000; i += 1) {
      if (rng.weighted([['heavy', 9] as const, ['light', 1] as const]) === 'heavy') {
        heavy += 1
      }
    }
    expect(heavy / 4000).toBeGreaterThan(0.85)
    expect(heavy / 4000).toBeLessThan(0.95)
  })

  it('never selects a zero-weight option', () => {
    const rng = new Random(5)
    for (let i = 0; i < 500; i += 1) {
      expect(rng.weighted([['yes', 1] as const, ['never', 0] as const])).toBe('yes')
    }
  })

  it('throws rather than returning undefined for an empty pick', () => {
    expect(() => new Random(1).pick([])).toThrow(RangeError)
    expect(() => new Random(1).weighted([])).toThrow(RangeError)
  })

  it('shuffles without losing or duplicating elements', () => {
    const input = Array.from({ length: 50 }, (_, index) => index)
    const shuffled = new Random(9).shuffle(input)
    expect(shuffled).toHaveLength(input.length)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(input)
    expect(shuffled).not.toEqual(input)
  })

  it('does not mutate the array it shuffles', () => {
    const input = [1, 2, 3, 4, 5]
    new Random(4).shuffle(input)
    expect(input).toEqual([1, 2, 3, 4, 5])
  })

  it('draws normals centred on the mean and clamped to four sigma', () => {
    const rng = new Random(21)
    const samples = Array.from({ length: 8000 }, () => rng.normal(100, 10))
    const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length

    expect(mean).toBeGreaterThan(98)
    expect(mean).toBeLessThan(102)
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(60)
    expect(Math.max(...samples)).toBeLessThanOrEqual(140)
  })

  it('chance(0) never fires and chance(1) always does', () => {
    const rng = new Random(6)
    for (let i = 0; i < 200; i += 1) {
      expect(rng.chance(0)).toBe(false)
      expect(rng.chance(1)).toBe(true)
    }
  })
})
