'use client'

import { useQuery } from '@tanstack/react-query'
import { Clock, PartyPopper } from 'lucide-react'
import Link from 'next/link'

import { Card, CardHeader, EmptyState, Skeleton, StagePill } from '@/components/ui'
import type { LeadStage } from '@/db/schema'
import type { CycleStats, StageDwell } from '@/lib/analytics/velocity'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney, formatCount } from '@/lib/money'

interface VelocityResponse {
  dwell: StageDwell[]
  cycle: CycleStats
  stalled: Array<{
    id: string
    name: string
    stage: LeadStage
    idleDays: number
    valueCents: number
  }>
  stalledTotal: number
  stalledValueCents: number
}

/** Open deals that have gone quiet, biggest money first. */
export function AttentionCard({ days }: { days: number }) {
  const { data, isPending } = useQuery({
    queryKey: ['metrics', 'velocity', days],
    queryFn: () => api.get<VelocityResponse>(`/api/metrics/velocity${qs({ days })}`),
  })

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Needs attention"
        subtitle={
          data
            ? `${formatCount(data.stalledTotal)} deals idle 14+ days · ${formatCompactMoney(data.stalledValueCents)} at risk`
            : 'Open deals that have gone quiet'
        }
      />
      <div className="flex-1 p-2">
        {isPending || !data ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-11 w-full" />
            ))}
          </div>
        ) : data.stalled.length === 0 ? (
          <EmptyState
            icon={PartyPopper}
            title="Nothing is stuck"
            description="Every open deal has moved in the last two weeks."
          />
        ) : (
          <ul className="flex flex-col">
            {data.stalled.slice(0, 6).map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/leads${qs({ q: lead.name })}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{lead.name}</span>
                    <span className="tnum mt-0.5 flex items-center gap-1 text-2xs text-ink-subtle">
                      <Clock className="h-3 w-3" aria-hidden />
                      {lead.idleDays} days idle
                    </span>
                  </span>
                  <span className="tnum text-sm text-ink-muted">
                    {formatCompactMoney(lead.valueCents)}
                  </span>
                  <StagePill stage={lead.stage} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
