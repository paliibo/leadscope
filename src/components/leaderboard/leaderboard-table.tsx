'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Crown, Minus, Search } from 'lucide-react'
import { useState } from 'react'

import {
  Avatar,
  Badge,
  Card,
  Input,
  Progress,
  ProgressRing,
  Segmented,
  Skeleton,
} from '@/components/ui'
import type { LeaderboardResult } from '@/db/queries/leaderboard'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { LeaderboardMetric } from '@/lib/analytics/leaderboard'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney, formatCount, formatPercent } from '@/lib/money'
import { cn } from '@/lib/utils'

const METRICS = [
  { value: 'revenue', label: 'Revenue' },
  { value: 'wins', label: 'Deals' },
  { value: 'quota', label: 'Quota' },
  { value: 'touches', label: 'Activity' },
] as const

const RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
] as const

/** Podium colours for the top three; everyone else gets a plain number. */
const MEDALS = ['text-warning', 'text-ink-subtle', 'text-[#b87333]'] as const

export function LeaderboardTable() {
  const [metric, setMetric] = useState<LeaderboardMetric>('revenue')
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('30')
  const [search, setSearch] = useState('')
  const debounced = useDebouncedValue(search, 250)

  const days = Number(range)

  const { data, isPending } = useQuery({
    queryKey: ['leaderboard', days, metric, debounced],
    queryFn: () =>
      api.get<LeaderboardResult>(
        `/api/leaderboard${qs({ days, metric, limit: 25, q: debounced })}`,
      ),
    placeholderData: keepPreviousData,
  })

  function metricValue(row: LeaderboardResult['rows'][number]): string {
    switch (metric) {
      case 'revenue':
        return formatCompactMoney(row.revenueCents)
      case 'wins':
        return formatCount(row.wins)
      case 'touches':
        return formatCount(row.touches)
      case 'leads':
        return formatCount(row.leadsWorked)
      case 'quota':
        return row.attainment === null ? '—' : formatPercent(row.attainment, 0)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          name="Metric"
          options={METRICS}
          value={metric}
          onChange={(value) => setMetric(value as LeaderboardMetric)}
        />
        <Segmented
          name="Time range"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
        <div className="ml-auto w-56">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a rep…"
            aria-label="Search reps"
            icon={<Search className="h-4 w-4" aria-hidden />}
          />
        </div>
      </div>

      <Card className="overflow-hidden">
        {isPending || !data ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 8 }, (_, index) => (
              <Skeleton key={index} className="h-14 w-full" />
            ))}
          </div>
        ) : (
          <ol>
            {data.rows.map((row, index) => (
              <li
                key={row.repId}
                className={cn(
                  'flex items-center gap-4 border-b border-line/60 px-4 py-3 transition-colors last:border-0 hover:bg-surface-muted',
                  index < 3 && 'bg-gradient-brand-soft',
                )}
              >
                <span className="flex w-8 shrink-0 items-center justify-center">
                  {row.rank <= 3 ? (
                    <Crown
                      className={cn('h-4 w-4', MEDALS[row.rank - 1])}
                      aria-label={`Rank ${row.rank}`}
                    />
                  ) : (
                    <span className="tnum text-sm text-ink-subtle">{row.rank}</span>
                  )}
                </span>

                <Avatar name={row.name} src={row.avatarUrl} size="md" />

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
                    {row.name}
                    {row.team ? <Badge tone="neutral">{row.team}</Badge> : null}
                  </p>
                  <p className="truncate text-2xs text-ink-subtle">{row.jobTitle}</p>
                  <Progress value={row.shareOfLeader} className="mt-2 max-w-64" />
                </div>

                <div className="hidden text-right sm:block">
                  <p className="tnum text-sm text-ink-muted">
                    {formatCount(row.wins)} won
                  </p>
                  <p className="tnum text-2xs text-ink-subtle">
                    {formatCount(row.touches)} touches
                  </p>
                </div>

                {row.attainment !== null ? (
                  <ProgressRing value={row.attainment} size={44} strokeWidth={4}>
                    <span className="tnum text-2xs font-medium text-ink">
                      {Math.round(row.attainment * 100)}%
                    </span>
                  </ProgressRing>
                ) : null}

                <div className="w-24 shrink-0 text-right">
                  <p className="tnum text-base font-semibold text-ink">
                    {metricValue(row)}
                  </p>
                  <RankMovement delta={row.rankDelta} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <p className="text-xs text-ink-subtle">
        Ties share a rank (1, 2, 2, 4). Movement compares against the{' '}
        {data?.windowDays ?? days} days before this window.
      </p>
    </div>
  )
}

function RankMovement({ delta }: { delta: number | null }) {
  if (delta === null) return <span className="text-2xs text-ink-subtle">unranked</span>
  if (delta === 0) {
    return (
      <span className="flex items-center justify-end gap-0.5 text-2xs text-ink-subtle">
        <Minus className="h-2.5 w-2.5" aria-hidden /> no change
      </span>
    )
  }
  const up = delta > 0
  return (
    <span
      className={cn(
        'tnum flex items-center justify-end gap-0.5 text-2xs font-medium',
        up ? 'text-positive' : 'text-negative',
      )}
    >
      {up ? (
        <ArrowUp className="h-2.5 w-2.5" aria-hidden />
      ) : (
        <ArrowDown className="h-2.5 w-2.5" aria-hidden />
      )}
      {Math.abs(delta)} {up ? 'up' : 'down'}
    </span>
  )
}
