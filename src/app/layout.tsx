import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'

import { QueryProvider } from '@/components/providers/query-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'

import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Leadscope — live pipeline intelligence',
    template: '%s · Leadscope',
  },
  description:
    'A real-time sales pipeline dashboard: live lead stream, drag-and-drop pipeline, revenue forecasting and team leaderboards.',
  applicationName: 'Leadscope',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f6fc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c14' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            {children}
            <Toaster
              position="bottom-right"
              toastOptions={{
                classNames: {
                  toast: 'surface-card !bg-surface !text-ink !border-line',
                  description: '!text-ink-muted',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
