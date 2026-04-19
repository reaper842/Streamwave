import { config } from 'dotenv'

// Load .env first, then .env.local (which takes priority — matches Next.js behaviour).
// This module MUST be the first import in server/index.ts so that process.env is
// populated before any other module reads environment variables at evaluation time
// (e.g. server/lib/prisma.ts reads DATABASE_URL, server/plugins/auth.ts reads NEXTAUTH_SECRET).
config()
config({ path: '.env.local', override: true })
