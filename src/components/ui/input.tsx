'use client'

import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

import type { InputHTMLAttributes, ReactNode } from 'react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  /** Rendered at the trailing edge — a clear button, a shortcut hint, a unit. */
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, trailing, ...props }, ref) => (
    <div className="relative flex w-full items-center">
      {icon ? (
        <span className="pointer-events-none absolute left-3 flex text-ink-subtle">
          {icon}
        </span>
      ) : null}
      <input
        ref={ref}
        className={cn(
          'h-10 w-full rounded-pill border border-line bg-surface text-sm text-ink placeholder:text-ink-subtle',
          'transition-colors focus:border-brand/60 focus:outline-none focus-visible:outline-none',
          icon ? 'pl-9' : 'pl-4',
          trailing ? 'pr-10' : 'pr-4',
          className,
        )}
        {...props}
      />
      {trailing ? <span className="absolute right-3 flex">{trailing}</span> : null}
    </div>
  ),
)

Input.displayName = 'Input'
