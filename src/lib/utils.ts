import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Tailwind-aware class merge: later utilities win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clamp `value` into the inclusive `[min, max]` range. */
export function clamp(value: number, min: number, max: number) {
  if (min > max) throw new RangeError('clamp: min must be <= max')
  return Math.min(Math.max(value, min), max)
}

/** Split an array into chunks of at most `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new RangeError('chunk: size must be >= 1')
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Group items by a derived string key, preserving insertion order. */
export function groupBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>
  for (const item of items) {
    const key = keyOf(item)
    ;(out[key] ??= []).push(item)
  }
  return out
}

/** Sum a numeric projection of a list. Returns 0 for an empty list. */
export function sumBy<T>(items: readonly T[], valueOf: (item: T) => number): number {
  let total = 0
  for (const item of items) total += valueOf(item)
  return total
}

/**
 * Percentage change from `previous` to `current`.
 * Returns `null` when there is no baseline to compare against, so callers can
 * render "—" instead of a misleading +100%.
 */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / Math.abs(previous)) * 100
}

/** Initials for an avatar fallback, e.g. "Ada Lovelace" -> "AL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

/** Stable hue derived from a string — used to colour avatars consistently. */
export function hueFromString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}
