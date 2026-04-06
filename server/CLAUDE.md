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
GET    /api/v1/albums/:id
GET    /api/v1/artists/:id
GET    /api/v1/artists/:id/albums
GET    /api/v1/search?q=&type=
GET    /api/v1/library/liked-songs
POST   /api/v1/library/liked-songs/:trackId
DELETE /api/v1/library/liked-songs/:trackId
GET    /api/v1/playlists/:id
POST   /api/v1/playlists
PATCH  /api/v1/playlists/:id
DELETE /api/v1/playlists/:id
POST   /api/v1/playlists/:id/tracks
DELETE /api/v1/playlists/:id/tracks/:trackId
PATCH  /api/v1/playlists/:id/tracks/reorder
GET    /api/v1/browse/genres
GET    /api/v1/browse/featured
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

- 67/67 server tests passing: 20 unit (auth helpers) + 11 register + 9 login + 8 refresh + 6 logout + 11 password-reset
- 39/39 client tests passing: 22 AudioEngine unit + 17 usePlayerStore unit
- Run server tests: `npm run test` | Run client tests: `npm run test:client`

---

## Key Backend Files

- `server/index.ts` — Fastify entry point, plugin/route registration
- `server/services/auth.ts` — All auth business logic (register, login, tokens, password reset)
- `server/plugins/auth.ts` — JWT verification plugin (dual-verify: custom JWT + NextAuth cookie)
- `server/plugins/rate-limit.ts` — Redis-backed rate limiting
- `server/plugins/redis.ts` — ioredis singleton
- `server/plugins/meilisearch.ts` — Meilisearch client
- `server/lib/prisma.ts` — Prisma singleton with PrismaPg adapter
- `server/routes/auth.ts` — All 6 auth route handlers
- `server/test/buildApp.ts` — Test Fastify factory (no rate-limit plugin)

---

## Gotchas

- `@fastify/rate-limit` uses Redis with shared IP key — MUST exclude from test builds
- Zod v4 import: `zod/v4` not `zod`
- `jwt` callback is where OAuth auto-create happens (not `signIn` callback)
- `next-auth@beta` requires `--legacy-peer-deps` (peer dep conflict with Next.js 16)
- `tsx` used instead of `ts-node` for running server/seed (handles ESM packages cleanly)
- Meilisearch JS client v0.57 exports `Meilisearch` (lowercase), not `MeiliSearch`
- Fastify plugins use `fp()` (fastify-plugin) for decoration visibility across scopes
