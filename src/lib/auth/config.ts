import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import type { NextAuthConfig } from 'next-auth'

const FASTIFY_API_URL = process.env['FASTIFY_API_URL'] ?? 'http://localhost:3001'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Find or create a DB user for OAuth sign-ins. Returns the DB user id. */
async function findOrCreateOAuthUser(email: string, name: string | null, image: string | null) {
  const { prisma } = await import('@/lib/prisma')

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, display_name: true, avatar_url: true },
  })

  if (existing) return existing

  return prisma.user.create({
    data: {
      email,
      display_name: name ?? email.split('@')[0],
      avatar_url: image ?? null,
      // OAuth users authenticate via their provider — no local password
      password_hash: '',
    },
    select: { id: true, display_name: true, avatar_url: true },
  })
}

// ── NextAuth Config ───────────────────────────────────────────────────────────

export const authConfig: NextAuthConfig = {
  // JWT strategy is the default in v5 (no database adapter required)
  session: { strategy: 'jwt' },

  // Custom pages — map to the (auth) route group
  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    // ── Credentials ──────────────────────────────────────────────────────
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        try {
          const res = await fetch(`${FASTIFY_API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          })

          if (!res.ok) return null

          const { data } = (await res.json()) as {
            data: {
              user: {
                id: string
                email: string
                displayName: string
                avatarUrl: string | null
              }
            }
          }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.displayName,
            displayName: data.user.displayName,
            avatarUrl: data.user.avatarUrl,
          }
        } catch {
          return null
        }
      },
    }),

    // ── Google OAuth ──────────────────────────────────────────────────────
    Google({
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    }),

    // ── GitHub OAuth ──────────────────────────────────────────────────────
    GitHub({
      clientId: process.env['GITHUB_CLIENT_ID'] ?? '',
      clientSecret: process.env['GITHUB_CLIENT_SECRET'] ?? '',
    }),
  ],

  callbacks: {
    /**
     * JWT callback — runs whenever a JWT is created or updated.
     * On first sign-in, `user` and `account` are populated.
     * On subsequent requests, only `token` is provided.
     */
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === 'update' && session?.displayName) {
        token.displayName = session.displayName as string
      }
      if (account && user) {
        if (account.type === 'credentials') {
          // Credentials: user object comes directly from authorize()
          token.userId = user.id ?? ''
          token.displayName = user.displayName ?? user.name ?? ''
          token.avatarUrl = user.avatarUrl ?? null
        } else if (account.type === 'oauth') {
          // OAuth: look up or create the user in the database
          const email = user.email
          if (!email) return token

          const dbUser = await findOrCreateOAuthUser(email, user.name ?? null, user.image ?? null)
          token.userId = dbUser.id
          token.displayName = dbUser.display_name
          token.avatarUrl = dbUser.avatar_url
        }
      }
      return token
    },

    /**
     * Session callback — shapes the session object returned to the client.
     * Copies custom fields from the JWT into the session.
     */
    async session({ session, token }) {
      if (session.user) {
        // token.sub is the standard JWT subject (always set by NextAuth to the user's id).
        // Fall back to it when token.userId is absent or empty (e.g. JWTs minted by old
        // code before the userId field was added to the jwt callback).
        session.user.id = token.userId || token.sub || ''
        session.user.displayName = (token.displayName as string) ?? ''
        session.user.avatarUrl = (token.avatarUrl as string | null) ?? null
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
