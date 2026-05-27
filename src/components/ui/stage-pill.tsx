import type { LeadStage } from '@/db/schema'
import { STAGE_LABELS } from '@/lib/analytics/funnel'

import { Badge } from './badge'

const TONES = {
  new: 'neutral',
  contacted: 'brand',
  qualified: 'violet',
  proposal: 'warning',
  negotiation: 'warning',
  won: 'positive',
  lost: 'negative',
} as const satisfies Record<LeadStage, 'neutral' | 'brand' | 'violet' | 'warning' | 'positive' | 'negative'>

export function StagePill({ stage }: { stage: LeadStage }) {
  return <Badge tone={TONES[stage]}>{STAGE_LABELS[stage]}</Badge>
}
