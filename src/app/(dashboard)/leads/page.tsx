import { LeadsTable } from '@/components/leads/leads-table'

export const metadata = { title: 'Leads' }
export const dynamic = 'force-dynamic'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <LeadsTable initialQuery={q ?? ''} />
}
