import { z } from 'zod'

export const rangeSchema = z.object({
  /** Trailing window in days. */
  days: z.coerce.number().int().min(1).max(365).default(30),
  granularity: z.enum(['day', 'week', 'month']).default('day'),
  ownerId: z.string().min(1).optional(),
})

export type RangeQuery = z.infer<typeof rangeSchema>

export const leaderboardQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  metric: z.enum(['revenue', 'wins', 'leads', 'touches', 'quota']).default('revenue'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().trim().max(80).optional(),
})

export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
})

export type LoginInput = z.infer<typeof loginSchema>

/** Window boundaries for a trailing `days` range, plus the preceding window. */
export function trailingWindow(days: number, now = Date.now()) {
  const span = days * 86_400_000
  return {
    from: new Date(now - span),
    to: new Date(now),
    previousFrom: new Date(now - span * 2),
    previousTo: new Date(now - span),
  }
}
