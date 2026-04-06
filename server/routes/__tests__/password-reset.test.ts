/**
 * Integration tests for the password reset flow:
 *   POST /api/v1/auth/password-reset          — request reset email
 *   POST /api/v1/auth/password-reset/confirm   — confirm with token + new password
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 *
 * Note: The request endpoint is fire-and-forget and always returns 200.
 *       The confirm endpoint requires a real Redis token, so we reach into
 *       the service layer to generate one deterministically.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import crypto from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

const TEST_DOMAIN = '@test.streamwave.invalid'
const DEMO_EMAIL = `pwreset_demo_${Date.now()}${TEST_DOMAIN}`
const DEMO_PASSWORD = 'ResetTest1'
const DEMO_DISPLAY = 'Reset Test User'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Plant a reset token in Redis exactly as the service does, bypassing email. */
async function plantResetToken(app: FastifyInstance, userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex')
  await app.redis.set(`pwd_reset:${token}`, userId, 'EX', 3600)
  return token
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance
let demoUserId: string

beforeAll(async () => {
  app = await buildApp()

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: DEMO_EMAIL, password: DEMO_PASSWORD, displayName: DEMO_DISPLAY },
    headers: { 'content-type': 'application/json' },
  })

  demoUserId = res.json<{ data: { user: { id: string } } }>().data.user.id
})

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })
  await app.close()
})

// ── Request reset ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/password-reset (request)', () => {
  it('200: returns 200 for a valid email that exists in the database', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: { email: DEMO_EMAIL } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { message: string } }>()
    expect(body.data.message).toMatch(/reset link/i)
  })

  it('200: also returns 200 for an email that does NOT exist (prevents user enumeration)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: { email: `nobody_${Date.now()}${TEST_DOMAIN}` } as object,
      headers: { 'content-type': 'application/json' },
    })

    // Must not reveal whether the account exists
    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { message: string } }>()
    expect(body.data.message).toBeTruthy()
  })

  it('400: returns VALIDATION_ERROR for an invalid email format', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: { email: 'not-an-email' } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400: returns VALIDATION_ERROR when body is empty', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset',
      payload: {} as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ── Confirm reset ─────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/password-reset/confirm', () => {
  it('200: updates the password for a valid token', async () => {
    const token = await plantResetToken(app, demoUserId)
    const newPassword = 'NewPassword2'

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(200)
    const body = res.json<{ data: { message: string } }>()
    expect(body.data.message).toMatch(/password updated/i)
  })

  it('200: the new password works for login after confirmation', async () => {
    const newPassword = 'UpdatedPass3'
    const token = await plantResetToken(app, demoUserId)

    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword } as object,
      headers: { 'content-type': 'application/json' },
    })

    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: DEMO_EMAIL, password: newPassword },
      headers: { 'content-type': 'application/json' },
    })

    expect(loginRes.statusCode).toBe(200)

    // Restore the original password for subsequent tests
    const restoreToken = await plantResetToken(app, demoUserId)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token: restoreToken, newPassword: DEMO_PASSWORD } as object,
      headers: { 'content-type': 'application/json' },
    })
  })

  it('400: returns INVALID_RESET_TOKEN for a token not present in Redis', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token: 'deadbeefdeadbeefdeadbeef', newPassword: 'NewPass1' } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_RESET_TOKEN')
  })

  it('400: returns INVALID_RESET_TOKEN for an expired (deleted) token', async () => {
    const token = await plantResetToken(app, demoUserId)

    // Manually delete it to simulate expiry
    await app.redis.del(`pwd_reset:${token}`)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword: 'NewPass1' } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_RESET_TOKEN')
  })

  it('400: a token is single-use — second confirmation attempt fails', async () => {
    const token = await plantResetToken(app, demoUserId)

    // First use succeeds
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword: 'SingleUse1' } as object,
      headers: { 'content-type': 'application/json' },
    })

    // Second use with the same token must fail
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token, newPassword: 'SingleUse2' } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_RESET_TOKEN')

    // Restore password
    const restoreToken = await plantResetToken(app, demoUserId)
    await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: { token: restoreToken, newPassword: DEMO_PASSWORD } as object,
      headers: { 'content-type': 'application/json' },
    })
  })

  it('400: returns INVALID_PASSWORD when new password fails validation rules', async () => {
    const token = await plantResetToken(app, demoUserId)

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      // Fails: no uppercase, no number, too short
      payload: { token, newPassword: 'weak' } as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('INVALID_PASSWORD')
  })

  it('400: returns VALIDATION_ERROR when body fields are missing', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/password-reset/confirm',
      payload: {} as object,
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
