import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

/**
 * Leadscope schema.
 *
 * Everything is timestamped in unix milliseconds so the analytics layer can do
 * date maths without pulling rows through a date parser first. Money is stored
 * in whole cents (`integer`) — never floats — so sums stay exact.
 */

export const LEAD_STAGES = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]

/** Stages a lead can sit in while still being winnable. */
export const OPEN_STAGES = LEAD_STAGES.filter(
  (stage) => stage !== 'won' && stage !== 'lost',
) as ReadonlyArray<LeadStage>

export const LEAD_SOURCES = [
  'inbound',
  'outbound',
  'referral',
  'event',
  'partner',
  'ads',
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export const ACTIVITY_TYPES = [
  'lead_created',
  'stage_changed',
  'note_added',
  'email_sent',
  'call_logged',
  'meeting_booked',
  'deal_won',
  'deal_lost',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export const REP_ROLES = ['admin', 'manager', 'rep'] as const

export type RepRole = (typeof REP_ROLES)[number]

export const teams = sqliteTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  region: text('region').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
})

export const reps = sqliteTable(
  'reps',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    role: text('role', { enum: REP_ROLES }).notNull().default('rep'),
    jobTitle: text('job_title').notNull(),
    avatarUrl: text('avatar_url'),
    teamId: text('team_id').references(() => teams.id, { onDelete: 'set null' }),
    /** Monthly closed-won target, in cents. */
    quotaCents: integer('quota_cents').notNull().default(0),
    startedAt: integer('started_at', { mode: 'timestamp_ms' }).notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (table) => ({
    emailIdx: uniqueIndex('reps_email_idx').on(table.email),
    teamIdx: index('reps_team_idx').on(table.teamId),
  }),
)

export const accounts = sqliteTable(
  'accounts',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    domain: text('domain').notNull(),
    industry: text('industry').notNull(),
    /** Headcount bucket: 1-10, 11-50, 51-200, 201-1000, 1000+ */
    sizeBucket: text('size_bucket').notNull(),
    country: text('country').notNull(),
  },
  (table) => ({
    domainIdx: uniqueIndex('accounts_domain_idx').on(table.domain),
    industryIdx: index('accounts_industry_idx').on(table.industry),
  }),
)

export const leads = sqliteTable(
  'leads',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull(),
    title: text('title').notNull(),
    accountId: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id')
      .notNull()
      .references(() => reps.id, { onDelete: 'cascade' }),
    stage: text('stage', { enum: LEAD_STAGES }).notNull().default('new'),
    source: text('source', { enum: LEAD_SOURCES }).notNull(),
    /** Deal size in cents. */
    valueCents: integer('value_cents').notNull().default(0),
    /** 0-100 fit score produced by the scoring model. */
    score: integer('score').notNull().default(0),
    /** Manual ordering inside a pipeline column, ascending. */
    boardRank: integer('board_rank').notNull().default(0),
    lostReason: text('lost_reason'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
    closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
  },
  (table) => ({
    ownerIdx: index('leads_owner_idx').on(table.ownerId),
    stageIdx: index('leads_stage_idx').on(table.stage),
    createdIdx: index('leads_created_idx').on(table.createdAt),
    closedIdx: index('leads_closed_idx').on(table.closedAt),
    boardIdx: index('leads_board_idx').on(table.stage, table.boardRank),
  }),
)

export const activities = sqliteTable(
  'activities',
  {
    id: text('id').primaryKey(),
    leadId: text('lead_id')
      .notNull()
      .references(() => leads.id, { onDelete: 'cascade' }),
    repId: text('rep_id')
      .notNull()
      .references(() => reps.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ACTIVITY_TYPES }).notNull(),
    /** Human-readable one-liner rendered in the activity feed. */
    summary: text('summary').notNull(),
    fromStage: text('from_stage', { enum: LEAD_STAGES }),
    toStage: text('to_stage', { enum: LEAD_STAGES }),
    valueCents: integer('value_cents'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  },
  (table) => ({
    leadIdx: index('activities_lead_idx').on(table.leadId),
    repIdx: index('activities_rep_idx').on(table.repId),
    createdIdx: index('activities_created_idx').on(table.createdAt),
  }),
)

export const goals = sqliteTable(
  'goals',
  {
    id: text('id').primaryKey(),
    repId: text('rep_id')
      .notNull()
      .references(() => reps.id, { onDelete: 'cascade' }),
    /** ISO month, e.g. "2026-03". */
    period: text('period').notNull(),
    targetCents: integer('target_cents').notNull(),
  },
  (table) => ({
    repPeriodIdx: uniqueIndex('goals_rep_period_idx').on(table.repId, table.period),
  }),
)

export const teamsRelations = relations(teams, ({ many }) => ({
  reps: many(reps),
}))

export const repsRelations = relations(reps, ({ many, one }) => ({
  team: one(teams, { fields: [reps.teamId], references: [teams.id] }),
  leads: many(leads),
  activities: many(activities),
  goals: many(goals),
}))

export const accountsRelations = relations(accounts, ({ many }) => ({
  leads: many(leads),
}))

export const leadsRelations = relations(leads, ({ many, one }) => ({
  account: one(accounts, { fields: [leads.accountId], references: [accounts.id] }),
  owner: one(reps, { fields: [leads.ownerId], references: [reps.id] }),
  activities: many(activities),
}))

export const activitiesRelations = relations(activities, ({ one }) => ({
  lead: one(leads, { fields: [activities.leadId], references: [leads.id] }),
  rep: one(reps, { fields: [activities.repId], references: [reps.id] }),
}))

export const goalsRelations = relations(goals, ({ one }) => ({
  rep: one(reps, { fields: [goals.repId], references: [reps.id] }),
}))

export type Team = typeof teams.$inferSelect
export type Rep = typeof reps.$inferSelect
export type Account = typeof accounts.$inferSelect
export type Lead = typeof leads.$inferSelect
export type Activity = typeof activities.$inferSelect
export type Goal = typeof goals.$inferSelect

export type NewTeam = typeof teams.$inferInsert
export type NewRep = typeof reps.$inferInsert
export type NewAccount = typeof accounts.$inferInsert
export type NewLead = typeof leads.$inferInsert
export type NewActivity = typeof activities.$inferInsert
export type NewGoal = typeof goals.$inferInsert
