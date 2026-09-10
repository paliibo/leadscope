# Decisions

Short records of the calls that shaped this codebase, and what they cost.

---

## 1. Server-sent events rather than WebSockets

**Context.** The dashboard needs to reflect pipeline changes as they happen.

**Decision.** SSE over a plain HTTP response.

**Why.** The traffic is strictly server → client; there is nothing to send upwards that
is not already a normal API call. SSE survives proxies that mangle protocol upgrades,
needs no separate server, and the browser handles reconnection and `Last-Event-ID`
without a line of application code. A WebSocket would have meant writing and testing a
reconnect-with-backoff loop for a channel that never needed to be bidirectional.

**Cost.** One connection per client held open, and HTTP/1.1's six-connection-per-origin
limit is a real constraint if a user opens many tabs. Acceptable for a dashboard.

---

## 2. The simulator writes to the database

**Context.** A live demo needs a source of events.

**Decision.** The simulator performs real mutations and then publishes, rather than
emitting synthetic events into the stream.

**Why.** Anything else drifts. A ticker fed from a fake source disagrees with the page
the moment you refresh, and the disagreement is exactly the kind of thing a reviewer
notices. Writing through the same path a user would also means the event pipeline is
genuinely exercised, not simulated around.

**Cost.** The demo dataset mutates while you look at it, so screenshots are not
byte-stable. `LIVE_SIMULATOR=0` freezes it, which is what CI uses.

---

## 3. Integer cents, never floats

**Decision.** All money is `integer` cents in the schema and in every interface.

**Why.** `0.1 + 0.2` is the oldest bug in software. Summing thousands of deal values as
floats produces totals that are wrong in the last digit and disagree between two code
paths that should match.

**Cost.** Every read site must divide. Centralised in `src/lib/money.ts`, which is the
only module that turns cents into a string.

---

## 4. Generated demo data, not fixtures

**Context.** The dashboard needs enough data to be worth looking at.

**Decision.** A seeded generator that simulates each lead's journey through the
pipeline, rather than a checked-in JSON fixture.

**Why.** Fixtures of this size are unmaintainable, and hand-written ones are always
uniform in the ways that matter: every stage converts at the same rate, every day has
the same volume, nothing is ever stalled. The generator produces a coherent story per
lead — arrival, touches, stage changes, close or stall — so the funnel, the velocity
report and the activity feed are all derived from the same events rather than sprinkled
independently and quietly contradicting each other.

**Cost.** The generator is real code with real tests. Worth it: those tests caught two
defects that would have shipped as "the data looks a bit odd".

---

## 5. Pipeline hygiene in the generated data

**Context.** The first version let stalled deals accumulate for the full 14 months. 692
of 859 open deals had not moved in two weeks, and every velocity number computed from
that population was meaningless.

**Decision.** Deals that go quiet pick up a few unanswered follow-ups and are then
closed lost 35–95 days later with 82% probability.

**Why.** That is what real teams do in a pipeline review. Without it the "needs
attention" report flags most of the open book and therefore says nothing.

---

## 6. Forecast with a stated fit

**Decision.** Show the regression's R² next to the projection, and label it "noisy"
below 0.15.

**Why.** Daily closed-won from a fourteen-person team is lumpy — R² is routinely under
0.1. A dashed line drawn confidently across that implies precision that does not exist.
Stating the fit costs one line and makes the number honest.

---

## 7. Drizzle and libSQL over Prisma and Postgres

**Decision.** Drizzle ORM against libSQL.

**Why.** Three things mattered: a fresh clone must run with no external service, the
production path must not require a rewrite, and the SQL must be readable in the diff.
libSQL is a file locally and a Turso URL in production behind the same client. Drizzle
generates checked-in SQL migrations rather than pushing a schema, so the DDL that ran in
CI is the DDL that ran locally.

**Cost.** No Postgres-specific features — no window functions in the query builder, no
`JSONB` operators. Nothing here needed them.

---

## 8. No global state library

**Decision.** React Query for server state, `useState` and one context for UI state.

**Why.** Almost everything on screen is a cached copy of something the server owns.
That is a cache-invalidation problem, not a state-management one, and the live stream
maps cleanly onto invalidation. The only genuinely client-owned state is the command
palette's open flag and the theme, which is one context and one library respectively.

---

## 9. Dropping the dashboard `loading.tsx`

**Context.** The route segment had a loading skeleton.

**Decision.** Removed.

**Why.** With the boundary present, the streamed Suspense content was left behind in a
`<div hidden id="S:0">` _as well as_ being rendered into the page — 7 KB of duplicated
markup on every load, including a second copy of every interactive control. Invisible to
a user, but it put duplicates in the accessibility tree and made every role-based
selector ambiguous. The pages fetch client-side and render their own skeletons, so the
boundary was buying an instant server shell that nothing was waiting on.

---

## 10. Two Playwright workers, not the CPU count

**Decision.** Cap e2e parallelism at two.

**Why.** Everything shares one Node process and one SQLite file, with the simulator
writing throughout. Past two browsers the app stops hydrating inside the assertion
timeouts, and the suite starts reporting contention as defects — the worst kind of
flake, because it looks like a real failure.

---

## 11. The server bootstraps its own database

**Context.** Migrations and the seed were scripts, run by hand before `pnpm dev`. The
Docker image started `node server.js` against an empty volume and served errors, and a
fresh clone failed before its first query because `./data` did not exist yet.

**Decision.** `instrumentation.ts` runs `ensureDatabase()` once per server instance:
create the directory, apply pending migrations, and seed if the `reps` table is empty.
The CLI scripts call the same functions.

**Why.** The three ways this app gets started — a clone, a container, a serverless cold
start — all begin with no tables, and each was one forgotten step away from a broken
demo. The seed is deterministic and takes about a second, which is what makes "seed if
empty" safe to run on every boot; a no-op boot costs one `count(*)`.

**Cost.** A database you manage yourself gets migrated by the app unless `DB_BOOTSTRAP=0`
is set. On a serverless host every instance seeds its own copy, so state is per instance
until `DATABASE_URL` points at a remote database.
