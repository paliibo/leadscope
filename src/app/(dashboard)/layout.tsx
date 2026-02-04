import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/app-shell'
import { LiveProvider } from '@/components/providers/live-provider'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Middleware already redirects unauthenticated requests; this is the
  // belt-and-braces check that also narrows the type for everything below.
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <LiveProvider>
      <AppShell session={session}>{children}</AppShell>
    </LiveProvider>
  )
}
