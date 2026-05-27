'use client'

import { useQuery } from '@tanstack/react-query'
import { TrendingDown, TrendingUp } from 'lucide-react'

import { RevenueChart, type RevenuePoint } from '@/components/charts/revenue-chart'
import { Badge, Card, CardHeader, Skeleton } from '@/components/ui'
import type { TimeseriesResult } from '@/db/queries/metrics'
import { linearRegression } from '@/lib/analytics/forecast'
import type { SeriesPoint } from '@/lib/analytics/series'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney } from '@/lib/money'

type Response = TimeseriesResult & {
  forecast: Array<SeriesPoint & { forecast: boolean }> | null
}

export function RevenueCard({ days }: { days: number }) {
  const granularity = days > 120 ? 'week' : 'day'
  const horizon = granularity === 'week' ? 6 : 14

  const { data, isPending } = useQuery({
    queryKey: ['metrics', 'revenue-chart', days, granularity],
    queryFn: () =>
      api.get<Response>(
        `/api/metrics/timeseries${qs({ days, granularity, forecast: horizon })}`,
      ),
  })

  const points: RevenuePoint[] =
    data?.forecast?.map((point) => ({
      date: point.date,
      value: point.value,
      forecast: point.forecast,
    })) ?? []

  const historical = data?.wonRevenue.map((point) => point.value) ?? []
  const trend = linearRegression(historical)
  const rising = trend.slope >= 0
  const total = historical.reduce((sum, value) => sum + value, 0)

  // Daily revenue is lumpy — a handful of deals a day — so R² is usually low.
  // Say so plainly rather than presenting a weak fit as a forecast.
  const fit =
    trend.r2 >= 0.5 ? 'strong' : trend.r2 >= 0.15 ? 'moderate' : 'noisy'

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Revenue"
        subtitle={`Closed won over the last ${days} days, projected ${horizon} ${granularity}s ahead`}
        action={
          <Badge tone={rising ? 'positive' : 'negative'}>
            {rising ? (
              <TrendingUp className="h-3 w-3" aria-hidden />
            ) : (
              <TrendingDown className="h-3 w-3" aria-hidden />
            )}
            {rising ? 'Trending up' : 'Trending down'}
          </Badge>
        }
      />
      <div className="px-5 pb-2 pt-4">
        <p className="tnum text-3xl font-semibold leading-none text-ink">
          {formatCompactMoney(total)}
        </p>
        <p className="mt-1.5 text-sm text-ink-muted">
          Trend fit R² {trend.r2.toFixed(2)} ({fit}) · dashed line is the projection
        </p>
      </div>
      <div className="px-2 pb-4">
        {isPending ? (
          <Skeleton className="mx-3 h-[300px]" />
        ) : (
          <RevenueChart points={points} />
        )}
      </div>
    </Card>
  )
}
