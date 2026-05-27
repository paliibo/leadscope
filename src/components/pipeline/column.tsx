'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useState } from 'react'

import { Button } from '@/components/ui'
import type { LeadWithRelations } from '@/db/queries/leads'
import type { LeadStage } from '@/db/schema'
import { STAGE_LABELS } from '@/lib/analytics/funnel'
import { formatCompactMoney, formatCount } from '@/lib/money'
import { cn, sumBy } from '@/lib/utils'

import { SortableLeadCard } from './lead-card'

/** Cards rendered before the "show more" cut. A busy column can hold hundreds. */
const PAGE = 25

export function Column({
  stage,
  leads,
}: {
  stage: LeadStage
  leads: LeadWithRelations[]
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${stage}` })
  const [visible, setVisible] = useState(PAGE)

  const total = sumBy(leads, (lead) => lead.valueCents)
  const shown = leads.slice(0, visible)

  return (
    <section className="flex w-72 shrink-0 flex-col gap-3" aria-label={STAGE_LABELS[stage]}>
      <header className="flex items-baseline justify-between gap-2 px-1">
        <h2 className="text-sm font-medium text-ink">
          {STAGE_LABELS[stage]}
          <span className="tnum ml-2 text-xs text-ink-subtle">
            {formatCount(leads.length)}
          </span>
        </h2>
        <span className="tnum text-xs text-ink-muted">{formatCompactMoney(total)}</span>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-32 flex-1 flex-col gap-2 rounded-card border border-dashed p-2 transition-colors',
          isOver ? 'border-brand bg-brand-soft/20' : 'border-line bg-surface-muted/40',
        )}
      >
        <SortableContext
          items={shown.map((lead) => lead.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="flex flex-col gap-2">
            {shown.map((lead) => (
              <SortableLeadCard key={lead.id} lead={lead} />
            ))}
          </ul>
        </SortableContext>

        {leads.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-ink-subtle">
            Drop a deal here
          </p>
        ) : null}

        {leads.length > visible ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible((count) => count + PAGE)}
            className="mt-1 w-full"
          >
            Show {Math.min(PAGE, leads.length - visible)} more
          </Button>
        ) : null}
      </div>
    </section>
  )
}
