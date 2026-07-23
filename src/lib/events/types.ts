import type { ActivityType, LeadStage } from '@/db/schema'

export interface LeadEventActor {
  repId: string
  name: string
  avatarUrl: string | null
}

export interface LeadEventSubject {
  leadId: string
  leadName: string
  accountName: string
  valueCents: number
}

interface BaseEvent {
  /** Monotonic, per-process. Doubles as the SSE `id:` for replay. */
  id: number
  at: number
  actor: LeadEventActor
  subject: LeadEventSubject
  summary: string
}

export interface LeadCreatedEvent extends BaseEvent {
  type: 'lead.created'
  source: string
  score: number
}

export interface StageChangedEvent extends BaseEvent {
  type: 'lead.stage_changed'
  fromStage: LeadStage
  toStage: LeadStage
}

export interface TouchLoggedEvent extends BaseEvent {
  type: 'lead.touched'
  activity: Extract<
    ActivityType,
    'email_sent' | 'call_logged' | 'meeting_booked' | 'note_added'
  >
}

export interface DealClosedEvent extends BaseEvent {
  type: 'deal.won' | 'deal.lost'
  reason?: string
}

export type LeadscopeEvent =
  LeadCreatedEvent | StageChangedEvent | TouchLoggedEvent | DealClosedEvent

export type LeadscopeEventType = LeadscopeEvent['type']

/** Payload published alongside every event so widgets can re-sync cheaply. */
export interface PulseSnapshot {
  openLeads: number
  pipelineCents: number
  wonTodayCents: number
  wonTodayCount: number
  eventsPerMinute: number
}

export interface EnvelopeMap {
  event: LeadscopeEvent
  pulse: PulseSnapshot
}

export type Envelope =
  { kind: 'event'; data: LeadscopeEvent } | { kind: 'pulse'; data: PulseSnapshot }
