/**
 * Unit tests for auth service helpers.
 *
 * These tests are pure — no database, no Redis, no network.
 * They run fast and in isolation.
 */
import { describe, it, expect, vi, type MockInstance } from 'vitest'
import jwt from 'jsonwebtoken'
import type { Redis } from 'ioredis'
import { validatePassword, generateTokenPair, verifyAccessToken, PASSWORD_RULES } from '../auth'

// ── validatePassword ──────────────────────────────────────────────────────────

describe('validatePassword', () => {
  it('accepts a valid password with all requirements met', () => {
    expect(validatePassword('Password1')).toEqual({ valid: true })
    expect(validatePassword('Abc12345')).toEqual({ valid: true })
    expect(validatePassword('MyS3cur3P@ss!')).toEqual({ valid: true })
  })

  it('rejects a password shorter than 8 characters', () => {
    const result = validatePassword('Pass1')
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/8 characters/)
  })

  it('rejects a password with exactly 7 characters', () => {
    const result = validatePassword('Pass123') // 7 chars, has upper + number
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/8 characters/)
  })

  it('accepts a password with exactly 8 characters that meets all rules', () => {
    expect(validatePassword('Passw0rd')).toEqual({ valid: true })
  })

  it('rejects a password missing an uppercase letter', () => {
    const result = validatePassword('password1')
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/uppercase/)
  })

  it('rejects a password missing a number', () => {
    const result = validatePassword('PasswordA')
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/number/)
  })

  it('rejects an empty string', () => {
    const result = validatePassword('')
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/8 characters/)
  })

  it('enforces minLength is 8 as per PASSWORD_RULES constant', () => {
    expect(PASSWORD_RULES.minLength).toBe(8)
  })

  it('rejects password with only uppercase and numbers but too short', () => {
    const result = validatePassword('A1') // 2 chars
    expect(result.valid).toBe(false)
    expect(result.message).toMatch(/8 characters/)
  })
})

// ── generateTokenPair / verifyAccessToken ────────────────────────────────────

describe('generateTokenPair', () => {
  const userId = 'test-user-id-123'
  const email = 'test@example.com'

  // Minimal Redis mock — just needs set() to resolve
  const mockRedis = {
    set: vi.fn().mockResolvedValue('OK'),
  } as unknown as Redis

  it('returns accessToken, refreshToken, and expiresIn', async () => {
    const tokens = await generateTokenPair(userId, email, mockRedis)
    expect(tokens).toHaveProperty('accessToken')
    expect(tokens).toHaveProperty('refreshToken')
    expect(tokens).toHaveProperty('expiresIn')
    expect(typeof tokens.accessToken).toBe('string')
    expect(typeof tokens.refreshToken).toBe('string')
    expect(typeof tokens.expiresIn).toBe('number')
  })

  it('expiresIn is 900 seconds (15 minutes)', async () => {
    const tokens = await generateTokenPair(userId, email, mockRedis)
    expect(tokens.expiresIn).toBe(900)
  })

  it('access token payload contains sub, email, and type=access', async () => {
    const tokens = await generateTokenPair(userId, email, mockRedis)
    const decoded = jwt.decode(tokens.accessToken) as Record<string, unknown>
    expect(decoded['sub']).toBe(userId)
    expect(decoded['email']).toBe(email)
    expect(decoded['type']).toBe('access')
  })

  it('refresh token payload contains sub, jti, and type=refresh', async () => {
    const tokens = await generateTokenPair(userId, email, mockRedis)
    const decoded = jwt.decode(tokens.refreshToken) as Record<string, unknown>
    expect(decoded['sub']).toBe(userId)
    expect(decoded['jti']).toBeTruthy()
    expect(decoded['type']).toBe('refresh')
  })

  it('calls redis.set to store the refresh token jti', async () => {
    const redisMock = { set: vi.fn().mockResolvedValue('OK') } as unknown as Redis
    const tokens = await generateTokenPair(userId, email, redisMock)
    const decoded = jwt.decode(tokens.refreshToken) as Record<string, unknown>

    expect((redisMock.set as unknown as MockInstance).mock.calls.length).toBe(1)
    const [key, value, , ttl] = (redisMock.set as unknown as MockInstance).mock.calls[0]!
    expect(key).toBe(`refresh:${userId}:${decoded['jti']}`)
    expect(value).toBe('1')
    expect(ttl).toBe(7 * 24 * 60 * 60) // 7 days
  })

  it('generates a unique jti per call', async () => {
    const t1 = await generateTokenPair(userId, email, mockRedis)
    const t2 = await generateTokenPair(userId, email, mockRedis)
    const d1 = jwt.decode(t1.refreshToken) as Record<string, unknown>
    const d2 = jwt.decode(t2.refreshToken) as Record<string, unknown>
    expect(d1['jti']).not.toBe(d2['jti'])
  })
})

describe('verifyAccessToken', () => {
  const userId = 'verify-test-user'
  const email = 'verify@example.com'
  const secret = process.env['JWT_SECRET']!

  it('returns the payload for a valid access token', () => {
    const token = jwt.sign({ sub: userId, email, type: 'access' }, secret, {
      expiresIn: 900,
    })
    const payload = verifyAccessToken(token)
    expect(payload.sub).toBe(userId)
    expect(payload.email).toBe(email)
    expect(payload.type).toBe('access')
  })

  it('throws on a tampered token', () => {
    const token = jwt.sign({ sub: userId, email, type: 'access' }, 'wrong-secret', {
      expiresIn: 900,
    })
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('throws on a malformed string', () => {
    expect(() => verifyAccessToken('not.a.jwt')).toThrow()
  })

  it('throws on an expired token', () => {
    // Use past iat/exp to create an already-expired token
    const token = jwt.sign(
      { sub: userId, email, type: 'access', iat: 1_000_000, exp: 1_000_001 },
      secret,
    )
    expect(() => verifyAccessToken(token)).toThrow()
  })

  it('throws when passed a refresh token (type mismatch)', () => {
    const token = jwt.sign({ sub: userId, jti: 'some-jti', type: 'refresh' }, secret, {
      expiresIn: 604800,
    })
    expect(() => verifyAccessToken(token)).toThrow(/Not an access token/)
  })
})
