import { Card, Skeleton } from '@/components/ui'

/**
 * Streaming placeholder shown while a dashboard route's server components
 * resolve. Mirrors the real layout so the page does not reflow when it lands.
 */
export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-72" />
        <Skeleton className="h-8 w-48 rounded-pill" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="flex flex-col gap-3 p-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-96 rounded-card xl:col-span-2" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  )
}
