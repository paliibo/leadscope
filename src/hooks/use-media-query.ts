'use client'

import { useEffect, useState } from 'react'

/**
 * Returns `null` until mounted rather than guessing.
 *
 * Server-rendered markup cannot know the viewport, so any boolean default
 * guarantees a hydration mismatch on half of all devices. Callers render a
 * skeleton while this is null.
 */
export function useMediaQuery(query: string): boolean | null {
  const [matches, setMatches] = useState<boolean | null>(null)

  useEffect(() => {
    const list = window.matchMedia(query)
    setMatches(list.matches)

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
