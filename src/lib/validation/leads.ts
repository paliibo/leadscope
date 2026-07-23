import { z } from 'zod'

import { LEAD_SOURCES, LEAD_STAGES } from '@/db/schema'

export const stageSchema = z.enum(LEAD_STAGES)
export const sourceSchema = z.enum(LEAD_SOURCES)

/** Comma-separated repeated values, e.g. `?stage=new,contacted`. */
const csv = <T extends z.ZodTypeAny>(item: T) =>
  z
    .string()
    .transform((value) =>
      value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    )
    .pipe(z.array(item))

export const leadListQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  stage: csv(stageSchema).optional(),
  source: csv(sourceSchema).optional(),
  ownerId: z.string().min(1).optional(),
  minValue: z.coerce.number().int().nonnegative().optional(),
  maxValue: z.coerce.number().int().nonnegative().optional(),
  sort: z
    .enum(['createdAt', 'updatedAt', 'value', 'score', 'name'])
    .default('updatedAt'),
  dir: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
})

export type LeadListQuery = z.infer<typeof leadListQuerySchema>

export const updateLeadSchema = z
  .object({
    stage: stageSchema.optional(),
    ownerId: z.string().min(1).optional(),
    valueCents: z.number().int().nonnegative().max(1_000_000_00).optional(),
    boardRank: z.number().int().optional(),
    lostReason: z.string().trim().max(200).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update',
  })

export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email(),
  title: z.string().trim().min(2).max(120),
  accountId: z.string().min(1),
  ownerId: z.string().min(1),
  source: sourceSchema,
  valueCents: z.number().int().nonnegative().max(1_000_000_00),
})

export type CreateLeadInput = z.infer<typeof createLeadSchema>

/**
 * Parse `URLSearchParams` into a typed query. Repeated keys collapse to the
 * last value, which matches how the UI builds its links.
 */
export function parseSearchParams<T extends z.ZodTypeAny>(
  schema: T,
  params: URLSearchParams,
): z.SafeParseReturnType<unknown, z.infer<T>> {
  const raw: Record<string, string> = {}
  params.forEach((value, key) => {
    if (value !== '') raw[key] = value
  })
  return schema.safeParse(raw)
}
