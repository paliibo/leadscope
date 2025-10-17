import { LEAD_STAGES, type LeadStage } from '@/db/schema'

/** The stages a healthy deal walks through, in order. `lost` is drop-off, not a step. */
export const FUNNEL_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
] as const satisfies ReadonlyArray<LeadStage>

export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const STAGE_LABELS: Record<LeadStage, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost',
}

/** Position of a stage in the canonical pipeline order. */
export function stageIndex(stage: LeadStage): number {
  return LEAD_STAGES.indexOf(stage)
}

/** Position within the funnel; `-1` for `lost`, which sits outside the funnel. */
export function funnelIndex(stage: LeadStage): number {
  return (FUNNEL_STAGES as readonly LeadStage[]).indexOf(stage)
}

export interface FunnelRow {
  stage: FunnelStage
  label: string
  /** Leads that reached this stage or beyond. */
  count: number
  /** Share of the top-of-funnel that made it here, in `[0, 1]`. */
  conversionFromTop: number
  /** Share of the previous stage that advanced here, in `[0, 1]`. */
  conversionFromPrevious: number
  /** Leads that reached the previous stage but never this one. */
  droppedOff: number
}

/**
 * Build a cumulative funnel from each lead's *furthest reached* stage.
 *
 * Callers pass the furthest stage rather than the current one because a lead
 * sitting in `lost` still reached whatever stage it died in — counting it only
 * as "lost" would understate every step it actually cleared.
 */
export function buildFunnel(furthestStages: readonly LeadStage[]): FunnelRow[] {
  const reachedCounts = FUNNEL_STAGES.map(() => 0)

  for (const stage of furthestStages) {
    const index = funnelIndex(stage)
    if (index < 0) continue
    for (let i = 0; i <= index; i += 1) {
      reachedCounts[i] = (reachedCounts[i] as number) + 1
    }
  }

  const top = reachedCounts[0] as number

  return FUNNEL_STAGES.map((stage, index) => {
    const count = reachedCounts[index] as number
    const previous = index === 0 ? count : (reachedCounts[index - 1] as number)
    return {
      stage,
      label: STAGE_LABELS[stage],
      count,
      conversionFromTop: top === 0 ? 0 : count / top,
      conversionFromPrevious: previous === 0 ? 0 : count / previous,
      droppedOff: Math.max(0, previous - count),
    }
  })
}

export interface WinRate {
  won: number
  lost: number
  open: number
  /** Won divided by closed (won + lost); `0` when nothing has closed yet. */
  rate: number
}

/** Win rate over *closed* deals only — open deals aren't losses yet. */
export function winRate(stages: readonly LeadStage[]): WinRate {
  let won = 0
  let lost = 0
  let open = 0
  for (const stage of stages) {
    if (stage === 'won') won += 1
    else if (stage === 'lost') lost += 1
    else open += 1
  }
  const closed = won + lost
  return { won, lost, open, rate: closed === 0 ? 0 : won / closed }
}

/**
 * The single largest drop-off in the funnel — the step worth fixing first.
 * Returns `null` when nothing has entered the funnel.
 */
export function biggestLeak(rows: readonly FunnelRow[]): FunnelRow | null {
  let worst: FunnelRow | null = null
  for (const row of rows) {
    if (row.droppedOff === 0) continue
    if (!worst || row.droppedOff > worst.droppedOff) worst = row
  }
  return worst
}
