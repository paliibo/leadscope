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
} as const satisfies Record<
  LeadStage,
  'neutral' | 'brand' | 'violet' | 'warning' | 'positive' | 'negative'
>

export function StagePill({ stage }: { stage: LeadStage }) {
  // data-stage gives tests (and any future styling hook) a stable handle that
  // does not depend on which table column the pill happens to sit in.
  return (
    <Badge tone={TONES[stage]} data-stage={stage}>
      {STAGE_LABELS[stage]}
    </Badge>
  )
}
