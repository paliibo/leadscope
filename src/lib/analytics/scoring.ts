import { clamp } from '@/lib/utils'

import type { LeadSource } from '@/db/schema'

/**
 * A transparent, hand-tuned fit score. It is deliberately not a black box: every
 * component is named and the breakdown is rendered in the lead drawer so a rep
 * can see *why* a lead scored the way it did.
 *
 * Components sum to 100 at their maxima:
 *   source fit          25
 *   account size        20
 *   deal value          20
 *   engagement depth    20
 *   recency             15
 */

const SOURCE_POINTS: Record<LeadSource, number> = {
  referral: 25,
  inbound: 21,
  event: 17,
  partner: 15,
  outbound: 10,
  ads: 8,
}

const SIZE_POINTS: Record<string, number> = {
  '1-10': 4,
  '11-50': 9,
  '51-200': 14,
  '201-1000': 18,
  '1000+': 20,
}

export interface ScoreFeatures {
  source: LeadSource
  sizeBucket: string
  valueCents: number
  /** Number of logged touches (emails, calls, meetings, notes). */
  engagementCount: number
  /** Whole days since the most recent touch. */
  daysSinceLastTouch: number
  hasMeeting: boolean
}

export interface ScoreComponent {
  label: string
  points: number
  max: number
}

export interface ScoreResult {
  score: number
  components: ScoreComponent[]
  band: 'cold' | 'warm' | 'hot'
}

/** Deal value contribution, saturating at $100k so one whale can't max the score. */
function valuePoints(valueCents: number): number {
  const dollars = Math.max(0, valueCents) / 100
  const saturated = Math.min(dollars, 100_000) / 100_000
  // Square root keeps mid-sized deals meaningfully separated from small ones.
  return Math.round(Math.sqrt(saturated) * 20)
}

/** Engagement contribution: meaningful up to ~8 touches, plus a meeting bonus. */
function engagementPoints(count: number, hasMeeting: boolean): number {
  const base = Math.min(count, 8) * 1.75
  return Math.round(clamp(base + (hasMeeting ? 6 : 0), 0, 20))
}

/** Recency contribution: full marks same-day, nothing after four weeks. */
function recencyPoints(daysSinceLastTouch: number): number {
  if (daysSinceLastTouch <= 1) return 15
  if (daysSinceLastTouch >= 28) return 0
  return Math.round(15 * (1 - (daysSinceLastTouch - 1) / 27))
}

export function scoreLead(features: ScoreFeatures): ScoreResult {
  const components: ScoreComponent[] = [
    {
      label: 'Source fit',
      points: SOURCE_POINTS[features.source] ?? 0,
      max: 25,
    },
    {
      label: 'Account size',
      points: SIZE_POINTS[features.sizeBucket] ?? 0,
      max: 20,
    },
    { label: 'Deal value', points: valuePoints(features.valueCents), max: 20 },
    {
      label: 'Engagement',
      points: engagementPoints(features.engagementCount, features.hasMeeting),
      max: 20,
    },
    { label: 'Recency', points: recencyPoints(features.daysSinceLastTouch), max: 15 },
  ]

  const score = clamp(
    Math.round(components.reduce((sum, component) => sum + component.points, 0)),
    0,
    100,
  )

  return {
    score,
    components,
    band: score >= 70 ? 'hot' : score >= 40 ? 'warm' : 'cold',
  }
}
