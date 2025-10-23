import type { LeadStage } from '@/db/schema'

const DAY_MS = 86_400_000

export interface StageTransition {
  leadId: string
  fromStage: LeadStage | null
  toStage: LeadStage | null
  createdAt: number
}

export interface StageDwell {
  stage: LeadStage
  /** Mean days a lead sat in this stage before moving on. */
  averageDays: number
  /** Median is reported alongside the mean because dwell times are long-tailed. */
  medianDays: number
  samples: number
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2
    : (sorted[middle] as number)
}

/**
 * How long leads linger in each stage, derived from the transition log.
 *
 * A dwell sample is only counted once a lead has *left* the stage — leads still
 * sitting in a stage would otherwise drag the average down every time the report
 * is run early.
 */
export function stageDwellTimes(
  transitions: readonly StageTransition[],
): StageDwell[] {
  const byLead = new Map<string, StageTransition[]>()
  for (const transition of transitions) {
    const bucket = byLead.get(transition.leadId)
    if (bucket) bucket.push(transition)
    else byLead.set(transition.leadId, [transition])
  }

  const samples = new Map<LeadStage, number[]>()

  for (const events of byLead.values()) {
    const ordered = [...events].sort((a, b) => a.createdAt - b.createdAt)
    for (let i = 0; i < ordered.length - 1; i += 1) {
      const current = ordered[i] as StageTransition
      const next = ordered[i + 1] as StageTransition
      const stage = current.toStage
      if (!stage) continue
      const days = (next.createdAt - current.createdAt) / DAY_MS
      if (days < 0) continue
      const bucket = samples.get(stage)
      if (bucket) bucket.push(days)
      else samples.set(stage, [days])
    }
  }

  return [...samples.entries()]
    .map(([stage, values]) => ({
      stage,
      averageDays: values.reduce((sum, value) => sum + value, 0) / values.length,
      medianDays: median(values),
      samples: values.length,
    }))
    .sort((a, b) => b.averageDays - a.averageDays)
}

export interface CycleInput {
  createdAt: number
  closedAt: number | null
  stage: LeadStage
}

export interface CycleStats {
  averageDays: number
  medianDays: number
  fastestDays: number
  slowestDays: number
  samples: number
}

/** Time from creation to close, over won deals only. */
export function salesCycle(leads: readonly CycleInput[]): CycleStats {
  const durations = leads
    .filter((lead) => lead.stage === 'won' && lead.closedAt !== null)
    .map((lead) => ((lead.closedAt as number) - lead.createdAt) / DAY_MS)
    .filter((days) => days >= 0)

  if (durations.length === 0) {
    return { averageDays: 0, medianDays: 0, fastestDays: 0, slowestDays: 0, samples: 0 }
  }

  return {
    averageDays: durations.reduce((sum, value) => sum + value, 0) / durations.length,
    medianDays: median(durations),
    fastestDays: Math.min(...durations),
    slowestDays: Math.max(...durations),
    samples: durations.length,
  }
}

export interface AgingLead {
  id: string
  stage: LeadStage
  updatedAt: number
  valueCents: number
}

/**
 * Open deals that haven't moved in `thresholdDays`, worst first.
 * Sorted by value so the biggest stalled money surfaces at the top.
 */
export function stalledLeads(
  leads: readonly AgingLead[],
  now: number,
  thresholdDays = 14,
): Array<AgingLead & { idleDays: number }> {
  return leads
    .filter((lead) => lead.stage !== 'won' && lead.stage !== 'lost')
    .map((lead) => ({ ...lead, idleDays: Math.floor((now - lead.updatedAt) / DAY_MS) }))
    .filter((lead) => lead.idleDays >= thresholdDays)
    .sort((a, b) => b.valueCents - a.valueCents || b.idleDays - a.idleDays)
}
