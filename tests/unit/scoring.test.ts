import { describe, expect, it } from 'vitest'

import { scoreLead, type ScoreFeatures } from '@/lib/analytics/scoring'

const base: ScoreFeatures = {
  source: 'inbound',
  sizeBucket: '51-200',
  valueCents: 2_000_000,
  engagementCount: 3,
  daysSinceLastTouch: 2,
  hasMeeting: false,
}

describe('scoreLead', () => {
  it('stays within 0-100 across the whole feature space', () => {
    const extremes: ScoreFeatures[] = [
      base,
      { ...base, source: 'referral', sizeBucket: '1000+', valueCents: 50_000_000, engagementCount: 50, daysSinceLastTouch: 0, hasMeeting: true },
      { ...base, source: 'ads', sizeBucket: '1-10', valueCents: 0, engagementCount: 0, daysSinceLastTouch: 999, hasMeeting: false },
      { ...base, valueCents: -100 },
    ]
    for (const features of extremes) {
      const { score } = scoreLead(features)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })

  it('ranks referrals above cold ads, all else equal', () => {
    expect(scoreLead({ ...base, source: 'referral' }).score).toBeGreaterThan(
      scoreLead({ ...base, source: 'ads' }).score,
    )
  })

  it('rewards larger accounts', () => {
    expect(scoreLead({ ...base, sizeBucket: '1000+' }).score).toBeGreaterThan(
      scoreLead({ ...base, sizeBucket: '1-10' }).score,
    )
  })

  it('saturates deal value so one whale cannot max the score', () => {
    const big = scoreLead({ ...base, valueCents: 10_000_000 })
    const enormous = scoreLead({ ...base, valueCents: 1_000_000_000 })
    const valueOf = (result: ReturnType<typeof scoreLead>) =>
      result.components.find((component) => component.label === 'Deal value')!.points

    expect(valueOf(enormous)).toBeGreaterThanOrEqual(valueOf(big))
    expect(valueOf(enormous)).toBeLessThanOrEqual(20)
  })

  it('decays with staleness and hits zero after four weeks', () => {
    const recencyOf = (days: number) =>
      scoreLead({ ...base, daysSinceLastTouch: days }).components.find(
        (component) => component.label === 'Recency',
      )!.points

    expect(recencyOf(0)).toBe(15)
    expect(recencyOf(1)).toBe(15)
    expect(recencyOf(14)).toBeLessThan(15)
    expect(recencyOf(14)).toBeGreaterThan(0)
    expect(recencyOf(28)).toBe(0)
    expect(recencyOf(400)).toBe(0)
  })

  it('gives a meeting a real bonus', () => {
    expect(scoreLead({ ...base, hasMeeting: true }).score).toBeGreaterThan(
      scoreLead({ ...base, hasMeeting: false }).score,
    )
  })

  it('caps engagement so activity alone cannot carry a bad lead', () => {
    const engagementOf = (count: number) =>
      scoreLead({ ...base, engagementCount: count }).components.find(
        (component) => component.label === 'Engagement',
      )!.points

    expect(engagementOf(200)).toBeLessThanOrEqual(20)
    expect(engagementOf(200)).toBe(engagementOf(8))
  })

  it('bands the score consistently with its value', () => {
    expect(scoreLead({ ...base, source: 'referral', sizeBucket: '1000+', valueCents: 40_000_000, engagementCount: 8, daysSinceLastTouch: 0, hasMeeting: true }).band).toBe('hot')
    expect(scoreLead({ ...base, source: 'ads', sizeBucket: '1-10', valueCents: 100_000, engagementCount: 0, daysSinceLastTouch: 60, hasMeeting: false }).band).toBe('cold')
  })

  it('returns a breakdown that sums to the score', () => {
    const result = scoreLead(base)
    const total = result.components.reduce((sum, component) => sum + component.points, 0)
    expect(result.score).toBe(Math.min(100, total))
  })

  it('handles an unknown size bucket without throwing', () => {
    expect(() => scoreLead({ ...base, sizeBucket: 'not-a-bucket' })).not.toThrow()
  })
})
