import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

import type { HTMLAttributes } from 'react'

const badge = cva(
  'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-2xs font-medium uppercase tracking-wide',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-muted text-ink-muted',
        brand: 'bg-brand-soft/70 text-brand-ink',
        positive: 'bg-positive/10 text-positive',
        negative: 'bg-negative/10 text-negative',
        warning: 'bg-warning/10 text-warning',
        violet: 'bg-violet/10 text-violet',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badge> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)} {...props} />
}
