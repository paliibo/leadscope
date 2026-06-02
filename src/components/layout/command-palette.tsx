'use client'

import { useQuery } from '@tanstack/react-query'
import { Command } from 'cmdk'
import { Moon, Search, Sun } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { StagePill } from '@/components/ui'
import type { LeadPage } from '@/db/queries/leads'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { api, qs } from '@/lib/api/client'
import { formatCompactMoney } from '@/lib/money'

import { NAV_ITEMS } from './nav'

interface CommandPaletteControls {
  open: () => void
  close: () => void
  toggle: () => void
}

const ControlsContext = createContext<CommandPaletteControls | null>(null)

/**
 * Lets anything in the tree open the palette — the topbar's Search button, an
 * empty state, a keyboard hint. Previously the button faked a ⌘K KeyboardEvent
 * at the document, which is unreadable and stops working the moment the browser
 * or the OS claims that chord.
 */
export function useCommandPalette(): CommandPaletteControls {
  const controls = useContext(ControlsContext)
  if (!controls) {
    throw new Error('useCommandPalette must be used inside <CommandPalette>')
  }
  return controls
}

/**
 * Command palette (⌘K / Ctrl-K).
 *
 * Lead search hits the API with a debounce; navigation and theme actions are
 * local. `shouldFilter` is off for the whole list because the server has already
 * filtered the lead results — re-filtering them client-side would hide matches
 * that matched on a field the label doesn't show.
 */
export function CommandPalette({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query, 220)
  const router = useRouter()
  const { setTheme } = useTheme()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((previous) => !previous)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const { data, isFetching } = useQuery({
    queryKey: ['command-search', debounced],
    queryFn: () =>
      api.get<LeadPage>(
        `/api/leads${qs({ q: debounced, pageSize: 6, sort: 'score', dir: 'desc' })}`,
      ),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 15_000,
  })

  const run = useCallback((action: () => void) => {
    setOpen(false)
    setQuery('')
    action()
  }, [])

  const controls = useMemo<CommandPaletteControls>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((previous) => !previous),
    }),
    [],
  )

  return (
    <ControlsContext.Provider value={controls}>
      {children}
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Command palette"
        shouldFilter={false}
        className="fixed inset-0 z-50"
      >
        <div
          className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div className="absolute left-1/2 top-24 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 overflow-hidden rounded-card border border-line bg-surface shadow-lifted">
          <div className="flex items-center gap-2 border-b border-line px-4">
            <Search className="h-4 w-4 text-ink-subtle" aria-hidden />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search leads, jump to a page…"
              className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle"
            />
            <kbd className="rounded border border-line px-1.5 py-0.5 font-mono text-2xs text-ink-subtle">
              esc
            </kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="px-3 py-8 text-center text-sm text-ink-muted">
              {isFetching ? 'Searching…' : 'Nothing found.'}
            </Command.Empty>

            {(data?.items.length ?? 0) > 0 ? (
              <Command.Group
                heading="Leads"
                className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-subtle"
              >
                {data?.items.map((lead) => (
                  <Command.Item
                    key={lead.id}
                    value={lead.id}
                    onSelect={() =>
                      run(() =>
                        router.push(`/leads?q=${encodeURIComponent(lead.name)}`),
                      )
                    }
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-muted"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      {lead.name}
                      <span className="text-ink-subtle"> · {lead.accountName}</span>
                    </span>
                    <span className="tnum text-2xs text-ink-muted">
                      {formatCompactMoney(lead.valueCents)}
                    </span>
                    <StagePill stage={lead.stage} />
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Go to"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-subtle"
            >
              {NAV_ITEMS.filter(
                (item) =>
                  debounced.trim().length < 2 ||
                  item.label.toLowerCase().includes(debounced.toLowerCase()),
              ).map((item) => {
                const Icon = item.icon
                return (
                  <Command.Item
                    key={item.href}
                    value={`nav-${item.href}`}
                    onSelect={() => run(() => router.push(item.href))}
                    className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-muted"
                  >
                    <Icon className="h-4 w-4 text-ink-subtle" aria-hidden />
                    <span className="flex-1">{item.label}</span>
                    <span className="text-2xs text-ink-subtle">{item.description}</span>
                  </Command.Item>
                )
              })}
            </Command.Group>

            <Command.Group
              heading="Theme"
              className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-2xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-ink-subtle"
            >
              <Command.Item
                value="theme-light"
                onSelect={() => run(() => setTheme('light'))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-muted"
              >
                <Sun className="h-4 w-4 text-ink-subtle" aria-hidden /> Light theme
              </Command.Item>
              <Command.Item
                value="theme-dark"
                onSelect={() => run(() => setTheme('dark'))}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-ink data-[selected=true]:bg-surface-muted"
              >
                <Moon className="h-4 w-4 text-ink-subtle" aria-hidden /> Dark theme
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
      </Command.Dialog>
    </ControlsContext.Provider>
  )
}
