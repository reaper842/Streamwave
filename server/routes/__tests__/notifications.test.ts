/**
 * Integration tests for the notification preferences endpoints:
 *   GET   /api/v1/users/me/notifications
 *   PATCH /api/v1/users/me/notifications
 *
 * Requires: PostgreSQL + Redis (docker compose up -d)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../../test/buildApp'
import { prisma } from '../../lib/prisma'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TEST_DOMAIN = '@test.streamwave.invalid'
const EMAIL = `notif_${Date.now()}${TEST_DOMAIN}`
const PASSWORD = 'NotifTest1'
const DISPLAY = 'Notif Test User'

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookieValue(
  res: { headers: Record<string, unknown> },
  name: string,
): string | undefined {
  const cookies = res.headers['set-cookie']
  const list = Array.isArray(cookies) ? cookies : [cookies as string]
  const found = list.find((c) => c?.startsWith(`${name}=`))
  return found?.split(';')[0]?.replace(`${name}=`, '')
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

let app: FastifyInstance
let accessToken: string
let userId: string

beforeAll(async () => {
  app = await buildApp()

  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: { email: EMAIL, password: PASSWORD, displayName: DISPLAY },
    headers: { 'content-type': 'application/json' },
  })

  expect(res.statusCode).toBe(201)
  const token = getCookieValue(res, 'access_token')
  if (!token) throw new Error('No access_token after register')
  accessToken = token

  const body = JSON.parse(res.body) as { data: { user: { id: string } } }
  userId = body.data.user.id
})

afterAll(async () => {
  await prisma.notificationPreferences.deleteMany({ where: { user_id: userId } })
  await prisma.user.deleteMany({ where: { email: EMAIL } })
  await app.close()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/v1/users/me/notifications', () => {
  it('returns default preferences on first fetch (upsert create)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as { data: Record<string, boolean> }
    expect(body.data.new_releases).toBe(true)
    expect(body.data.playlist_updates).toBe(false)
    expect(body.data.account_security).toBe(true)
    expect(body.data.product_updates).toBe(false)
  })

  it('returns same row on repeat fetch (idempotent)', async () => {
    const r1 = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
    })
    const r2 = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
    })

    expect(JSON.parse(r1.body)).toEqual(JSON.parse(r2.body))
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/notifications',
    })
    expect(res.statusCode).toBe(401)
  })
})

describe('PATCH /api/v1/users/me/notifications', () => {
  it('toggles a single flag', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
      payload: { new_releases: false },
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as { data: Record<string, boolean> }
    expect(body.data.new_releases).toBe(false)
    // Other fields unchanged
    expect(body.data.account_security).toBe(true)
    expect(body.data.product_updates).toBe(false)
  })

  it('toggles multiple flags in one request', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
      payload: { playlist_updates: true, product_updates: true },
      headers: { 'content-type': 'application/json' },
    })

    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body) as { data: Record<string, boolean> }
    expect(body.data.playlist_updates).toBe(true)
    expect(body.data.product_updates).toBe(true)
  })

  it('persists changes — GET returns updated values', async () => {
    await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
      payload: { account_security: false },
      headers: { 'content-type': 'application/json' },
    })

    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
    })

    const body = JSON.parse(res.body) as { data: Record<string, boolean> }
    expect(body.data.account_security).toBe(false)
  })

  it('returns 400 for invalid payload (non-boolean value)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
      payload: { new_releases: 'yes' },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('accepts empty body (no-op update)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      cookies: { access_token: accessToken },
    })
    expect(res.statusCode).toBe(200)
  })

  it('returns 401 when unauthenticated', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/me/notifications',
      payload: { new_releases: true },
      headers: { 'content-type': 'application/json' },
    })
    expect(res.statusCode).toBe(401)
  })
})
