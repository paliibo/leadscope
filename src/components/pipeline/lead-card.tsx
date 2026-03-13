'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Building2, Clock, Flame } from 'lucide-react'

import { Avatar } from '@/components/ui'
import { formatCompactMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

import type { LeadWithRelations } from '@/db/queries/leads'

const DAY = 86_400_000

export function LeadCardBody({
  lead,
  dragging,
}: {
  lead: LeadWithRelations
  dragging?: boolean
}) {
  const idleDays = Math.floor((Date.now() - new Date(lead.updatedAt).getTime()) / DAY)
  const stale = idleDays >= 14

  return (
    <div
      className={cn(
        'flex flex-col gap-2.5 rounded-xl border border-line bg-surface p-3 shadow-card transition-shadow',
        dragging ? 'shadow-lifted' : 'hover:shadow-lifted',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
          {lead.name}
        </p>
        <span className="tnum shrink-0 text-sm font-semibold text-ink">
          {formatCompactMoney(lead.valueCents)}
        </span>
      </div>

      <p className="flex items-center gap-1.5 truncate text-xs text-ink-muted">
        <Building2 className="h-3 w-3 shrink-0" aria-hidden />
        {lead.accountName}
      </p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={lead.ownerName} src={lead.ownerAvatarUrl} size="xs" />
          <span
            className={cn(
              'tnum inline-flex items-center gap-1 text-2xs',
              stale ? 'text-warning' : 'text-ink-subtle',
            )}
          >
            <Clock className="h-2.5 w-2.5" aria-hidden />
            {idleDays}d
          </span>
        </div>

        <span
          className={cn(
            'tnum inline-flex items-center gap-1 rounded-pill px-1.5 py-0.5 text-2xs font-medium',
            lead.score >= 70
              ? 'bg-negative/10 text-negative'
              : lead.score >= 40
                ? 'bg-warning/10 text-warning'
                : 'bg-surface-muted text-ink-subtle',
          )}
          title={`Fit score ${lead.score}/100`}
        >
          {lead.score >= 70 ? <Flame className="h-2.5 w-2.5" aria-hidden /> : null}
          {lead.score}
        </span>
      </div>
    </div>
  )
}

export function SortableLeadCard({ lead }: { lead: LeadWithRelations }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id, data: { stage: lead.stage } })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      // The original stays mounted while dragging so the column keeps its
      // height; the DragOverlay renders the copy that follows the cursor.
      className={cn('touch-none', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <LeadCardBody lead={lead} />
    </li>
  )
}
