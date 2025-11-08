import type { Envelope, LeadscopeEvent, PulseSnapshot } from './types'

type Listener = (envelope: Envelope) => void

const REPLAY_BUFFER_SIZE = 100

/**
 * A minimal in-process pub/sub for the live pipeline feed.
 *
 * This is deliberately not Redis: a single Node process serves the demo, and an
 * in-memory bus keeps the repo runnable with `pnpm dev` and nothing else. The
 * interface is narrow enough that swapping in a Redis fan-out later is a
 * one-file change.
 */
export class EventBus {
  private listeners = new Set<Listener>()
  private buffer: LeadscopeEvent[] = []
  private nextId = 1
  private recentTimestamps: number[] = []

  /** Subscribe; returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get subscriberCount(): number {
    return this.listeners.size
  }

  /** Stamp an event with an id and timestamp, buffer it, and fan it out. */
  publish(event: Omit<LeadscopeEvent, 'id' | 'at'> & { at?: number }): LeadscopeEvent {
    const stamped = {
      ...event,
      id: this.nextId++,
      at: event.at ?? Date.now(),
    } as LeadscopeEvent

    this.buffer.push(stamped)
    if (this.buffer.length > REPLAY_BUFFER_SIZE) {
      this.buffer.splice(0, this.buffer.length - REPLAY_BUFFER_SIZE)
    }

    this.recentTimestamps.push(stamped.at)
    this.trimRateWindow(stamped.at)

    this.emit({ kind: 'event', data: stamped })
    return stamped
  }

  publishPulse(snapshot: PulseSnapshot): void {
    this.emit({ kind: 'pulse', data: snapshot })
  }

  /** Events newer than `lastEventId`, for reconnecting clients. */
  replaySince(lastEventId: number | null): LeadscopeEvent[] {
    if (lastEventId === null) return []
    return this.buffer.filter((event) => event.id > lastEventId)
  }

  /** Most recent events, newest last. */
  recent(limit = 20): LeadscopeEvent[] {
    return this.buffer.slice(-limit)
  }

  /** Rolling events-per-minute over the last 60 seconds. */
  eventsPerMinute(now = Date.now()): number {
    this.trimRateWindow(now)
    return this.recentTimestamps.length
  }

  private trimRateWindow(now: number): void {
    const cutoff = now - 60_000
    while (this.recentTimestamps.length > 0 && (this.recentTimestamps[0] as number) < cutoff) {
      this.recentTimestamps.shift()
    }
  }

  private emit(envelope: Envelope): void {
    for (const listener of this.listeners) {
      try {
        listener(envelope)
      } catch (error) {
        // One broken subscriber must not stop the fan-out for everyone else.
        console.error('[event-bus] listener threw', error)
      }
    }
  }
}

const globalForBus = globalThis as unknown as { leadscopeBus?: EventBus }

export const bus: EventBus = globalForBus.leadscopeBus ?? new EventBus()

if (process.env.NODE_ENV !== 'production') {
  globalForBus.leadscopeBus = bus
}
