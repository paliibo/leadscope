'use client'

import { useQuery } from '@tanstack/react-query'
import { CircleDollarSign, Percent, Target, Users } from 'lucide-react'

import { Card, Skeleton, StatTile } from '@/components/ui'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney, formatCount, formatPercent } from '@/lib/money'

import type { OverviewMetrics } from '@/db/queries/metrics'
import type { TimeseriesResult } from '@/db/queries/metrics'

export function KpiRow({ days }: { days: number }) {
  const metrics = useQuery({
    queryKey: ['metrics', 'overview', days],
    queryFn: () => api.get<OverviewMetrics>(`/api/metrics/overview${qs({ days })}`),
  })

  const series = useQuery({
    queryKey: ['metrics', 'timeseries', days, 'day'],
    queryFn: () =>
      api.get<TimeseriesResult>(`/api/metrics/timeseries${qs({ days, granularity: 'day' })}`),
  })

  if (metrics.isPending || !metrics.data) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    )
  }

  const data = metrics.data
  const revenueSeries = series.data?.wonRevenue.map((point) => point.value) ?? []
  const leadSeries = series.data?.newLeads.map((point) => point.value) ?? []
  const touchSeries = series.data?.touches.map((point) => point.value) ?? []

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatTile
        label="Closed won"
        value={formatCompactMoney(data.wonRevenue.current)}
        change={data.wonRevenue.change}
        icon={CircleDollarSign}
        series={revenueSeries}
        tone="positive"
      />
      <StatTile
        label="Open pipeline"
        value={formatCompactMoney(data.pipelineCents)}
        icon={Target}
        footnote={`${formatCount(data.openLeads)} live deals`}
      />
      <StatTile
        label="New leads"
        value={formatCount(data.newLeads.current)}
        change={data.newLeads.change}
        icon={Users}
        series={leadSeries}
        tone="brand"
      />
      <StatTile
        label="Win rate"
        value={formatPercent(data.winRate, 0)}
        icon={Percent}
        series={touchSeries}
        tone="muted"
        footnote={`Avg deal ${formatCompactMoney(data.averageDealCents)}`}
      />
    </div>
  )
}
