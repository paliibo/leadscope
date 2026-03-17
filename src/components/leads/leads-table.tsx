'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Download, Inbox } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Skeleton,
  StagePill,
} from '@/components/ui'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { api, qs } from '@/lib/api/client'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

import { LeadFiltersBar, type LeadFilters } from './filters'
import { LeadDrawer } from './lead-drawer'

import type { LeadPage, LeadWithRelations } from '@/db/queries/leads'

type SortKey = 'updatedAt' | 'createdAt' | 'value' | 'score' | 'name'

const COLUMNS: Array<{ key: SortKey | null; label: string; className?: string }> = [
  { key: 'name', label: 'Lead' },
  { key: null, label: 'Company', className: 'hidden lg:table-cell' },
  { key: null, label: 'Owner', className: 'hidden xl:table-cell' },
  { key: null, label: 'Stage' },
  { key: 'value', label: 'Value', className: 'text-right' },
  { key: 'score', label: 'Score', className: 'text-right hidden sm:table-cell' },
  { key: 'updatedAt', label: 'Updated', className: 'text-right hidden md:table-cell' },
]

export function LeadsTable({ initialQuery = '' }: { initialQuery?: string }) {
  const router = useRouter()
  const [filters, setFilters] = useState<LeadFilters>({
    q: initialQuery,
    stage: [],
    source: [],
  })
  const [sort, setSort] = useState<SortKey>('updatedAt')
  const [dir, setDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<LeadWithRelations | null>(null)

  const debouncedQuery = useDebouncedValue(filters.q, 250)

  // Any filter change invalidates the current page number.
  useEffect(() => {
    setPage(1)
  }, [debouncedQuery, filters.stage, filters.source, sort, dir])

  const params = useMemo(
    () => ({
      q: debouncedQuery,
      stage: filters.stage.join(','),
      source: filters.source.join(','),
      sort,
      dir,
      page,
      pageSize: 25,
    }),
    [debouncedQuery, filters.stage, filters.source, sort, dir, page],
  )

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['leads', params],
    queryFn: () => api.get<LeadPage>(`/api/leads${qs(params)}`),
    // Keeps the previous page on screen while the next one loads, instead of
    // collapsing the table to a spinner on every keystroke.
    placeholderData: keepPreviousData,
  })

  function toggleSort(key: SortKey) {
    if (sort === key) {
      setDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(key)
      setDir('desc')
    }
  }

  function exportCsv() {
    // A plain navigation, so the browser handles Content-Disposition itself.
    router.push(`/api/leads/export${qs({ ...params, page: undefined, pageSize: undefined })}`)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-72 flex-1">
          <LeadFiltersBar
            filters={filters}
            onChange={setFilters}
            total={data?.total ?? null}
          />
        </div>
        <Button variant="secondary" onClick={exportCsv}>
          <Download className="h-4 w-4" aria-hidden />
          Export CSV
        </Button>
      </div>

      <Card className={cn('overflow-hidden transition-opacity', isFetching && 'opacity-70')}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                {COLUMNS.map((column) => (
                  <th
                    key={column.label}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-2xs font-medium uppercase tracking-wide text-ink-subtle',
                      column.className,
                    )}
                    aria-sort={
                      column.key && sort === column.key
                        ? dir === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                  >
                    {column.key ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key as SortKey)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {column.label}
                        {sort === column.key ? (
                          dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isPending
                ? Array.from({ length: 10 }, (_, index) => (
                    <tr key={index} className="border-b border-line/60">
                      <td colSpan={COLUMNS.length} className="px-4 py-3">
                        <Skeleton className="h-6 w-full" />
                      </td>
                    </tr>
                  ))
                : data?.items.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelected(lead)}
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') setSelected(lead)
                      }}
                      className="cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-surface-muted"
                    >
                      <td className="px-4 py-3">
                        <span className="block max-w-48 truncate font-medium text-ink">
                          {lead.name}
                        </span>
                        <span className="block max-w-48 truncate text-2xs text-ink-subtle">
                          {lead.title}
                        </span>
                      </td>
                      <td className="hidden max-w-44 truncate px-4 py-3 text-ink-muted lg:table-cell">
                        {lead.accountName}
                      </td>
                      <td className="hidden px-4 py-3 xl:table-cell">
                        <span className="flex items-center gap-2 text-ink-muted">
                          <Avatar
                            name={lead.ownerName}
                            src={lead.ownerAvatarUrl}
                            size="xs"
                          />
                          <span className="max-w-32 truncate">{lead.ownerName}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StagePill stage={lead.stage} />
                      </td>
                      <td className="tnum px-4 py-3 text-right font-medium text-ink">
                        {formatMoney(lead.valueCents)}
                      </td>
                      <td className="tnum hidden px-4 py-3 text-right text-ink-muted sm:table-cell">
                        {lead.score}
                      </td>
                      <td className="tnum hidden whitespace-nowrap px-4 py-3 text-right text-ink-subtle md:table-cell">
                        {new Date(lead.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isPending && data?.items.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No leads match those filters"
            description="Try widening the stage or source selection, or clearing the search."
          />
        ) : null}
      </Card>

      {data && data.pageCount > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <p className="tnum text-sm text-ink-muted">
            Page {data.page} of {data.pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={data.page >= data.pageCount}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      <LeadDrawer lead={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
