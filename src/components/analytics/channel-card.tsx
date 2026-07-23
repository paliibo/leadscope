'use client'

import { useQuery } from '@tanstack/react-query'

import { Card, CardHeader, Progress, Skeleton } from '@/components/ui'
import type { IndustryRow, SourceBreakdownRow } from '@/db/queries/metrics'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney, formatCount, formatPercent } from '@/lib/money'

interface ChannelResponse {
  sources: SourceBreakdownRow[]
  industries: IndustryRow[]
}

/**
 * Channel table sorted by revenue, with win rate alongside volume — the two
 * disagree constantly, and only showing volume is how teams end up over-invested
 * in a channel that never closes.
 */
export function ChannelCard({ days }: { days: number }) {
  const { data, isPending } = useQuery({
    queryKey: ['metrics', 'channels', days],
    queryFn: () => api.get<ChannelResponse>(`/api/metrics/channels${qs({ days })}`),
  })

  const best = Math.max(...(data?.sources.map((row) => row.wonCents) ?? [1]), 1)

  return (
    <Card>
      <CardHeader
        title="Channel performance"
        subtitle={`Leads created in the last ${days} days`}
      />
      <div className="p-5">
        {isPending || !data ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-2xs uppercase tracking-wide text-ink-subtle">
                <th scope="col" className="pb-2 font-medium">
                  Channel
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Leads
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Win rate
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {data.sources.map((row) => (
                <tr key={row.source} className="border-t border-line/60">
                  <td className="py-2.5 capitalize text-ink">
                    {row.source}
                    <Progress
                      value={row.wonCents / best}
                      className="mt-1.5 max-w-32"
                      tone="brand"
                    />
                  </td>
                  <td className="tnum py-2.5 text-right align-top text-ink-muted">
                    {formatCount(row.leads)}
                  </td>
                  <td className="tnum py-2.5 text-right align-top text-ink-muted">
                    {formatPercent(row.winRate, 0)}
                  </td>
                  <td className="tnum py-2.5 text-right align-top font-medium text-ink">
                    {formatCompactMoney(row.wonCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  )
}

export function IndustryCard() {
  const { data, isPending } = useQuery({
    queryKey: ['metrics', 'channels', 'industries'],
    queryFn: () => api.get<ChannelResponse>('/api/metrics/channels'),
  })

  const total = data?.industries.reduce((sum, row) => sum + row.pipelineCents, 0) ?? 0

  return (
    <Card>
      <CardHeader title="Open pipeline by industry" subtitle="Current, all stages" />
      <div className="flex flex-col gap-3 p-5">
        {isPending || !data
          ? Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))
          : data.industries.map((row) => (
              <div key={row.industry}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink">{row.industry}</span>
                  <span className="tnum text-ink-muted">
                    {formatCompactMoney(row.pipelineCents)}
                    <span className="ml-2 text-2xs text-ink-subtle">
                      {formatCount(row.leads)} deals
                    </span>
                  </span>
                </div>
                <Progress value={total > 0 ? row.pipelineCents / total : 0} />
              </div>
            ))}
      </div>
    </Card>
  )
}
