'use client'

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Skeleton } from '@/components/ui'
import { api } from '@/lib/api/client'
import { STAGE_LABELS } from '@/lib/analytics/funnel'

import { Column } from './column'
import { LeadCardBody } from './lead-card'

import type { LeadWithRelations } from '@/db/queries/leads'
import type { LeadStage } from '@/db/schema'

const COLUMNS: LeadStage[] = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
]

interface BoardResponse {
  leads: LeadWithRelations[]
}

function stageOf(id: string, leads: LeadWithRelations[]): LeadStage | null {
  if (id.startsWith('column:')) return id.slice('column:'.length) as LeadStage
  return leads.find((lead) => lead.id === id)?.stage ?? null
}

export function PipelineBoard() {
  const queryClient = useQueryClient()
  const [activeId, setActiveId] = useState<string | null>(null)

  const { data, isPending } = useQuery({
    queryKey: ['board'],
    queryFn: () => api.get<BoardResponse>('/api/leads/board'),
  })

  const leads = useMemo(() => data?.leads ?? [], [data])

  const grouped = useMemo(() => {
    const map = new Map<LeadStage, LeadWithRelations[]>(
      COLUMNS.map((stage) => [stage, []]),
    )
    for (const lead of leads) map.get(lead.stage)?.push(lead)
    return map
  }, [leads])

  const move = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: LeadStage }) =>
      api.patch(`/api/leads/${id}`, { stage }),

    // Optimistic: the card lands where it was dropped immediately. Without this
    // it snaps back for the length of a round trip, which feels broken.
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['board'] })
      const previous = queryClient.getQueryData<BoardResponse>(['board'])

      queryClient.setQueryData<BoardResponse>(['board'], (current) =>
        current
          ? {
              leads: current.leads.map((lead) =>
                lead.id === id
                  ? { ...lead, stage, updatedAt: new Date() }
                  : lead,
              ),
            }
          : current,
      )

      return { previous }
    },

    onError: (_error, variables, context) => {
      if (context?.previous) queryClient.setQueryData(['board'], context.previous)
      toast.error('Could not move that deal', {
        description: 'The board has been put back the way it was.',
      })
      void variables
    },

    onSuccess: (_result, { stage }) => {
      // Won and lost leave the board entirely, so re-fetch rather than patch.
      if (stage === 'won' || stage === 'lost') {
        void queryClient.invalidateQueries({ queryKey: ['board'] })
      }
      void queryClient.invalidateQueries({ queryKey: ['metrics'] })
    },
  })

  const sensors = useSensors(
    // A small activation distance keeps a click on a card from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const from = stageOf(String(active.id), leads)
    const to = stageOf(String(over.id), leads)
    if (!from || !to || from === to) return

    move.mutate({ id: String(active.id), stage: to })
    toast.success(`Moved to ${STAGE_LABELS[to]}`)
  }

  if (isPending) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => (
          <div key={stage} className="flex w-72 shrink-0 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  const activeLead = activeId ? leads.find((lead) => lead.id === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map((stage) => (
          <Column key={stage} stage={stage} leads={grouped.get(stage) ?? []} />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.22,1,0.36,1)' }}>
        {activeLead ? (
          <div className="w-72 rotate-1">
            <LeadCardBody lead={activeLead} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
