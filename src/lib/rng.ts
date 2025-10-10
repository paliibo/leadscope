/**
 * A tiny deterministic PRNG. The demo dataset and the live simulator both draw
 * from this so a given SEED always produces byte-identical data — which is what
 * makes the screenshots in the README reproducible and the tests stable.
 *
 * mulberry32: 32-bit state, passes gjrand's smallcrush, ~2^32 period. Plenty for
 * generating fake CRM records; do not use it for anything security related.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export class Random {
  private readonly next: () => number

  constructor(seed: number) {
    this.next = mulberry32(seed)
  }

  /** Float in `[0, 1)`. */
  float(): number {
    return this.next()
  }

  /** Integer in `[min, max]`, inclusive on both ends. */
  int(min: number, max: number): number {
    if (min > max) throw new RangeError('Random.int: min must be <= max')
    return min + Math.floor(this.next() * (max - min + 1))
  }

  /** Uniform float in `[min, max)`. */
  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  /** `true` with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p
  }

  /** Pick one element. Throws on an empty list rather than returning undefined. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new RangeError('Random.pick: empty list')
    return items[this.int(0, items.length - 1)] as T
  }

  /**
   * Pick one element using relative weights. Weights need not sum to 1.
   * Entries with weight <= 0 are never selected.
   */
  weighted<T>(entries: ReadonlyArray<readonly [T, number]>): T {
    const total = entries.reduce((sum, [, weight]) => sum + Math.max(weight, 0), 0)
    if (total <= 0) throw new RangeError('Random.weighted: no positive weights')
    let roll = this.next() * total
    for (const [value, weight] of entries) {
      roll -= Math.max(weight, 0)
      if (roll <= 0) return value
    }
    return entries[entries.length - 1]![0]
  }

  /** Fisher-Yates shuffle returning a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items]
    for (let i = out.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i)
      ;[out[i], out[j]] = [out[j] as T, out[i] as T]
    }
    return out
  }

  /**
   * Box-Muller normal sample, clamped to +/- 4 sigma so a stray tail value can't
   * produce a negative deal size.
   */
  normal(mean: number, stdDev: number): number {
    const u1 = Math.max(this.next(), Number.EPSILON)
    const u2 = this.next()
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return mean + stdDev * Math.max(-4, Math.min(4, z))
  }
}
