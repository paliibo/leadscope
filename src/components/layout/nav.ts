import {
  BarChart3,
  KanbanSquare,
  LayoutDashboard,
  Trophy,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  description: string
  /** Single-key shortcut, pressed after `g`. */
  shortcut: string
}

export const NAV_ITEMS: readonly NavItem[] = [
  {
    href: '/',
    label: 'Overview',
    icon: LayoutDashboard,
    description: 'Headline numbers and the live feed',
    shortcut: 'o',
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    icon: KanbanSquare,
    description: 'Drag deals between stages',
    shortcut: 'p',
  },
  {
    href: '/leads',
    label: 'Leads',
    icon: Users,
    description: 'Search, filter and export the book',
    shortcut: 'l',
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    description: 'Team ranking and quota attainment',
    shortcut: 'b',
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    description: 'Funnel, velocity and channel mix',
    shortcut: 'a',
  },
]

/** Longest matching nav href, so /leads/123 still highlights /leads. */
export function activeHref(pathname: string): string {
  const matches = NAV_ITEMS.filter(
    (item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)),
  )
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? '/'
}
