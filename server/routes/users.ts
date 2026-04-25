import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod/v4'
import { getUserProfile, updateUserProfile } from '../services/users'
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
}

export default usersRoutes
