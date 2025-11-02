import { eq } from 'drizzle-orm'

import { db } from '@/db'
import { reps, teams, type Rep } from '@/db/schema'

export interface RepSummary {
  id: string
  name: string
  email: string
  jobTitle: string
  role: string
  avatarUrl: string | null
  team: string | null
  quotaCents: number
}

export async function listReps(): Promise<RepSummary[]> {
  const rows = await db
    .select({
      id: reps.id,
      name: reps.name,
      email: reps.email,
      jobTitle: reps.jobTitle,
      role: reps.role,
      avatarUrl: reps.avatarUrl,
      team: teams.name,
      quotaCents: reps.quotaCents,
    })
    .from(reps)
    .leftJoin(teams, eq(reps.teamId, teams.id))
    .where(eq(reps.active, true))
    .orderBy(reps.name)

  return rows
}

export async function findRepByEmail(email: string): Promise<Rep | null> {
  const [row] = await db
    .select()
    .from(reps)
    .where(eq(reps.email, email.toLowerCase()))
    .limit(1)
  return row ?? null
}

export async function findRepById(id: string): Promise<Rep | null> {
  const [row] = await db.select().from(reps).where(eq(reps.id, id)).limit(1)
  return row ?? null
}
