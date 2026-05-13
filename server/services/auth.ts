import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'
import nodemailer from 'nodemailer'
import type { Redis } from 'ioredis'
import { prisma } from '../lib/prisma'

// ── Constants ───────────────────────────────────────────────────────────────

const JWT_SECRET =
  process.env['JWT_SECRET'] ?? process.env['NEXTAUTH_SECRET'] ?? 'dev-secret-change-in-production'
const ACCESS_TOKEN_TTL_SEC = 15 * 60 // 15 minutes
const REFRESH_TOKEN_TTL_SEC = 7 * 24 * 60 * 60 // 7 days
const PASSWORD_RESET_TTL_SEC = 60 * 60 // 1 hour
const BCRYPT_COST = parseInt(process.env['BCRYPT_COST'] ?? '12', 10)

// Redis key prefixes
const REFRESH_KEY = (userId: string, tokenId: string) => `refresh:${userId}:${tokenId}`
const RESET_KEY = (token: string) => `pwd_reset:${token}`
const RATE_KEY = (ip: string) => `auth_fail:${ip}`

// ── Password validation ──────────────────────────────────────────────────────

export const PASSWORD_RULES = {
  minLength: 8,
  requireUppercase: /[A-Z]/,
  requireNumber: /[0-9]/,
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < PASSWORD_RULES.minLength) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (!PASSWORD_RULES.requireUppercase.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!PASSWORD_RULES.requireNumber.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  return { valid: true }
}

// ── Token types ──────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string // userId
  email: string
  type: 'access'
}

export interface RefreshTokenPayload {
  sub: string // userId
  jti: string // unique token ID (stored in Redis)
  type: 'refresh'
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  createdAt: Date
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// ── Token generation ─────────────────────────────────────────────────────────

export function generateTokenPair(userId: string, email: string, redis: Redis): Promise<TokenPair> {
  const jti = crypto.randomUUID()

  const accessToken = jwt.sign(
    { sub: userId, email, type: 'access' } satisfies AccessTokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SEC },
  )

  const refreshToken = jwt.sign(
    { sub: userId, jti, type: 'refresh' } satisfies RefreshTokenPayload,
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL_SEC },
  )

  // Store refresh token ID in Redis so we can invalidate it
  return redis.set(REFRESH_KEY(userId, jti), '1', 'EX', REFRESH_TOKEN_TTL_SEC).then(() => ({
    accessToken,
    refreshToken,
    expiresIn: ACCESS_TOKEN_TTL_SEC,
  }))
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as AccessTokenPayload
  if (payload.type !== 'access') {
    throw new Error('Not an access token')
  }
  return payload
}

// ── Auth operations ──────────────────────────────────────────────────────────

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  redis: Redis,
): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const validation = validatePassword(password)
  if (!validation.valid) {
    throw Object.assign(new Error(validation.message), {
      code: 'INVALID_PASSWORD',
      statusCode: 400,
    })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw Object.assign(new Error('An account with this email already exists'), {
      code: 'EMAIL_TAKEN',
      statusCode: 409,
    })
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST)

  const user = await prisma.user.create({
    data: { email, password_hash: passwordHash, display_name: displayName },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      is_admin: true,
      created_at: true,
    },
  })

  const tokens = await generateTokenPair(user.id, user.email, redis)

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
    },
    tokens,
  }
}

export async function loginUser(
  email: string,
  password: string,
  redis: Redis,
): Promise<{ user: UserProfile; tokens: TokenPair }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_url: true,
      is_admin: true,
      created_at: true,
      password_hash: true,
    },
  })

  // Constant-time comparison even when user not found
  const hashToCompare = user?.password_hash ?? '$2b$12$invalid.hash.to.prevent.timing.attacks'
  const passwordMatch = await bcrypt.compare(password, hashToCompare)

  if (!user || !passwordMatch) {
    throw Object.assign(new Error('Invalid email or password'), {
      code: 'INVALID_CREDENTIALS',
      statusCode: 401,
    })
  }

  const tokens = await generateTokenPair(user.id, user.email, redis)

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      isAdmin: user.is_admin,
      createdAt: user.created_at,
    },
    tokens,
  }
}

