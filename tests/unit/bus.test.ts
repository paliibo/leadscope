import { describe, expect, it, vi } from 'vitest'

import { EventBus } from '@/lib/events/bus'

import type { Envelope } from '@/lib/events/types'

const actor = { repId: 'r1', name: 'Ada', avatarUrl: null }
const subject = {
  leadId: 'l1',
  leadName: 'Lead',
  accountName: 'Acme',
  valueCents: 1000,
}

function won(bus: EventBus) {
  return bus.publish({ type: 'deal.won', actor, subject, summary: 'Acme signed' })
}

describe('EventBus', () => {
  it('stamps events with a monotonic id', () => {
    const bus = new EventBus()
    expect(won(bus).id).toBe(1)
    expect(won(bus).id).toBe(2)
  })

  it('fans out to every subscriber', () => {
    const bus = new EventBus()
    const first = vi.fn()
    const second = vi.fn()
    bus.subscribe(first)
    bus.subscribe(second)

    won(bus)

    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
  })

  it('stops delivering after unsubscribe', () => {
    const bus = new EventBus()
    const listener = vi.fn()
    const unsubscribe = bus.subscribe(listener)

    won(bus)
    unsubscribe()
    won(bus)

    expect(listener).toHaveBeenCalledOnce()
    expect(bus.subscriberCount).toBe(0)
  })

  it('keeps delivering to the others when one subscriber throws', () => {
    const bus = new EventBus()
    const healthy = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    bus.subscribe(() => {
      throw new Error('subscriber exploded')
    })
    bus.subscribe(healthy)

    expect(() => won(bus)).not.toThrow()
    expect(healthy).toHaveBeenCalledOnce()

    consoleError.mockRestore()
  })

  it('replays only events newer than the given id', () => {
    const bus = new EventBus()
    won(bus)
    won(bus)
    won(bus)

    expect(bus.replaySince(1).map((event) => event.id)).toEqual([2, 3])
    expect(bus.replaySince(3)).toEqual([])
  })

  it('replays nothing for a first-time connection', () => {
    const bus = new EventBus()
    won(bus)
    expect(bus.replaySince(null)).toEqual([])
  })

  it('caps the replay buffer', () => {
    const bus = new EventBus()
    for (let i = 0; i < 150; i += 1) won(bus)

    // The buffer holds 100; the oldest 50 have been dropped.
    expect(bus.replaySince(0)).toHaveLength(100)
    expect(bus.recent(10)).toHaveLength(10)
    expect(bus.recent(10).at(-1)?.id).toBe(150)
  })

  it('counts events per minute over a rolling window', () => {
    const bus = new EventBus()
    const start = 1_800_000_000_000

    bus.publish({ type: 'deal.won', actor, subject, summary: 'old', at: start })
    bus.publish({ type: 'deal.won', actor, subject, summary: 'recent', at: start + 59_000 })

    expect(bus.eventsPerMinute(start + 59_500)).toBe(2)
    // The first event has aged out of the 60s window.
    expect(bus.eventsPerMinute(start + 61_000)).toBe(1)
  })

  it('delivers pulse snapshots as a distinct envelope kind', () => {
    const bus = new EventBus()
    const seen: Envelope[] = []
    bus.subscribe((envelope) => seen.push(envelope))

    bus.publishPulse({
      openLeads: 5,
      pipelineCents: 100,
      wonTodayCents: 10,
      wonTodayCount: 1,
      eventsPerMinute: 2,
    })

    expect(seen).toHaveLength(1)
    expect(seen[0]?.kind).toBe('pulse')
  })

  it('preserves variant-specific fields through publish', () => {
    const bus = new EventBus()
    const event = bus.publish({
      type: 'lead.stage_changed',
      fromStage: 'new',
      toStage: 'contacted',
      actor,
      subject,
      summary: 'moved',
    })
    expect(event).toMatchObject({ fromStage: 'new', toStage: 'contacted' })
  })
})
