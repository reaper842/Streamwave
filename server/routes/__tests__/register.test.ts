/**
 * Integration tests for POST /api/v1/auth/register
 *
 * Requires:
 *  - PostgreSQL running (docker compose up -d)
 *  - Redis running
 *
 * Each test uses a unique email under the @test.streamwave.invalid domain
 * to avoid conflicts. All created users are deleted in afterAll.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_DOMAIN = '@test.streamwave.invalid'
const createdEmails = new Set<string>()

function testEmail(label: string) {
  const email = `reg_${label}_${Date.now()}${TEST_DOMAIN}`
  createdEmails.add(email)
  return email
}

function post(app: FastifyInstance, body: Record<string, unknown>) {
  return app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: body as object,
    headers: { 'content-type': 'application/json' },
  })
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  // Remove all users created by this test file
  if (createdEmails.size > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: Array.from(createdEmails) } },
    })
  }
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('201: creates a new user and returns access token + user profile', async () => {
    const email = testEmail('happy')
    const res = await post(app, {
      email,
      password: 'Password1',
      displayName: 'Test User',
    })

    expect(res.statusCode).toBe(201)

    const body = res.json<{ data: { user: Record<string, unknown>; expiresIn: number } }>()
    expect(body.data.user.email).toBe(email)
    expect(body.data.user.displayName).toBe('Test User')
    expect(body.data.user).not.toHaveProperty('password_hash')
    expect(body.data.expiresIn).toBe(900)
  })

  it('201: sets HttpOnly access_token and refresh_token cookies', async () => {
    const email = testEmail('cookies')
    const res = await post(app, {
      email,
      password: 'Password1',
      displayName: 'Cookie User',
    })

    expect(res.statusCode).toBe(201)
    const cookies = res.headers['set-cookie']
    expect(Array.isArray(cookies) ? cookies : [cookies]).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/access_token=/),
        expect.stringMatching(/refresh_token=/),
        expect.stringMatching(/HttpOnly/),
      ]),
    )
  })

  it('409: returns EMAIL_TAKEN when email already exists', async () => {
    const email = testEmail('dup')
    // First registration succeeds
    await post(app, { email, password: 'Password1', displayName: 'First' })

    // Second registration with same email
    const res = await post(app, { email, password: 'Password2', displayName: 'Second' })

    expect(res.statusCode).toBe(409)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('EMAIL_TAKEN')
  })

  it('400: rejects a password shorter than 8 characters', async () => {
    const res = await post(app, {
      email: testEmail('shortpw'),
      password: 'Pass1',
      displayName: 'User',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string; message: string } }>()
    expect(body.error.code).toBe('INVALID_PASSWORD')
    expect(body.error.message).toMatch(/8 characters/)
  })

  it('400: rejects a password without an uppercase letter', async () => {
    const res = await post(app, {
      email: testEmail('noupper'),
      password: 'password1',
      displayName: 'User',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string; message: string } }>()
    expect(body.error.code).toBe('INVALID_PASSWORD')
    expect(body.error.message).toMatch(/uppercase/)
  })

  it('400: rejects a password without a number', async () => {
    const res = await post(app, {
      email: testEmail('nonum'),
      password: 'PasswordA',
      displayName: 'User',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string; message: string } }>()
    expect(body.error.code).toBe('INVALID_PASSWORD')
    expect(body.error.message).toMatch(/number/)
  })

  it('400: rejects an invalid email format', async () => {
    const res = await post(app, {
      email: 'not-an-email',
      password: 'Password1',
      displayName: 'User',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400: rejects missing email field', async () => {
    const res = await post(app, { password: 'Password1', displayName: 'User' })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400: rejects missing displayName field', async () => {
    const res = await post(app, {
      email: `${Date.now()}${TEST_DOMAIN}`,
      password: 'Password1',
    })

    expect(res.statusCode).toBe(400)
    const body = res.json<{ error: { code: string } }>()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('400: rejects empty body', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {},
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(400)
  })

  it('persists the user in the database after successful registration', async () => {
    const email = testEmail('persist')
    await post(app, { email, password: 'Password1', displayName: 'DB User' })

    const user = await prisma.user.findUnique({ where: { email } })
    expect(user).not.toBeNull()
    expect(user?.display_name).toBe('DB User')
    expect(user?.password_hash).toBeTruthy()
    // Password must not be stored in plain text
    expect(user?.password_hash).not.toBe('Password1')
  })
})
