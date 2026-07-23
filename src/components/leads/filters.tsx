'use client'

import { Search, X } from 'lucide-react'

import { Badge, Button, Input } from '@/components/ui'
import { LEAD_SOURCES, LEAD_STAGES, type LeadSource, type LeadStage } from '@/db/schema'
import { STAGE_LABELS } from '@/lib/analytics/funnel'
import { cn } from '@/lib/utils'

export interface LeadFilters {
  q: string
  stage: LeadStage[]
  source: LeadSource[]
}

export function LeadFiltersBar({
  filters,
  onChange,
  total,
}: {
  filters: LeadFilters
  onChange: (next: LeadFilters) => void
  total: number | null
}) {
  const active = filters.stage.length + filters.source.length + (filters.q ? 1 : 0)

  function toggle<T extends string>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((entry) => entry !== value)
      : [...list, value]
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <Input
            value={filters.q}
            onChange={(event) => onChange({ ...filters, q: event.target.value })}
            placeholder="Search name, email, company or title…"
            icon={<Search className="h-4 w-4" aria-hidden />}
            aria-label="Search leads"
            trailing={
              filters.q ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, q: '' })}
                  aria-label="Clear search"
                  className="text-ink-subtle hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : null
            }
          />
        </div>

        <span className="tnum whitespace-nowrap text-sm text-ink-muted">
          {total === null ? '—' : `${total.toLocaleString('en-US')} leads`}
        </span>

        {active > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ q: '', stage: [], source: [] })}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {LEAD_STAGES.map((stage) => {
          const on = filters.stage.includes(stage)
          return (
            <button
              key={stage}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange({ ...filters, stage: toggle(filters.stage, stage) })
              }
              className={cn(
                'rounded-pill border px-2.5 py-1 text-xs transition-colors',
                on
                  ? 'border-brand bg-brand-soft/60 text-brand-ink'
                  : 'border-line text-ink-muted hover:text-ink',
              )}
            >
              {STAGE_LABELS[stage]}
            </button>
          )
        })}

        <span className="mx-1 h-4 w-px bg-line" aria-hidden />

        {LEAD_SOURCES.map((source) => {
          const on = filters.source.includes(source)
          return (
            <button
              key={source}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange({ ...filters, source: toggle(filters.source, source) })
              }
              className="rounded-pill"
            >
              <Badge tone={on ? 'violet' : 'neutral'}>{source}</Badge>
            </button>
          )
        })}
      </div>
    </div>
  )
}
