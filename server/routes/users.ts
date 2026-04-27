import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getUserProfile, updateUserProfile } from '../services/users'
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/notifications'
import { requireUser } from '../plugins/auth'

const safeText = (min: number, max: number) =>
  z
    .string()
    .transform((s) =>
      s
        .trim()
        .replace(/<[^>]*>/g, '')
        .trim(),
    )
    .pipe(z.string().min(min).max(max))

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/v1/users/me — current user profile + library counts
  fastify.get('/me', async (request, reply) => {
    const user = requireUser(request)
    const profile = await getUserProfile(user.id)
    if (!profile) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } })
    }
    return reply.send({ data: profile })
  })

  // PATCH /api/v1/users/me — update display name (and optionally avatar_url)
  fastify.patch('/me', async (request, reply) => {
    const user = requireUser(request)

    const bodySchema = z.object({
      display_name: safeText(1, 50).optional(),
      avatar_url: z.string().url().max(500).nullable().optional(),
    })

    const parsed = bodySchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    const updated = await updateUserProfile(user.id, parsed.data)
    return reply.send({ data: updated })
  })

  // GET /api/v1/users/me/notifications — fetch or create notification preferences
  fastify.get('/me/notifications', async (request, reply) => {
    const user = requireUser(request)
    const prefs = await getNotificationPreferences(user.id)
    return reply.send({ data: prefs })
  })

  // PATCH /api/v1/users/me/notifications — update one or more preference flags
  fastify.patch('/me/notifications', async (request, reply) => {
    const user = requireUser(request)

    const bodySchema = z.object({
      new_releases: z.boolean().optional(),
      playlist_updates: z.boolean().optional(),
      account_security: z.boolean().optional(),
      product_updates: z.boolean().optional(),
    })

    // Lenient parser sets null for empty bodies — treat as no-op update
    const rawBody = request.body ?? {}
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body' },
      })
    }

    const updated = await updateNotificationPreferences(user.id, parsed.data)
    return reply.send({ data: updated })
  })
}

export default usersRoutes
