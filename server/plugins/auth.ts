import type { FastifyPluginAsync, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { decode } from '@auth/core/jwt'
import { verifyAccessToken } from '../services/auth'

declare module 'fastify' {
  interface FastifyRequest {
    user: { id: string; email: string } | null
  }
}

const AUTH_SECRET =
  process.env['NEXTAUTH_SECRET'] ?? process.env['AUTH_SECRET'] ?? 'dev-secret-change-in-production'

// NextAuth v5 cookie names
const NEXTAUTH_COOKIE_SECURE = '__Secure-authjs.session-token'
const NEXTAUTH_COOKIE_PLAIN = 'authjs.session-token'

/**
 * Extracts and verifies the caller identity from the incoming request.
 *
 * Priority:
 *  1. `Authorization: Bearer <token>` header or `access_token` cookie — custom JWT issued by Fastify
 *  2. `authjs.session-token` / `__Secure-authjs.session-token` cookie — NextAuth v5 encrypted session
 *
 * Sets `request.user` to `{ id, email }` when a valid session is found, `null` otherwise.
 */
const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('user', null)

  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    // ── 1. Custom Fastify JWT ─────────────────────────────────────────────

    let bearerToken: string | undefined

    const authHeader = request.headers.authorization
    if (authHeader?.startsWith('Bearer ')) {
      bearerToken = authHeader.slice(7)
    }

    if (!bearerToken) {
      bearerToken = (request.cookies as Record<string, string | undefined>)['access_token']
    }

    if (bearerToken) {
      try {
        const payload = verifyAccessToken(bearerToken)
        request.user = { id: payload.sub, email: payload.email }
        return
      } catch {
        // Token invalid — fall through to NextAuth check
      }
    }

    // ── 2. NextAuth v5 session cookie ─────────────────────────────────────

    const cookies = request.cookies as Record<string, string | undefined>
    const isSecure = !!(
      request.headers['x-forwarded-proto'] === 'https' || cookies[NEXTAUTH_COOKIE_SECURE]
    )
    const cookieName = isSecure ? NEXTAUTH_COOKIE_SECURE : NEXTAUTH_COOKIE_PLAIN
    const sessionToken = cookies[cookieName]

    if (!sessionToken) return

    try {
      const payload = await decode({
        token: sessionToken,
        secret: AUTH_SECRET,
        salt: cookieName,
      })

      if (payload?.userId && payload?.email) {
        request.user = {
          id: payload.userId as string,
          email: payload.email as string,
        }
      }
    } catch {
      // Invalid session cookie — leave request.user as null
    }
  })
}

export default fp(authPlugin, { name: 'auth' })

/**
 * Convenience helper to guard route handlers that require an authenticated user.
 * Throws a 401 Fastify error if `request.user` is null.
 *
 * Usage inside a route handler:
 *   const user = requireUser(request)
 */
export function requireUser(request: FastifyRequest): { id: string; email: string } {
  if (!request.user) {
    throw Object.assign(new Error('Authentication required'), {
      statusCode: 401,
      code: 'UNAUTHORIZED',
    })
  }
  return request.user
}
