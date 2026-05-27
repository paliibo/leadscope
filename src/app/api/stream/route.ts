import { handler } from '@/lib/api/respond'
import { requireSession } from '@/lib/auth'
import { bus } from '@/lib/events/bus'
import { readPulse, simulator } from '@/lib/events/simulator'
import type { Envelope } from '@/lib/events/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Proxies and load balancers drop idle connections; a comment every 15s is enough. */
const HEARTBEAT_MS = 15_000

function frame(envelope: Envelope): string {
  const id = envelope.kind === 'event' ? `id: ${envelope.data.id}\n` : ''
  return `${id}event: ${envelope.kind}\ndata: ${JSON.stringify(envelope.data)}\n\n`
}

/**
 * Server-sent events feed for the live dashboard.
 *
 * SSE rather than WebSockets on purpose: the traffic is strictly server to
 * client, it survives proxies that mangle upgrades, and the browser reconnects
 * on its own. Reconnects carry `Last-Event-ID`, and the bus keeps a replay
 * buffer, so a dropped connection resumes instead of leaving a hole in the feed.
 */
export const GET = handler(async (request: Request) => {
  await requireSession()

  const lastEventId = Number(request.headers.get('last-event-id') ?? '')
  const replayFrom = Number.isFinite(lastEventId) && lastEventId > 0 ? lastEventId : null

  const encoder = new TextEncoder()
  let unsubscribe: (() => void) | null = null
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          // The client hung up between the check and the write; cleanup follows.
        }
      }

      // Tell the browser how long to wait before retrying a dropped connection.
      send('retry: 3000\n\n')

      const backlog = replayFrom === null ? bus.recent(15) : bus.replaySince(replayFrom)
      for (const event of backlog) send(frame({ kind: 'event', data: event }))

      send(frame({ kind: 'pulse', data: await readPulse() }))

      unsubscribe = bus.subscribe((envelope) => send(frame(envelope)))
      heartbeat = setInterval(() => send(': keep-alive\n\n'), HEARTBEAT_MS)
      heartbeat.unref?.()

      simulator.ensureStarted()

      request.signal.addEventListener('abort', () => {
        try {
          controller.close()
        } catch {
          // Already closed.
        }
      })
    },
    cancel() {
      unsubscribe?.()
      if (heartbeat) clearInterval(heartbeat)
      simulator.scheduleStopIfIdle()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx buffers proxied responses by default, which would stall the feed.
      'X-Accel-Buffering': 'no',
    },
  })
})
