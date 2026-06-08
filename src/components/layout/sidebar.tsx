'use client'

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Avatar } from '@/components/ui'
import { api } from '@/lib/api/client'
import type { SessionPayload } from '@/lib/auth/session'
import { cn } from '@/lib/utils'

import { NAV_ITEMS, activeHref } from './nav'

export function Sidebar({
  session,
  onNavigate,
  className,
}: {
  session: SessionPayload
  onNavigate?: () => void
  className?: string
}) {
  const pathname = usePathname()
  const active = activeHref(pathname)

  async function signOut() {
    await api.post('/api/auth/logout')
    // Full document load for the same reason as sign-in: the session cookie
    // changes what every server component renders, and a client transition
    // races the router cache.
    window.location.replace('/login')
  }

  return (
    <nav
      className={cn(
        'flex h-full w-60 shrink-0 flex-col gap-6 border-r border-line bg-surface px-3 py-5',
        className,
      )}
      aria-label="Main"
    >
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 px-2"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-brand text-sm font-semibold text-white">
          L
        </span>
        <span className="wordmark text-lg text-ink">Leadscope</span>
      </Link>

      <ul className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = active === item.href
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-brand-soft/60 font-medium text-brand-ink'
                    : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                <kbd
                  // Decorative: without this the link's accessible name becomes
                  // "Leads g l", which is what a screen reader would announce.
                  aria-hidden
                  className={cn(
                    'hidden font-mono text-2xs text-ink-subtle lg:block',
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                >
                  g {item.shortcut}
                </kbd>
              </Link>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-2">
        <Avatar name={session.name} src={session.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{session.name}</p>
          <p className="truncate text-2xs capitalize text-ink-subtle">{session.role}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          title="Sign out"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </nav>
  )
}
