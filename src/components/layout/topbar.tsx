'use client'

import { Menu, Search } from 'lucide-react'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui'

import { ConnectionBadge } from './connection-badge'
import { NAV_ITEMS, activeHref } from './nav'
import { ThemeToggle } from './theme-toggle'

export function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
  const pathname = usePathname()
  const current = NAV_ITEMS.find((item) => item.href === activeHref(pathname))

  function openPalette() {
    // Reuse the palette's own shortcut handler rather than lifting its state.
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }),
    )
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-canvas/85 px-4 py-3 backdrop-blur lg:px-8">
      <Button
        variant="ghost"
        size="icon"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold text-ink">
          {current?.label ?? 'Leadscope'}
        </h1>
        <p className="hidden truncate text-xs text-ink-muted sm:block">
          {current?.description}
        </p>
      </div>

      <button
        type="button"
        onClick={openPalette}
        className="hidden items-center gap-2 rounded-pill border border-line bg-surface px-3 py-1.5 text-sm text-ink-subtle transition-colors hover:text-ink md:flex"
      >
        <Search className="h-3.5 w-3.5" aria-hidden />
        Search
        <kbd className="rounded border border-line px-1 font-mono text-2xs">⌘K</kbd>
      </button>

      <ConnectionBadge className="hidden sm:inline-flex" />
      <ThemeToggle />
    </header>
  )
}
