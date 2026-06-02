'use client'

import { X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui'
import type { SessionPayload } from '@/lib/auth/session'

import { CommandPalette } from './command-palette'
import { NAV_ITEMS } from './nav'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'

/**
 * Two-column app shell. The sidebar is fixed on desktop and a dismissible
 * overlay below `lg`, which is also where `g`-prefixed navigation shortcuts live.
 */
export function AppShell({
  session,
  children,
}: {
  session: SessionPayload
  children: ReactNode
}) {
  const [navOpen, setNavOpen] = useState(false)
  const router = useRouter()

  // Vim-style `g` then a key. Ignored while typing so it can't hijack a form.
  useEffect(() => {
    let awaitingSecondKey = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        target?.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
      ) {
        return
      }

      if (awaitingSecondKey) {
        const match = NAV_ITEMS.find((item) => item.shortcut === event.key)
        awaitingSecondKey = false
        if (timer) clearTimeout(timer)
        if (match) {
          event.preventDefault()
          router.push(match.href)
        }
        return
      }

      if (event.key === 'g') {
        awaitingSecondKey = true
        timer = setTimeout(() => {
          awaitingSecondKey = false
        }, 1200)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (timer) clearTimeout(timer)
    }
  }, [router])

  return (
    <CommandPalette>
      <div className="flex min-h-dvh bg-canvas">
        <Sidebar session={session} className="hidden lg:flex" />

        {navOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/40"
              onClick={() => setNavOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 animate-fade-up">
              <Sidebar session={session} onNavigate={() => setNavOpen(false)} />
            </div>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Close navigation"
              onClick={() => setNavOpen(false)}
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onOpenNav={() => setNavOpen(true)} />
          <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
        </div>
      </div>
    </CommandPalette>
  )
}
