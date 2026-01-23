/**
 * Thin typed wrapper over fetch for same-origin API calls.
 *
 * Every failure — network, non-2xx, malformed JSON — arrives as an ApiRequestError
 * carrying the status and any field errors, so callers have one thing to catch.
 */
export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string = 'request_failed',
    readonly fields?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new ApiRequestError('Network request failed', 0, 'network_error')
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  let payload: unknown = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      if (response.ok) {
        throw new ApiRequestError('Malformed response', response.status, 'bad_json')
      }
    }
  }

  if (!response.ok) {
    const error = (payload as { error?: { message?: string; code?: string; fields?: Record<string, string[]> } })
      ?.error
    throw new ApiRequestError(
      error?.message ?? response.statusText ?? 'Request failed',
      response.status,
      error?.code,
      error?.fields,
    )
  }

  return payload as T
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>(path, init),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
}

/** Build a query string, dropping empty values so URLs stay readable. */
export function qs(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}
