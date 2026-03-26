'use client'

import { useState } from 'react'

import { ChannelCard, IndustryCard } from '@/components/analytics/channel-card'
import { VelocityCard } from '@/components/analytics/velocity-card'
import { FunnelCard } from '@/components/overview/funnel-card'
import { Segmented } from '@/components/ui'

const RANGES = [
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '180', label: '6m' },
  { value: '365', label: '1y' },
] as const

export default function AnalyticsPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]['value']>('90')
  const days = Number(range)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          Where deals come from, where they stall, and how long they take.
        </p>
        <Segmented name="Time range" options={RANGES} value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FunnelCard days={days} />
        <VelocityCard days={days} />
        <ChannelCard days={days} />
        <IndustryCard />
      </div>
    </div>
  )
}
