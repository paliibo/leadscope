import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted text-ink-subtle">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
