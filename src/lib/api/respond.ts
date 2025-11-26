import { NextResponse } from 'next/server'
import { ZodError, type z } from 'zod'

import { ForbiddenError, UnauthorizedError } from '@/lib/auth'

export interface ApiError {
  error: {
    code: string
    message: string
    /** Field-level detail for validation failures. */
    fields?: Record<string, string[]>
  }
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init)
}

export function fail(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message, fields } }, { status })
}

/** Turn a zod failure into a 422 with per-field messages the form can render. */
export function invalid(error: ZodError): NextResponse<ApiError> {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    ;(fields[key] ??= []).push(issue.message)
  }
  return fail(422, 'validation_failed', 'Request validation failed', fields)
}

/**
 * Wraps a handler so every route reports failures the same way.
 *
 * Auth errors keep their status; anything unexpected becomes a 500 with a
 * generic message, and the real error is logged server-side rather than
 * leaked to the client.
 */
export function handler<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof ZodError) return invalid(error)
      if (error instanceof UnauthorizedError) {
        return fail(401, 'unauthorized', error.message)
      }
      if (error instanceof ForbiddenError) return fail(403, 'forbidden', error.message)

      console.error('[api] unhandled error', error)
      return fail(500, 'internal_error', 'Something went wrong')
    }
  }
}

/** Parse a JSON body against a schema, rejecting malformed JSON cleanly. */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new ZodError([
      { code: 'custom', path: ['_'], message: 'Body must be valid JSON' },
    ])
  }
  return schema.parse(raw)
}
