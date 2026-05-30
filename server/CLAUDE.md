# server/CLAUDE.md — Backend Context

> This file contains backend-specific conventions for the StreamWave Fastify API server.
> For project-wide context, see the root `CLAUDE.md`.
> For frontend context, see `src/CLAUDE.md`.

---

## Architecture

The backend follows: `routes → services → Prisma/Redis/Meilisearch`.

- **Routes** (`server/routes/`): Fastify route handlers. Validate input with Zod, call services, return response
- **Services** (`server/services/`): ALL business logic and database queries live here — NEVER in routes
- **Plugins** (`server/plugins/`): Cross-cutting concerns (auth, rate-limit, cors, redis, meilisearch)
- **Entry point**: `server/index.ts` — registers plugins + routes, starts on port 3001

Run with: `tsx server/index.ts` (via `npm run dev` concurrently with Next.js)
Type-check with: `tsc -p tsconfig.server.json --noEmit`

---

## API Conventions

- Base path: `/api/v1/`
- Auth: `Authorization: Bearer <access_token>` header OR HttpOnly `access_token` cookie
- Dual-verify: Fastify auth plugin accepts BOTH custom JWT AND NextAuth `authjs.session-token` cookie

### Response Format

```typescript
// Success
{ data: T, meta?: { page, limit, total } }

// Error
{ error: { code: string, message: string, details?: any } }
```

### HTTP Status Codes

200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Rate Limited, 500 Server Error

### Pagination

- Cursor-based for feeds/lists: `?cursor=<id>&limit=20`
- Offset-based for search results

---

## Auth System

### Passwords

- bcrypt, cost factor 12 (configurable via `BCRYPT_COST` env var; set to 4 in tests)
- Validation: min 8 chars, ≥1 uppercase, ≥1 number

### Tokens

- Access token: JWT, 15-min TTL
- Refresh token: JWT, 7-day TTL, `jti` stored in Redis for revocation
- Multiple active sessions per user supported (logout revokes only the presented token)

### Rate Limiting

- Global: 100 req/min via `@fastify/rate-limit` (Redis-backed)
- Login: 5 failed attempts per IP per 15-min → 429 (Redis INCR counters)
- Register: 20 req/min
- Password reset request: 5 req/15 min
- Password reset confirm: 10 req/15 min

### NextAuth Integration

- Cookie name: `authjs.session-token` (v5), secure variant: `__Secure-authjs.session-token`
- JWTs are **encrypted** (JWE, A256CBC-HS512) — must use `@auth/core/jwt` `decode()` with same `secret` and `salt`
- OAuth auto-create happens in the `jwt` callback (not `signIn`)
- `FASTIFY_API_URL` env var controls where Credentials provider calls (default: `http://localhost:3001`)

