import { cn } from '@/lib/utils'

import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-card', className)} {...props} />
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-4 border-b border-line px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="truncate text-base font-medium text-ink">{title}</h2>
        {subtitle ? (
          <p className="mt-1 truncate text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}
