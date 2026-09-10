import { z } from 'zod'

/**
 * Environment parsing happens once, at module load, so a misconfigured deploy
 * fails loudly on boot instead of throwing somewhere deep in a request handler.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1).default('file:./data/leadscope.db'),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  AUTH_SECRET: z
    .string()
    .min(16, 'AUTH_SECRET must be at least 16 characters')
    .default('dev-only-secret-change-me-in-production-3f9a'),
  SEED: z.coerce.number().int().default(20260101),
  LIVE_SIMULATOR: z
    .enum(['0', '1'])
    .default('1')
    .transform((value) => value === '1'),
  DB_BOOTSTRAP: z
    .enum(['0', '1'])
    .default('1')
    .transform((value) => value === '1'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const parsed = schema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
  AUTH_SECRET: process.env.AUTH_SECRET,
  SEED: process.env.SEED,
  LIVE_SIMULATOR: process.env.LIVE_SIMULATOR,
  DB_BOOTSTRAP: process.env.DB_BOOTSTRAP,
  NODE_ENV: process.env.NODE_ENV,
})

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data

export const isProduction = env.NODE_ENV === 'production'
