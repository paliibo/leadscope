'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { ApiRequestError } from '@/lib/api/client'

export function QueryProvider({ children }: { children: ReactNode }) {
  // Created in state so React 18 strict mode doesn't build two clients.
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // The live stream pushes changes, so background refetching is mostly
            // redundant; a short stale window still covers a missed event.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              // 4xx means the request was wrong, not unlucky. Don't hammer it.
              if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) {
                return false
              }
              return failureCount < 2
            },
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
