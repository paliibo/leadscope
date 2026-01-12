'use client'

import { useState } from 'react'

import { cn, hueFromString, initials } from '@/lib/utils'

const SIZES = {
  xs: 'h-6 w-6 text-[0.6rem]',
  sm: 'h-8 w-8 text-2xs',
  md: 'h-10 w-10 text-xs',
  lg: 'h-12 w-12 text-sm',
} as const

/**
 * Avatar with a deterministic colour fallback. Demo avatars come from a
 * third-party placeholder service, so a blocked or offline request has to
 * degrade into something that still reads as a person rather than a broken image.
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  const hue = hueFromString(name)

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-medium text-white',
        SIZES[size],
        className,
      )}
      style={{
        background: `linear-gradient(140deg, hsl(${hue} 68% 62%), hsl(${(hue + 48) % 360} 70% 52%))`,
      }}
      title={name}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote, unsized, purely decorative
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(name)
      )}
    </span>
  )
}
