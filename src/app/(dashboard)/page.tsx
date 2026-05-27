'use client'

import { useState } from 'react'

import { ActivityCard } from '@/components/overview/activity-card'
import { AttentionCard } from '@/components/overview/attention-card'
import { FunnelCard } from '@/components/overview/funnel-card'
import { KpiRow } from '@/components/overview/kpi-row'
import { RevenueCard } from '@/components/overview/revenue-card'
import { TopPerformersCard } from '@/components/overview/top-performers-card'
import { Segmented } from '@/components/ui'

const RANGES = [
  { value: '7', label: '7d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '180', label: '6m' },
] as const

export default function OverviewPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('30')
  const days = Number(range)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Everything below updates as deals move — no refresh needed.
        </p>
        <Segmented
          name="Time range"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>

      <KpiRow days={days} />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <RevenueCard days={days} />
        </div>
        <div className="min-h-[420px] xl:col-span-1">
          <ActivityCard />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <FunnelCard days={days} />
        <TopPerformersCard days={days} />
        <AttentionCard days={days} />
      </div>
    </div>
  )
}
