/**
 * Integration tests for POST /api/v1/auth/refresh
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import jwt from 'jsonwebtoken'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `refresh_demo_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'RefreshTest1'
const DEMO_DISPLAY = 'Refresh Test User'

const JWT_SECRET = process.env['JWT_SECRET']!

// ── Helpers ───────────────────────────────────────────────────────────────────

function post(app: FastifyInstance, body: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/refresh',
    payload: body as object,
    headers: { 'content-type': 'application/json' },
  })
}

async function login(app: FastifyInstance) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    headers: { 'content-type': 'application/json' },
  })
  return res.json<{ data: { user: Record<string, unknown> } }>().data as unknown as {
    user: Record<string, unknown>
    expiresIn: number
  } & { refreshToken?: string }
}

/** Extract the raw refresh_token cookie value from a response. */
function getRefreshCookie(res: { headers: Record<string, unknown> }): string | undefined {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith('refresh_token='))
  return found?.split(';')[0]?.replace('refresh_token=', '')
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance
let validRefreshToken: string

beforeAll(async () => {
  app = await buildApp()

  // Clear any stale failed-login counter from previous test runs to prevent 429s.
  await app.redis.del('auth_fail:127.0.0.1')

  // Register then capture the refresh token
  const registerRes = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: DEMO_DISPLAY },
    headers: { 'content-type': 'application/json' },
  })

  const refreshToken = getRefreshCookie(registerRes)
  if (!refreshToken) throw new Error('Could not extract refresh_token from register response')
  validRefreshToken = refreshToken
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/refresh', () => {
  it('200: returns a new access token for a valid refresh token', async () => {
    const res = await post(app, { refreshToken: validRefreshToken })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { accessToken: string; expiresIn: number } }>()
    expect(typeof body.data.accessToken).toBe('string')
    expect(body.data.expiresIn).toBe(900) // 15 minutes
  })

  it('200: new access_token cookie is set in the response', async () => {
    const res = await post(app, { refreshToken: validRefreshToken })

    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie']
    const list = Array.isArray(cookies) ? cookies : [cookies as string]
    expect(list.some((c) => c?.startsWith('access_token='))).toBe(true)
    expect(list.some((c) => c?.includes('HttpOnly'))).toBe(true)
  })

  it('200: the returned access token is verifiable with JWT_SECRET', async () => {
    const res = await post(app, { refreshToken: validRefreshToken })

    const { accessToken } = res.json<{ data: { accessToken: string } }>().data
    const decoded = jwt.verify(accessToken, JWT_SECRET) as Record<string, unknown>
    expect(decoded['type']).toBe('access')
    expect(typeof decoded['sub']).toBe('string')
    expect(typeof decoded['email']).toBe('string')
  })

  it('200: also accepts refresh token from the cookie header', async () => {
    // Send no body — the route should fall back to the cookie
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {} as object,
      headers: {
        'content-type': 'application/json',
        cookie: `refresh_token=${validRefreshToken}`,
      },
    })

    expect(res.statusCode).toBe(200)
  })

  it('400: returns MISSING_TOKEN when no token is provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: {} as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('MISSING_TOKEN')
  })

  it('401: returns INVALID_TOKEN for a token signed with the wrong secret', async () => {
    const bogusToken = jwt.sign(
      { sub: 'some-id', jti: 'fake-jti', type: 'refresh' },
      'wrong-secret',
      { expiresIn: '7d' },
    )
    const res = await post(app, { refreshToken: bogusToken })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('401: returns INVALID_TOKEN for an expired refresh token', async () => {
    const expiredToken = jwt.sign(
      { sub: 'some-id', jti: 'expired-jti', type: 'refresh', iat: 1_000_000, exp: 1_000_001 },
      JWT_SECRET,
    )
    const res = await post(app, { refreshToken: expiredToken })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('401: returns INVALID_TOKEN for a structurally invalid string', async () => {
    const res = await post(app, { refreshToken: 'not.a.valid.jwt.string' })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_TOKEN')
  })

  it('401: returns TOKEN_REVOKED for a refresh token that has been logged out', async () => {
    // Issue a fresh pair via a second login, then immediately log out that session
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
      headers: { 'content-type': 'application/json' },
    })
    const tokenToRevoke = getRefreshCookie(loginRes)
    if (!tokenToRevoke) throw new Error('No refresh token after login')

    // Revoke via logout
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken: tokenToRevoke },
      headers: { 'content-type': 'application/json' },
    })

    // Attempting to refresh with the revoked token should fail
    const res = await post(app, { refreshToken: tokenToRevoke })
    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('TOKEN_REVOKED')
  })
})
