import { describe, expect, it } from 'vitest'

import { leaderboardQuerySchema, loginSchema, rangeSchema, trailingWindow } from '@/lib/validation/common'
import {
  createLeadSchema,
  leadListQuerySchema,
  parseSearchParams,
  updateLeadSchema,
} from '@/lib/validation/leads'

describe('leadListQuerySchema', () => {
  it('applies sensible defaults', () => {
    const result = leadListQuerySchema.parse({})
    expect(result).toMatchObject({ sort: 'updatedAt', dir: 'desc', page: 1, pageSize: 25 })
  })

  it('splits comma-separated stages and sources', () => {
    const result = leadListQuerySchema.parse({ stage: 'new,contacted', source: 'ads' })
    expect(result.stage).toEqual(['new', 'contacted'])
    expect(result.source).toEqual(['ads'])
  })

  it('rejects an unknown stage rather than silently ignoring it', () => {
    expect(() => leadListQuerySchema.parse({ stage: 'new,teleported' })).toThrow()
  })

  it('caps pageSize so a client cannot ask for the whole table', () => {
    expect(() => leadListQuerySchema.parse({ pageSize: '9999' })).toThrow()
    expect(leadListQuerySchema.parse({ pageSize: '100' }).pageSize).toBe(100)
  })

  it('rejects a page below one', () => {
    expect(() => leadListQuerySchema.parse({ page: '0' })).toThrow()
  })

  it('coerces numeric strings from a query string', () => {
    const result = leadListQuerySchema.parse({ page: '3', minValue: '5000' })
    expect(result.page).toBe(3)
    expect(result.minValue).toBe(5000)
  })
})

describe('updateLeadSchema', () => {
  it('accepts a single field', () => {
    expect(updateLeadSchema.parse({ stage: 'won' })).toEqual({ stage: 'won' })
  })

  it('rejects an empty patch', () => {
    expect(() => updateLeadSchema.parse({})).toThrow(/at least one field/i)
  })

  it('rejects a negative deal value', () => {
    expect(() => updateLeadSchema.parse({ valueCents: -1 })).toThrow()
  })

  it('allows clearing the lost reason with null', () => {
    expect(updateLeadSchema.parse({ lostReason: null })).toEqual({ lostReason: null })
  })
})

describe('createLeadSchema', () => {
  it('requires a valid email', () => {
    expect(() =>
      createLeadSchema.parse({
        name: 'Ada Lovelace',
        email: 'not-an-email',
        title: 'CTO',
        accountId: 'acc_1',
        ownerId: 'rep_1',
        source: 'inbound',
        valueCents: 1000,
      }),
    ).toThrow()
  })
})

describe('parseSearchParams', () => {
  it('reads a URLSearchParams into a typed object', () => {
    const params = new URLSearchParams('q=acme&page=2&stage=new')
    const result = parseSearchParams(leadListQuerySchema, params)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('acme')
      expect(result.data.page).toBe(2)
    }
  })

  it('drops empty values so they fall through to defaults', () => {
    const result = parseSearchParams(leadListQuerySchema, new URLSearchParams('q=&page='))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBeUndefined()
      expect(result.data.page).toBe(1)
    }
  })

  it('reports failure instead of throwing', () => {
    const result = parseSearchParams(leadListQuerySchema, new URLSearchParams('page=-4'))
    expect(result.success).toBe(false)
  })
})

describe('rangeSchema and leaderboardQuerySchema', () => {
  it('defaults to a 30-day daily window', () => {
    expect(rangeSchema.parse({})).toMatchObject({ days: 30, granularity: 'day' })
  })

  it('bounds the window to a year', () => {
    expect(() => rangeSchema.parse({ days: '400' })).toThrow()
  })

  it('defaults the leaderboard to revenue', () => {
    expect(leaderboardQuerySchema.parse({})).toMatchObject({ metric: 'revenue', limit: 10 })
  })
})

describe('loginSchema', () => {
  it('requires an email and a password of at least eight characters', () => {
    expect(() => loginSchema.parse({ email: 'a@b.co', password: 'short' })).toThrow()
    expect(loginSchema.parse({ email: 'a@b.co', password: 'longenough' })).toBeTruthy()
  })
})

describe('trailingWindow', () => {
  it('produces two adjacent windows of equal length', () => {
    const now = Date.UTC(2026, 5, 30)
    const window = trailingWindow(30, now)

    expect(window.to.getTime()).toBe(now)
    expect(window.to.getTime() - window.from.getTime()).toBe(30 * 86_400_000)
    expect(window.previousTo.getTime()).toBe(window.from.getTime())
    expect(window.from.getTime() - window.previousFrom.getTime()).toBe(30 * 86_400_000)
  })
})