export async function refreshAccessToken(
  refreshToken: string,
  redis: Redis,
): Promise<{ accessToken: string; expiresIn: number }> {
  let payload: RefreshTokenPayload
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as RefreshTokenPayload
  } catch {
    throw Object.assign(new Error('Invalid or expired refresh token'), {
      code: 'INVALID_TOKEN',
      statusCode: 401,
    })
  }

  if (payload.type !== 'refresh') {
    throw Object.assign(new Error('Not a refresh token'), {
      code: 'INVALID_TOKEN',
      statusCode: 401,
    })
  }

  // Verify the token is still valid in Redis (not logged out)
  const exists = await redis.exists(REFRESH_KEY(payload.sub, payload.jti))
  if (!exists) {
    throw Object.assign(new Error('Refresh token has been revoked'), {
      code: 'TOKEN_REVOKED',
      statusCode: 401,
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { email: true },
  })
  if (!user) {
    throw Object.assign(new Error('User not found'), { code: 'USER_NOT_FOUND', statusCode: 401 })
  }

  const accessToken = jwt.sign(
    { sub: payload.sub, email: user.email, type: 'access' } satisfies AccessTokenPayload,
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL_SEC },
  )

  return { accessToken, expiresIn: ACCESS_TOKEN_TTL_SEC }
}

export async function logoutUser(refreshToken: string, redis: Redis): Promise<void> {
  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as RefreshTokenPayload
    if (payload.type === 'refresh') {
      await redis.del(REFRESH_KEY(payload.sub, payload.jti))
    }
  } catch {
    // Token already invalid — treat logout as a no-op
  }
}

// ── Password reset ───────────────────────────────────────────────────────────

function createMailTransport() {
  return nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'localhost',
    port: parseInt(process.env['SMTP_PORT'] ?? '587', 10),
    auth: process.env['SMTP_USER']
      ? { user: process.env['SMTP_USER'], pass: process.env['SMTP_PASS'] }
      : undefined,
  })
}

export async function requestPasswordReset(email: string, redis: Redis): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  // Always respond successfully to avoid user enumeration
  if (!user) return

  const token = crypto.randomBytes(32).toString('hex')
  await redis.set(RESET_KEY(token), user.id, 'EX', PASSWORD_RESET_TTL_SEC)

  const resetUrl = `${process.env['NEXTAUTH_URL'] ?? 'http://localhost:3000'}/reset-password/${token}`

  const transport = createMailTransport()
  await transport.sendMail({
    from: process.env['SMTP_FROM'] ?? 'noreply@streamwave.app',
    to: email,
    subject: 'Reset your StreamWave password',
    text: `Click the link below to reset your password (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `<p>Click the link below to reset your password (expires in 1 hour):</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can safely ignore this email.</p>`,
  })
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string,
  redis: Redis,
): Promise<void> {
  const validation = validatePassword(newPassword)
  if (!validation.valid) {
    throw Object.assign(new Error(validation.message), {
      code: 'INVALID_PASSWORD',
      statusCode: 400,
    })
  }

  const userId = await redis.get(RESET_KEY(token))
  if (!userId) {
    throw Object.assign(new Error('Password reset token is invalid or has expired'), {
      code: 'INVALID_RESET_TOKEN',
      statusCode: 400,
    })
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST)
  await prisma.user.update({ where: { id: userId }, data: { password_hash: passwordHash } })

  // Single-use: delete the token immediately after use
  await redis.del(RESET_KEY(token))
}

// ── Rate limit helpers ───────────────────────────────────────────────────────

export async function recordFailedAttempt(ip: string, redis: Redis): Promise<number> {
  const key = RATE_KEY(ip)
  const count = await redis.incr(key)
  if (count === 1) {
    // Set expiry only on the first increment
    await redis.expire(key, 15 * 60)
  }
  return count
}

export async function getFailedAttempts(ip: string, redis: Redis): Promise<number> {
  const val = await redis.get(RATE_KEY(ip))
  return val ? parseInt(val, 10) : 0
}

export async function clearFailedAttempts(ip: string, redis: Redis): Promise<void> {
  await redis.del(RATE_KEY(ip))
}