---

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/password-reset
POST   /api/v1/auth/password-reset/confirm
GET    /api/v1/tracks/:id
GET    /api/v1/tracks/:id/stream         → signed R2 URL
GET    /api/v1/albums/:id                → album detail + full track list
GET    /api/v1/artists/:id               → artist metadata
GET    /api/v1/artists/:id/albums        → cursor-paginated albums
GET    /api/v1/artists/:id/top-tracks    → top N tracks (default 10)
GET    /api/v1/playlists/:id             → playlist detail + track list (M4)
GET    /api/v1/browse/featured           → featured playlists + new releases
GET    /api/v1/browse/genres             → static genre list with hex colors
GET    /api/v1/search?q=&type=         → Meilisearch-backed, Redis-cached, auth optional
GET    /api/v1/library/liked-songs
POST   /api/v1/library/liked-songs/:trackId
DELETE /api/v1/library/liked-songs/:trackId
GET    /api/v1/library/saved-albums
POST   /api/v1/library/saved-albums/:albumId
DELETE /api/v1/library/saved-albums/:albumId
GET    /api/v1/library/followed-artists
GET    /api/v1/library/followed-artists/releases  → recent albums from followed artists (limit 20)
POST   /api/v1/library/followed-artists/:artistId
DELETE /api/v1/library/followed-artists/:artistId
GET    /api/v1/playlists                    → user's own playlists
GET    /api/v1/playlists/:id               → playlist detail + track list
POST   /api/v1/playlists
PATCH  /api/v1/playlists/:id
DELETE /api/v1/playlists/:id
POST   /api/v1/playlists/:id/tracks
DELETE /api/v1/playlists/:id/tracks/:trackId
PATCH  /api/v1/playlists/:id/tracks/reorder
GET    /api/v1/users/me                     → current user profile + library counts
PATCH  /api/v1/users/me                     → update display_name (and optionally avatar_url)
GET    /api/v1/users/me/notifications        → fetch (or upsert-create with defaults) NotificationPreferences
PATCH  /api/v1/users/me/notifications        → partial update of notification flags (all optional booleans)
GET    /health                               → liveness probe (always 200, no dep checks) — for load balancers
GET    /api/v1/health                        → readiness probe; checks Postgres + Redis + Meilisearch; 200 ok / 503 degraded
GET    /api/v1/admin/stats                   → { users, artists, albums, tracks, playlists } counts (admin only)
GET    /api/v1/admin/artists                 → all artists (for dropdowns)
GET    /api/v1/admin/albums?artistId=        → all albums, optionally filtered by artist (for dropdowns)
GET    /api/v1/admin/tracks?page=&limit=     → paginated track list with artist + album
POST   /api/v1/admin/tracks                  → create track
PATCH  /api/v1/admin/tracks/:id              → update track
DELETE /api/v1/admin/tracks/:id              → delete track
GET    /api/v1/admin/playlists?page=&limit=  → paginated playlist list with owner + track count
POST   /api/v1/admin/playlists               → create playlist
PATCH  /api/v1/admin/playlists/:id           → update playlist metadata
DELETE /api/v1/admin/playlists/:id           → delete playlist
GET    /api/v1/admin/playlists/:id/tracks    → list tracks in playlist
POST   /api/v1/admin/playlists/:id/tracks    → add track to playlist
DELETE /api/v1/admin/playlists/:id/tracks/:trackId → remove track from playlist
```

---

## Database Access

- Prisma singleton at `server/lib/prisma.ts` — uses `PrismaPg` adapter (Prisma 7 requirement)
- Separate singleton for Next.js server side at `src/lib/prisma.ts` (uses `globalThis.prismaNext` key)
- NEVER query the database from routes — always go through services
- Use `prisma.$transaction()` for multiple correlated writes
- After schema changes: `npx prisma migrate dev --name <description>` then `npx prisma generate`

---

## Search (Meilisearch)

- Indexes: `tracks`, `artists`, `albums`, `playlists`
- Sync: after any DB write affecting searchable fields, push update to Meilisearch
- API: `GET /api/v1/search?q=<query>&type=tracks,artists,albums,playlists`
- Redis cache: hash query → cache results with 60-second TTL
- Fuzzy matching enabled (typo tolerance = 2)

---

## Testing

- Framework: Vitest (unit + integration), Playwright (e2e)
- Test factory: `server/test/buildApp.ts` — builds Fastify instance WITHOUT `@fastify/rate-limit` (shared Redis key causes 429s across parallel workers)
- Setup: `server/test/setup.ts` — loads `.env.local` for infrastructure URLs
- Config: `vitest.config.ts` — injects `JWT_SECRET`, `NEXTAUTH_SECRET`, `BCRYPT_COST=4`, `NODE_ENV=test`
- `app.inject()` is the correct Fastify test transport (no HTTP server needed)
- `payload` must be typed as `object` (not `unknown`) for correct overload resolution
- Each Vitest file runs in a separate worker — `globalThis.prisma` shared within a file but NOT across files
- Use `npx prisma migrate deploy` (not `migrate dev`) in non-interactive environments

### Current Test Coverage

- 219/219 server tests passing: 20 unit (auth helpers) + 11 register + 9 login + 8 refresh + 6 logout + 11 password-reset + 15 library-liked-songs + 17 library-saved-albums + 16 library-followed-artists + 28 playlists-crud + 14 search + 28 content (tracks/albums/artists/browse) + 9 notifications + 23 users
- 129/129 client tests passing: 25 AudioEngine unit + 31 AudioEngine playback unit + 26 usePlayerStore unit + 31 useLibraryStore unit + 16 useSearchStore unit
- Run server tests: `npm run test` | Run client tests: `npm run test:client`
- Search tests require Meilisearch running (`docker compose up -d`) — use `buildSearchApp()` factory
- Content tests (`content.test.ts`) use `buildApp()` factory (includes tracks/albums/artists/browse routes since Session 19)

---

## Key Backend Files

- `server/index.ts` — Fastify entry point, plugin/route registration
- `server/services/library.ts` — liked songs, saved albums, followed artists business logic
- `server/services/playlists.ts` — playlist CRUD + track position management (`assertOwnership`, `addTrackToPlaylist`, `removeTrackFromPlaylist`, `reorderPlaylistTracks`)
- `server/routes/library.ts` — library API routes (/library/liked-songs, /saved-albums, /followed-artists)
- `server/services/content.ts` — content business logic (albums, artists, playlists, browse)
- `server/routes/albums.ts` — album routes
- `server/routes/artists.ts` — artist routes (/:id, /:id/albums, /:id/top-tracks)
- `server/routes/playlists.ts` — playlist routes
- `server/routes/search.ts` — search route (GET /api/v1/search, no auth required)
- `server/services/search-sync.ts` — Meilisearch index init, per-entity sync helpers, `fullSync`
- `server/services/search.ts` — search business logic (Redis cache + Meilisearch fan-out)
- `server/scripts/sync-search.ts` — standalone full-sync CLI script
- `server/routes/browse.ts` — browse routes (featured, genres)
- `server/services/auth.ts` — All auth business logic (register, login, tokens, password reset)
- `server/plugins/auth.ts` — JWT verification plugin (dual-verify: custom JWT + NextAuth cookie)
- `server/plugins/rate-limit.ts` — Redis-backed rate limiting
- `server/plugins/redis.ts` — ioredis singleton
- `server/plugins/meilisearch.ts` — Meilisearch client
- `server/lib/prisma.ts` — Prisma singleton with PrismaPg adapter
- `server/routes/auth.ts` — All 6 auth route handlers
- `server/routes/users.ts` — GET + PATCH /api/v1/users/me; GET + PATCH /api/v1/users/me/notifications
- `server/services/users.ts` — `getUserProfile` (profile + library counts), `updateUserProfile`
- `server/services/notifications.ts` — `getNotificationPreferences` (upsert-on-read), `updateNotificationPreferences` (partial upsert)
- `server/services/admin.ts` — `assertAdmin(userId)` DB guard + all admin CRUD helpers
- `server/routes/admin.ts` — All admin endpoints under `/api/v1/admin/`; each handler calls `assertAdmin` after `requireUser`
- `server/test/buildApp.ts` — Test Fastify factory (no rate-limit plugin)
- `server/load-env.ts` — **First import** in `server/index.ts`; loads `.env` then `.env.local`. Must stay first or modules that read `process.env` at eval time (prisma, auth plugin) will see `undefined`.

## Admin API Patterns (Session 71)

- **`assertAdmin(userId)`** — call immediately after `requireUser(request)` in every admin handler. Throws 403 `FORBIDDEN` if `user.is_admin !== true`. Hits DB every request (not JWT-based) to prevent stale-JWT bypass.
- **`safeText(min, max)`** — Zod helper for input sanitization: `z.string().transform(trim+stripHTML).pipe(z.string().min(min).max(max))`. Defined locally in `admin.ts` (same pattern as `playlists.ts`).
- **`requireUser(request)`** — helper defined in `server/routes/` files; reads `request.user` set by the auth plugin; throws 401 if missing.
- Admin routes are registered in `server/index.ts` and `server/test/buildApp.ts` under prefix `/api/v1/admin`.
- Admin service functions are pure Prisma — no Redis, no Meilisearch side effects currently (add sync calls if search needs to stay current after admin writes).

---

## Gotchas

- `@fastify/rate-limit` uses Redis with shared IP key — MUST exclude from test builds
- Zod v4 import: `zod/v4` not `zod`
- `jwt` callback is where OAuth auto-create happens (not `signIn` callback)
- `next-auth@beta` requires `--legacy-peer-deps` (peer dep conflict with Next.js 16)
- `tsx` used instead of `ts-node` for running server/seed (handles ESM packages cleanly)
- Meilisearch JS client v0.57 exports `Meilisearch` (lowercase), not `MeiliSearch`
- Fastify plugins use `fp()` (fastify-plugin) for decoration visibility across scopes
- `getTrackStreamUrl` bypasses R2 when `audio_url` starts with `/` — local dev paths served directly from Next.js `public/`. Placeholder R2 env vars (from `.env.example`) would otherwise create a real S3 client and generate broken signed URLs.
- **Input sanitization pattern**: use `safeText(min, max)` — a `z.string().transform(trim+stripHTML).pipe(z.string().min().max())` chain. This runs transformation BEFORE constraints, so whitespace-only or HTML-only strings correctly fail `min`. Both `auth.ts` and `playlists.ts` define their own copy of this helper (no shared file — keeps each route self-contained).
- **Security headers**: `server/index.ts` `onSend` hook applies `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` to every API response. CSP and other browser-facing headers are in `next.config.ts` `headers()` (applies only to the Next.js origin, not Fastify directly).
- **ESM import hoisting**: `tsx` runs TypeScript as ESM. All static `import` declarations are hoisted and evaluated before any module body code. `server/load-env.ts` MUST be the first import in `server/index.ts`. Never interleave `loadEnv()` calls between `import` statements — they will run too late.
- **CORS must list methods explicitly**: `@fastify/cors` v11 + Fastify 5 — always pass `methods: ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']` and `allowedHeaders: ['Content-Type','Authorization','Cookie']`. DELETE/PUT/PATCH always require an OPTIONS preflight; if `Access-Control-Allow-Methods` is missing the method, the browser throws `TypeError: Failed to fetch` before the actual request is sent. Also set `preflightContinue: false` and `optionsSuccessStatus: 204`.
- **`request.body ?? {}` before `safeParse` in optional-body PATCH handlers** — the lenient JSON parser (Session 24 workaround) returns `null` for empty/missing bodies. `z.object({}).safeParse(null)` fails. Apply `?? {}` before parsing in PATCH routes that allow an empty body.
- **Prisma upsert for user-settings rows** — `upsert({ where: { user_id }, create: { ...defaults }, update: {} })` is the get-or-create pattern for rows that auto-provision on first access (e.g., NotificationPreferences). For update handlers, pass partial data directly as `update`.
- **Structured logging pattern** — `onResponse` hook in `server/index.ts` emits `{ requestId, method, url, statusCode, responseTime, userId }` via `fastify.log.info()`. Use `request.id` (Fastify auto-assigns) and `reply.elapsedTime` (ms since request received). `userId` is `request.user?.id ?? null`.
- **Two health endpoints** — `/health` is a liveness probe (always 200, no dep checks; used by Railway container health). `/api/v1/health` is a readiness probe (checks Postgres/Redis/Meilisearch; returns 503 when any dep is down). Use the readiness probe for uptime monitoring and deploy gates.
