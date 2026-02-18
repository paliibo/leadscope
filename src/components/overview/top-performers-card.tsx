'use client'

import { useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import Link from 'next/link'

import { Avatar, Card, CardHeader, Progress, Skeleton } from '@/components/ui'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

import type { LeaderboardResult } from '@/db/queries/leaderboard'

export function TopPerformersCard({ days }: { days: number }) {
  const { data, isPending } = useQuery({
    queryKey: ['leaderboard', days, 'revenue', 5],
    queryFn: () =>
      api.get<LeaderboardResult>(
        `/api/leaderboard${qs({ days, metric: 'revenue', limit: 5 })}`,
      ),
  })

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Top performers"
        subtitle={`Closed won, last ${days} days`}
        action={
          <Link href="/leaderboard" className="text-xs font-medium text-brand hover:underline">
            View all
          </Link>
        }
      />
      <div className="flex-1 p-2">
        {isPending || !data ? (
          <div className="flex flex-col gap-2 p-3">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <ol className="flex flex-col">
            {data.rows.map((rep) => (
              <li
                key={rep.repId}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
              >
                <span className="tnum w-4 text-center text-sm font-medium text-ink-subtle">
                  {rep.rank}
                </span>
                <Avatar name={rep.name} src={rep.avatarUrl} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{rep.name}</span>
                  <Progress value={rep.shareOfLeader} className="mt-1.5 h-1" />
                </span>
                <span className="text-right">
                  <span className="tnum block text-sm font-medium text-ink">
                    {formatCompactMoney(rep.revenueCents)}
                  </span>
                  <RankDelta delta={rep.rankDelta} />
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  )
}

function RankDelta({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-2xs text-ink-subtle">new</span>
  }
  if (delta === 0) {
    return (
      <span className="flex items-center justify-end gap-0.5 text-2xs text-ink-subtle">
        <Minus className="h-2.5 w-2.5" aria-hidden /> held
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
      {Math.abs(delta)}
    </span>
  )
}
