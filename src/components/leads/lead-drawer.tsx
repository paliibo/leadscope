'use client'

import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useEffect } from 'react'

import { Avatar, Button, Progress, Skeleton, StagePill } from '@/components/ui'
import type { ActivityFeedItem } from '@/db/queries/activities'
import type { LeadWithRelations } from '@/db/queries/leads'
import { scoreLead } from '@/lib/analytics/scoring'
import { api, qs } from '@/lib/api/client'
import { formatMoney } from '@/lib/money'

const DAY = 86_400_000

/** Slide-over with the full record, its score breakdown and its history. */
export function LeadDrawer({
  lead,
  onClose,
}: {
  lead: LeadWithRelations | null
  onClose: () => void
}) {
  useEffect(() => {
    if (!lead) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [lead, onClose])

  const { data, isPending } = useQuery({
    queryKey: ['activity', 'lead', lead?.id],
    queryFn: () =>
      api.get<{ items: ActivityFeedItem[] }>(
        `/api/activity${qs({ leadId: lead?.id, limit: 30 })}`,
      ),
    enabled: Boolean(lead),
  })

  if (!lead) return null

  const touches = data?.items ?? []
  const lastTouch = touches[0]?.createdAt ?? new Date(lead.updatedAt).getTime()

  const score = scoreLead({
    source: lead.source,
    sizeBucket: lead.accountSizeBucket,
    valueCents: lead.valueCents,
    engagementCount: touches.filter((item) => item.type !== 'lead_created').length,
    daysSinceLastTouch: Math.max(0, Math.floor((Date.now() - lastTouch) / DAY)),
    hasMeeting: touches.some((item) => item.type === 'meeting_booked'),
  })

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <aside className="relative flex h-full w-full max-w-md animate-fade-up flex-col overflow-y-auto border-l border-line bg-surface">
        <header className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-surface px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-muted">
              {lead.title} · {lead.accountName}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </header>

        <div className="flex flex-col gap-6 px-5 py-5">
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Stage">
              <StagePill stage={lead.stage} />
            </Field>
            <Field label="Value">
              <span className="tnum text-sm font-medium text-ink">
                {formatMoney(lead.valueCents)}
              </span>
            </Field>
            <Field label="Source">
              <span className="text-sm capitalize text-ink">{lead.source}</span>
            </Field>
            <Field label="Owner">
              <span className="flex items-center gap-2 text-sm text-ink">
                <Avatar name={lead.ownerName} src={lead.ownerAvatarUrl} size="xs" />
                {lead.ownerName}
              </span>
            </Field>
            <Field label="Email">
              <a
                href={`mailto:${lead.email}`}
                title={lead.email}
                className="block truncate text-sm text-brand hover:underline"
              >
                {lead.email}
              </a>
            </Field>
            <Field label="Company size">
              <span className="text-sm text-ink">
                {lead.accountSizeBucket} · {lead.accountIndustry}
              </span>
            </Field>
          </dl>

          <section>
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-ink">Fit score</h3>
              <span className="tnum text-lg font-semibold text-ink">{score.score}/100</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {score.components.map((component) => (
                <li key={component.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-muted">{component.label}</span>
                    <span className="tnum text-ink-subtle">
                      {component.points}/{component.max}
                    </span>
                  </div>
                  <Progress
                    value={component.points / component.max}
                    label={component.label}
                    tone={component.points / component.max > 0.6 ? 'positive' : 'brand'}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-medium text-ink">History</h3>
            {isPending ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-9 w-full" />
                ))}
              </div>
            ) : (
              <ol className="relative flex flex-col gap-4 border-l border-line pl-4">
                {touches.map((item) => (
                  <li key={item.id} className="relative">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand"
                      aria-hidden
                    />
                    <p className="text-sm text-ink">{item.summary}</p>
                    <p className="mt-0.5 text-2xs text-ink-subtle">
                      {new Date(item.createdAt).toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </aside>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // min-w-0 so a long email truncates instead of blowing out the grid column.
    <div className="min-w-0">
      <dt className="mb-1 text-2xs uppercase tracking-wide text-ink-subtle">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}
