'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'

import { Card, CardHeader, Skeleton } from '@/components/ui'
import type { FunnelRow } from '@/lib/analytics/funnel'
import type { WinRate } from '@/lib/analytics/funnel'
import { api, qs } from '@/lib/api/client'
import { formatCount, formatPercent } from '@/lib/money'
import { cn } from '@/lib/utils'

interface FunnelResponse {
  rows: FunnelRow[]
  leak: FunnelRow | null
  winRate: WinRate
}

export function FunnelCard({ days }: { days: number }) {
  const { data, isPending } = useQuery({
    queryKey: ['funnel', days],
    queryFn: () => api.get<FunnelResponse>(`/api/metrics/funnel${qs({ days })}`),
  })

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Conversion funnel"
        subtitle={`Leads created in the last ${days} days`}
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        {isPending || !data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : (
          <>
            <ol className="flex flex-col gap-2">
              {data.rows.map((row, index) => {
                const width = Math.max(row.conversionFromTop * 100, 4)
                const isLeak = data.leak?.stage === row.stage
                return (
                  <li key={row.stage} className="group">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 text-ink">
                        {row.label}
                        {isLeak ? (
                          <AlertTriangle
                            className="h-3 w-3 text-warning"
                            aria-label="Largest drop-off"
                          />
                        ) : null}
                      </span>
                      <span className="tnum text-ink-muted">
                        {formatCount(row.count)}
                        {index > 0 ? (
                          <span
                            className={cn(
                              'ml-2 text-xs',
                              row.conversionFromPrevious < 0.5
                                ? 'text-negative'
                                : 'text-ink-subtle',
                            )}
                          >
                            {formatPercent(row.conversionFromPrevious, 0)}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-pill bg-surface-muted">
                      <div
                        className="h-full rounded-pill bg-gradient-brand transition-[width] duration-700"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </li>
                )
              })}
            </ol>

            {data.leak ? (
              <p className="mt-auto rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
                Biggest drop-off is into <strong>{data.leak.label}</strong> —{' '}
                {formatCount(data.leak.droppedOff)} leads never made it.
              </p>
            ) : null}
          </>
        )}
      </div>
    </Card>
  )
}
