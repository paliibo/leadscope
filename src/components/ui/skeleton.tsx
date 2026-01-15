import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

/** Repeats a skeleton row `count` times — the usual list placeholder. */
export function SkeletonRows({
  count = 5,
  className,
  rowClassName,
}: {
  count?: number
  className?: string
  rowClassName?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} className={cn('h-12 w-full', rowClassName)} />
      ))}
    </div>
  )
}
