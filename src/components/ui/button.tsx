'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

import type { ButtonHTMLAttributes } from 'react'

const button = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-medium transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-white hover:bg-brand/90',
        secondary: 'border border-line bg-surface text-ink hover:bg-surface-muted',
        ghost: 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        subtle: 'bg-brand-soft/60 text-brand-ink hover:bg-brand-soft',
        danger: 'bg-negative text-white hover:bg-negative/90',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-5 text-base',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
