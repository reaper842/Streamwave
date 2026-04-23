/**
 * Integration tests for POST /api/v1/auth/logout
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `logout_demo_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'LogoutTest1'
const DEMO_DISPLAY = 'Logout Test User'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract the raw value of a named cookie from a response's set-cookie header. */
function getCookieValue(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith(`${name}=`))
  return found?.split(';')[0]?.replace(`${name}=`, '')
}

/** Login with the demo credentials and return the refresh token cookie value. */
async function loginAndGetRefreshToken(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    headers: { 'content-type': 'application/json' },
  })
  const token = getCookieValue(res, 'refresh_token')
  if (!token) throw new Error('No refresh_token cookie after login')
  return token
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()

  // Clear any stale failed-login counter from previous test runs to prevent 429s.
  await app.redis.del('auth_fail:127.0.0.1')

  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: DEMO_DISPLAY },
    headers: { 'content-type': 'application/json' },
  })
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/logout', () => {
  it('204: returns no content on successful logout with body token', async () => {
    const refreshToken = await loginAndGetRefreshToken(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(204)
    expect(res.body).toBe('')
  })

  it('204: clears the access_token cookie in the response', async () => {
    const refreshToken = await loginAndGetRefreshToken(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken } as object,
      headers: { 'content-type': 'application/json' },
    })

    const cookies = res.headers['set-cookie']
    const list = Array.isArray(cookies) ? cookies : [cookies as string]
    const accessCookie = list.find((c) => c?.startsWith('access_token='))
    // Cookie should be cleared: Max-Age=0 or expires in the past
    expect(accessCookie).toBeDefined()
    expect(accessCookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i)
  })

  it('204: clears the refresh_token cookie in the response', async () => {
    const refreshToken = await loginAndGetRefreshToken(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken } as object,
      headers: { 'content-type': 'application/json' },
    })

    const cookies = res.headers['set-cookie']
    const list = Array.isArray(cookies) ? cookies : [cookies as string]
    const refreshCookie = list.find((c) => c?.startsWith('refresh_token='))
    expect(refreshCookie).toBeDefined()
    expect(refreshCookie).toMatch(/Max-Age=0|expires=Thu, 01 Jan 1970/i)
  })

  it('204: also accepts the refresh token via cookie instead of body', async () => {
    const refreshToken = await loginAndGetRefreshToken(app)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {} as object,
      headers: {
        'content-type': 'application/json',
        cookie: `refresh_token=${refreshToken}`,
      },
    })

    expect(res.statusCode).toBe(204)
  })

  it('204: invalidates the refresh token so it cannot be used to get a new access token', async () => {
    const refreshToken = await loginAndGetRefreshToken(app)

    // Logout
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken } as object,
      headers: { 'content-type': 'application/json' },
    })

    // Attempt refresh with the now-revoked token
    const refreshRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(refreshRes.statusCode).toBe(401)
    const body = refreshRes.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('TOKEN_REVOKED')
  })

  it('204: returns 204 even when no token is provided (graceful no-op)', async () => {
    // Logout without a token — should still be idempotent
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: {} as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(204)
  })

  it('204: returns 204 for an already-invalid (garbage) refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      payload: { refreshToken: 'garbage.token.value' } as object,
      headers: { 'content-type': 'application/json' },
    })

    // logoutUser swallows token errors — logout is always graceful
    expect(res.statusCode).toBe(204)
  })
})
