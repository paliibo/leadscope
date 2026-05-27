'use client'

import { ConnectionBadge } from '@/components/layout/connection-badge'
import { LiveTicker } from '@/components/layout/live-ticker'
import { useLive } from '@/components/providers/live-provider'
import { Card, CardHeader } from '@/components/ui'
import { formatCompactMoney, formatCount } from '@/lib/money'

export function ActivityCard() {
  const { pulse } = useLive()

  return (
    <Card className="flex h-full flex-col">
      <CardHeader
        title="Live activity"
        subtitle="Streaming straight off the pipeline"
        action={<ConnectionBadge />}
      />

      <dl className="grid grid-cols-3 divide-x divide-line border-b border-line">
        <div className="px-4 py-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-subtle">Open</dt>
          <dd className="tnum mt-1 text-lg font-semibold text-ink">
            {pulse ? formatCount(pulse.openLeads) : '—'}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-subtle">Pipeline</dt>
          <dd className="tnum mt-1 text-lg font-semibold text-ink">
            {pulse ? formatCompactMoney(pulse.pipelineCents) : '—'}
          </dd>
        </div>
        <div className="px-4 py-3">
          <dt className="text-2xs uppercase tracking-wide text-ink-subtle">Won today</dt>
          <dd className="tnum mt-1 text-lg font-semibold text-positive">
            {pulse ? formatCompactMoney(pulse.wonTodayCents) : '—'}
          </dd>
        </div>
      </dl>

      <div className="flex-1 overflow-y-auto px-5 py-2">
        <LiveTicker limit={14} />
      </div>
    </Card>
  )
}
