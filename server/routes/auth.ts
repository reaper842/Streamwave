import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import {
  registerUser,
  loginUser,
  refreshAccessToken,
  logoutUser,
  requestPasswordReset,
  confirmPasswordReset,
  recordFailedAttempt,
  getFailedAttempts,
  clearFailedAttempts,
} from '../services/auth'

// ── Zod schemas ──────────────────────────────────────────────────────────────

const RegisterBody = z.object({
  email: z.email(),
  password: z.string().min(1),
  displayName: z.string().min(1).max(50),
})

const LoginBody = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const RefreshBody = z.object({
  refreshToken: z.string().min(1),
})

const LogoutBody = z.object({
  refreshToken: z.string().min(1),
})

const PasswordResetBody = z.object({
  email: z.email(),
})

const PasswordResetConfirmBody = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(1),
})

// ── Route plugin ─────────────────────────────────────────────────────────────

const AUTH_RATE_LIMIT = 5
const AUTH_WINDOW_MS = 15 * 60 // 15 minutes in seconds

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const redis = fastify.redis

  /**
   * POST /api/v1/auth/register
   * Create a new user account with email/password.
   */
  fastify.post('/register', {
    config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const body = RegisterBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
          },
        })
      }

      const { email, password, displayName } = body.data
      const { user, tokens } = await registerUser(email, password, displayName, redis)

      reply
        .setCookie('access_token', tokens.accessToken, cookieOpts(tokens.expiresIn))
        .setCookie('refresh_token', tokens.refreshToken, cookieOpts(7 * 24 * 60 * 60))
        .status(201)
        .send({ data: { user, expiresIn: tokens.expiresIn } })
    },
  })

  /**
   * POST /api/v1/auth/login
   * Authenticate with email and password.
   * Tracks failed attempts per IP; blocks after 5 failures in 15 minutes.
   */
  fastify.post('/login', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      const ip = getClientIp(request)

      // Check if IP is blocked before even parsing the body
      const failures = await getFailedAttempts(ip, redis)
      if (failures >= AUTH_RATE_LIMIT) {
        return reply.status(429).send({
          error: {
            code: 'AUTH_RATE_LIMITED',
            message: 'Too many failed login attempts. Try again in 15 minutes.',
          },
        })
      }

      const body = LoginBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
          },
        })
      }

      const { email, password } = body.data

      try {
        const { user, tokens } = await loginUser(email, password, redis)
        await clearFailedAttempts(ip, redis)

        reply
          .setCookie('access_token', tokens.accessToken, cookieOpts(tokens.expiresIn))
          .setCookie('refresh_token', tokens.refreshToken, cookieOpts(7 * 24 * 60 * 60))
          .send({ data: { user, expiresIn: tokens.expiresIn } })
      } catch (err: unknown) {
        if (isAppError(err) && err.code === 'INVALID_CREDENTIALS') {
          const newCount = await recordFailedAttempt(ip, redis)
          const remaining = Math.max(0, AUTH_RATE_LIMIT - newCount)
          return reply.status(401).send({
            error: {
              code: 'INVALID_CREDENTIALS',
              message: err.message,
              details: { attemptsRemaining: remaining, windowSecs: AUTH_WINDOW_MS },
            },
          })
        }
        throw err
      }
    },
  })

  /**
   * POST /api/v1/auth/refresh
   * Exchange a refresh token for a new access token.
   */
  fastify.post('/refresh', {
    handler: async (request, reply) => {
      // Accept refresh token from body or cookie
      let refreshToken: string | undefined
      const body = RefreshBody.safeParse(request.body)
      if (body.success) {
        refreshToken = body.data.refreshToken
      } else {
        refreshToken = (request.cookies as Record<string, string | undefined>)['refresh_token']
      }

      if (!refreshToken) {
        return reply.status(400).send({
          error: { code: 'MISSING_TOKEN', message: 'Refresh token is required' },
        })
      }

      const { accessToken, expiresIn } = await refreshAccessToken(refreshToken, redis)

      reply
        .setCookie('access_token', accessToken, cookieOpts(expiresIn))
        .send({ data: { accessToken, expiresIn } })
    },
  })

  /**
   * POST /api/v1/auth/logout
   * Invalidate the refresh token and clear auth cookies.
   */
  fastify.post('/logout', {
    handler: async (request, reply) => {
      // Accept refresh token from body or cookie
      let refreshToken: string | undefined
      const body = LogoutBody.safeParse(request.body)
      if (body.success) {
        refreshToken = body.data.refreshToken
      } else {
        refreshToken = (request.cookies as Record<string, string | undefined>)['refresh_token']
      }

      if (refreshToken) {
        await logoutUser(refreshToken, redis)
      }

      reply
        .clearCookie('access_token', { path: '/' })
        .clearCookie('refresh_token', { path: '/' })
        .status(204)
        .send()
    },
  })

  /**
   * POST /api/v1/auth/password-reset
   * Send a password reset email. Always returns 200 to prevent user enumeration.
   */
  fastify.post('/password-reset', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
    handler: async (request, reply) => {
      const body = PasswordResetBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
          },
        })
      }

      // Fire-and-forget: don't await to prevent timing-based user enumeration
      requestPasswordReset(body.data.email, redis).catch((err: unknown) => {
        fastify.log.error({ err }, 'Failed to send password reset email')
      })

      reply.send({
        data: { message: 'If an account with that email exists, a reset link has been sent.' },
      })
    },
  })

  /**
   * POST /api/v1/auth/password-reset/confirm
   * Validate reset token and update password.
   */
  fastify.post('/password-reset/confirm', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    handler: async (request, reply) => {
      const body = PasswordResetConfirmBody.safeParse(request.body)
      if (!body.success) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.issues,
          },
        })
      }

      await confirmPasswordReset(body.data.token, body.data.newPassword, redis)
      reply.send({ data: { message: 'Password updated successfully. You can now log in.' } })
    },
  })
}

export default authRoutes

// ── Helpers ──────────────────────────────────────────────────────────────────

function cookieOpts(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSec,
  }
}

function getClientIp(request: {
  ip: string
  headers: Record<string, string | string[] | undefined>
}): string {
  const forwarded = request.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0]?.trim() ?? request.ip
  }
  return request.ip
}

interface AppError extends Error {
  code?: string
  statusCode?: number
}

function isAppError(err: unknown): err is AppError {
  return err instanceof Error
}
