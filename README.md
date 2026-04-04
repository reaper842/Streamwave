# StreamWave

A Spotify-replica music streaming platform built with Next.js, Fastify, PostgreSQL, Redis, and Meilisearch.

---

## Prerequisites

Follow the full environment setup checklist in `PLANNING.md` before proceeding.

| Tool           | Minimum Version |
| -------------- | --------------- |
| Node.js        | 20 LTS          |
| npm            | 10+             |
| Docker         | 24+             |
| Docker Compose | v2              |
| Git            | 2.40+           |

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> streamwave
cd streamwave
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

### 3. Start infrastructure services

```bash
docker compose up -d
# Starts PostgreSQL (5432), Redis (6379), Meilisearch (7700)
```

### 4. Set up the database

```bash
# Run migrations
npx prisma migrate dev --name init

# Seed with demo data (10 artists, 50 albums, 500 tracks, 5 playlists, 1 demo user)
npx prisma db seed
```

Demo credentials: `demo@streamwave.app` / `Demo1234`

### 5. Start the development server

```bash
npm run dev
# Next.js → http://localhost:3000
# Fastify  → http://localhost:3001
```

---

## Available Scripts

| Command                  | Description                          |
| ------------------------ | ------------------------------------ |
| `npm run dev`            | Start Next.js + Fastify concurrently |
| `npm run dev:next`       | Next.js only                         |
| `npm run dev:server`     | Fastify only                         |
| `npm run build`          | Production build                     |
| `npm start`              | Start production server              |
| `npm run lint`           | Run ESLint                           |
| `npm run format`         | Format with Prettier                 |
| `npx prisma migrate dev` | Apply schema migrations              |
| `npx prisma generate`    | Regenerate Prisma client             |
| `npx prisma db seed`     | Seed the database                    |
| `npx prisma studio`      | Open Prisma Studio                   |

---

## Project Structure

```
streamwave/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── stores/           # Zustand state stores
│   ├── lib/
│   │   ├── api/          # Typed API client
│   │   └── audio/        # Howler.js AudioEngine
│   ├── hooks/            # Custom React hooks
│   └── types/            # TypeScript types & Zod schemas
├── server/
│   ├── index.ts          # Fastify entry point (port 3001)
│   ├── plugins/          # Fastify plugins (redis, meilisearch, auth)
│   ├── routes/           # API route handlers
│   └── services/         # Business logic
├── prisma/
│   ├── schema.prisma     # Database schema (9 models)
│   └── seed.ts           # Demo data seeder
├── docker-compose.yml    # Local infrastructure
├── .env.example          # Environment variable template
└── CLAUDE.md             # AI assistant context
```

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4, Zustand, Howler.js
- **Backend**: Fastify 5, NextAuth.js v5, Prisma 7
- **Database**: PostgreSQL 16, Redis 7, Meilisearch 1.6
- **Storage**: Cloudflare R2 (S3-compatible)
- **Language**: TypeScript (strict mode throughout)

See `CLAUDE.md` for the full tech spec and `PLANNING.md` for architecture decisions.
