/**
 * Integration tests for POST /api/v1/auth/login
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 *
 * The rate-limit test uses a unique X-Forwarded-For IP so it never interferes
 * with other test suites running in the same session.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

// ── Shared test user ───────────────────────────────────────────────────────────

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `login_demo_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'LoginTest1'
const DEMO_DISPLAY = 'Login Test User'

/** IP used for rate-limit tests — isolated so it never leaks into other tests. */
const RATE_LIMIT_IP = `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`

// ── Helpers ───────────────────────────────────────────────────────────────────

function post(app: FastifyInstance, body: Record<string, unknown>, overrideIp?: string) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/login',
    payload: body as object,
    headers: {
      'content-type': 'application/json',
      ...(overrideIp ? { 'x-forwarded-for': overrideIp } : {}),
    },
  })
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()

  // Clear any stale failed-login counter from previous test runs to prevent 429s.
  await app.redis.del('auth_fail:127.0.0.1')

  // Create the shared demo user by going through the register endpoint
  // so the password is hashed with the same BCRYPT_COST as tests use.
  await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      displayName: DEMO_DISPLAY,
    },
    headers: { 'content-type': 'application/json' },
  })
})

afterAll(async () => {
  // Delete only the exact user(s) created by this file — avoids racing with
  // register.test.ts which runs in a parallel worker and shares the same DB.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('200: returns user profile and token cookies for valid credentials', async () => {
    const res = await post(app, { email: DEMO_EMAIL, password: DEMO_PASSWORD })

    expect(res.statusCode).toBe(200)

    const body = res.json<{ data: { user: Record<string, unknown>; expiresIn: number } }>()
    expect(body.data.user.email).toBe(DEMO_EMAIL)
    expect(body.data.user.displayName).toBe(DEMO_DISPLAY)
    expect(body.data.user).not.toHaveProperty('password_hash')
    expect(body.data.expiresIn).toBe(900)
  })

  it('200: sets HttpOnly access_token and refresh_token cookies', async () => {
    const res = await post(app, { email: DEMO_EMAIL, password: DEMO_PASSWORD })

    expect(res.statusCode).toBe(200)
    const cookies = res.headers['set-cookie']
    const cookieList = Array.isArray(cookies) ? cookies : [cookies]
    expect(cookieList).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/access_token=/),
        expect.stringMatching(/refresh_token=/),
        expect.stringMatching(/HttpOnly/),
      ]),
    )
  })

  it('401: returns INVALID_CREDENTIALS for wrong password', async () => {
    const res = await post(app, { email: DEMO_EMAIL, password: 'WrongPass1' })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string; details: Record<string, unknown> } }>()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
    expect(body.error.details).toHaveProperty('attemptsRemaining')
  })

  it('401: returns INVALID_CREDENTIALS for non-existent user', async () => {
    const res = await post(app, {
      email: `nobody_${Date.now()}${TEST_DOMAIN}`,
      password: 'Password1',
    })

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('400: returns VALIDATION_ERROR for invalid email format', async () => {
    const res = await post(app, { email: 'not-an-email', password: 'Password1' })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400: returns VALIDATION_ERROR when body is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {},
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('401: error response includes attemptsRemaining count', async () => {
    // Use a dedicated IP so this sub-test doesn't bleed into rate-limit test
    const isolatedIp = `10.88.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    const res = await post(app, { email: DEMO_EMAIL, password: 'WrongPass1' }, isolatedIp)

    expect(res.statusCode).toBe(401)
    const body = res.json<{ error: { details: { attemptsRemaining: number } } }>()
    expect(typeof body.error.details.attemptsRemaining).toBe('number')
    expect(body.error.details.attemptsRemaining).toBeLessThanOrEqual(4)
  })

  it('429: returns AUTH_RATE_LIMITED after 5 consecutive failed attempts', async () => {
    // Exhaust the 5-failure window on the isolated IP
    for (let i = 0; i < 5; i++) {
      await post(app, { email: DEMO_EMAIL, password: 'BadPassword1' }, RATE_LIMIT_IP)
    }

    const res = await post(app, { email: DEMO_EMAIL, password: DEMO_PASSWORD }, RATE_LIMIT_IP)

    expect(res.statusCode).toBe(429)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('AUTH_RATE_LIMITED')
  })

  it('200: correct login succeeds after a non-blocking number of failures (< 5)', async () => {
    // A fresh IP with only 1 failure should still allow a correct login
    const freshIp = `10.77.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    await post(app, { email: DEMO_EMAIL, password: 'WrongPass1' }, freshIp)

    const res = await post(app, { email: DEMO_EMAIL, password: DEMO_PASSWORD }, freshIp)
    expect(res.statusCode).toBe(200)
  })
})
