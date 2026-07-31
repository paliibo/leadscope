# Architecture

## Shape of the thing

One Next.js application, one database, one process. Server components render the shell
and read the session; route handlers serve JSON to a React Query cache in the browser;
an in-process event bus pushes changes to that cache over SSE.

```
Browser                          Next.js server                    SQLite / libSQL
────────────────────────────     ─────────────────────────────     ─────────────────

React Query cache  ◄──── JSON ─── Route handlers ──── Drizzle ────►  leads
        ▲                         (zod-validated)                    activities
        │                                │                           accounts
        │ invalidate                     │ publish                   reps · teams · goals
        │                                ▼                                   ▲
  useLiveStream    ◄──── SSE ────── EventBus  ◄──── writes ─── PipelineSimulator
  (EventSource)                    (replay buffer)
```

## Layers

**`src/lib/analytics`** is pure. No database, no React, no `Date.now()` reached for
implicitly. Regression, funnel construction, dwell times, scoring and ranking all take
plain arrays and return plain objects. That is why they carry the bulk of the test
suite: they are the code where a wrong answer looks exactly like a right one.

**`src/db/queries`** is the only place SQL is written. Route handlers call query
functions; they never build a query themselves. Each function returns a shape the UI can
use directly rather than rows the caller has to reassemble.

**`src/app/api`** is thin on purpose. Parse and validate the request, check the session,
call a query, return it. Every handler is wrapped in `handler()`, so failures are
reported identically everywhere: a zod error becomes a 422 with per-field messages, an
auth error keeps its status, anything else becomes a 500 with the detail logged
server-side rather than returned.

**`src/components`** splits into `ui/` (primitives with no knowledge of the domain) and
feature folders that fetch their own data. There is no page-level data-fetching layer
threading props downwards; each card owns its query and its loading state.

## The live path

1. `PipelineSimulator` wakes on a timer, picks a live deal, and does something plausible
   to it — logs a touch, advances a stage, or lands a new lead.
2. The change is **written to the database first**, then published to `EventBus`.
3. `/api/stream` holds an SSE connection per client. Every published event is framed and
   flushed, with the event id as the SSE `id:` field.
4. `useLiveStream` keeps the last 60 events in memory for the ticker.
5. `LiveProvider` maps event types to query keys and invalidates them — batched into one
   invalidation per key per 1.2 s, so a busy minute does not fire dozens of refetches.

The ordering in step 2 is the important part. The simulator does not fabricate events
for the UI to render; it mutates state and then announces it. A page refresh therefore
always agrees with the ticker. Demos that push synthetic events into a socket without
touching storage look identical until you reload, and then they fall apart.

The simulator starts on the first SSE subscriber and stops 30 s after the last one
leaves, so an idle deployment does no work. Setting `LIVE_SIMULATOR=0` disables it
entirely; the stream still connects and still carries anything the API publishes, which
is what a real webhook integration would look like.

## Reconnection

`EventSource` reconnects on its own and sends `Last-Event-ID`. The bus keeps a
100-event ring buffer, so `/api/stream` can replay the gap instead of leaving a hole in
the feed. Heartbeat comments every 15 s stop intermediaries from reaping an idle
connection, and `X-Accel-Buffering: no` stops nginx from buffering the stream into
silence.

## Authorisation

Two gates, deliberately:

- **Edge middleware** rejects unauthenticated requests before they reach a handler —
  401 for `/api/*`, a redirect to `/login` preserving the intended path for pages.
- **Route handlers** call `requireSession()` themselves, then decide scope.
  `canViewAllReps()` determines whether an `ownerId` query parameter is honoured or
  silently replaced with the caller's own id.

The second gate is not redundant. Middleware answers "is this someone?", handlers answer
"is this their data?" — and a rep must not be able to widen their view by editing a
query string.

## Money and time

Money is integer cents everywhere: in the schema, through the API, into the formatters.
It becomes a string in exactly one module (`src/lib/money.ts`), which is the only place
rounding happens.

Timestamps are unix milliseconds. Bucketing uses local calendar days, and everything
that labels a date — including the forecast tail — goes through the same `date-fns`
formatter, so a projection cannot end up a day offset from the history it continues.

## Concurrency

Local SQLite runs in WAL mode with a 5-second busy timeout, applied on connection.
Without it, the simulator writing while a request writes fails outright with
`SQLITE_BUSY` — which is exactly how the e2e suite found it.

## What is not here

No message broker: a single process serves the demo, and an in-memory bus keeps the repo
runnable with nothing but `pnpm dev`. The bus interface is narrow enough — `subscribe`,
`publish`, `replaySince` — that a Redis fan-out would be a one-file change.

No caching layer: every query is a single indexed round trip to a local database. Adding
Redis in front of that would be slower.

No background job runner: the only recurring work is the simulator, which is a timer.
