'use client'

import { useQuery } from '@tanstack/react-query'

import { BarChart } from '@/components/charts/bar-chart'
import { Card, CardHeader, Skeleton } from '@/components/ui'
import type { LeadStage } from '@/db/schema'
import { STAGE_LABELS } from '@/lib/analytics/funnel'
import type { CycleStats, StageDwell } from '@/lib/analytics/velocity'
import { api, qs } from '@/lib/api/client'

interface VelocityResponse {
  dwell: StageDwell[]
  cycle: CycleStats
  stalledTotal: number
}

const ORDER: LeadStage[] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation']

export function VelocityCard({ days }: { days: number }) {
  const { data, isPending } = useQuery({
    queryKey: ['metrics', 'velocity', days],
    queryFn: () => api.get<VelocityResponse>(`/api/metrics/velocity${qs({ days })}`),
  })

  // Present stages in pipeline order, not sorted by duration — the reader is
  // looking for *where* the delay is, and reordering the funnel hides that.
  const ordered = ORDER.map((stage) =>
    data?.dwell.find((row) => row.stage === stage),
  ).filter((row): row is StageDwell => Boolean(row))

  return (
    <Card>
      <CardHeader
        title="Time in stage"
        subtitle={
          data
            ? `Median sales cycle ${data.cycle.medianDays.toFixed(0)} days over ${data.cycle.samples} won deals`
            : 'How long deals sit before moving'
        }
      />
      <div className="p-5">
        {isPending || !data ? (
          <Skeleton className="h-60 w-full" />
        ) : (
          <>
            <BarChart
              labels={ordered.map((row) => STAGE_LABELS[row.stage])}
              values={ordered.map((row) => Number(row.medianDays.toFixed(1)))}
              formatValue={(value) => `${value} days`}
              height={220}
            />
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4">
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-subtle">
                  Fastest win
                </dt>
                <dd className="tnum mt-1 text-sm font-medium text-ink">
                  {data.cycle.fastestDays.toFixed(0)}d
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-subtle">
                  Average
                </dt>
                <dd className="tnum mt-1 text-sm font-medium text-ink">
                  {data.cycle.averageDays.toFixed(0)}d
                </dd>
              </div>
              <div>
                <dt className="text-2xs uppercase tracking-wide text-ink-subtle">
                  Slowest win
                </dt>
                <dd className="tnum mt-1 text-sm font-medium text-ink">
                  {data.cycle.slowestDays.toFixed(0)}d
                </dd>
              </div>
            </dl>
          </>
        )}
      </div>
    </Card>
  )
}
