import { z } from 'zod'

// ─── Standard Response Envelope ───────────────────────────────────────────────

export const ApiMetaSchema = z.object({
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().optional(),
  total: z.number().int().nonnegative().optional(),
  cursor: z.string().optional(),
})

export type ApiMeta = z.infer<typeof ApiMetaSchema>

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

export function apiResponse<T>(data: T, meta?: ApiMeta) {
  return { data, ...(meta ? { meta } : {}) }
}

export type ApiResponse<T> = {
  data: T
  meta?: ApiMeta
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const RegisterBodySchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  display_name: z.string().min(1).max(50),
})

export type RegisterBody = z.infer<typeof RegisterBodySchema>

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type LoginBody = z.infer<typeof LoginBodySchema>

// ─── Pagination ───────────────────────────────────────────────────────────────

export const CursorQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type CursorQuery = z.infer<typeof CursorQuerySchema>

export const OffsetQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export type OffsetQuery = z.infer<typeof OffsetQuerySchema>

// ─── Playlist ─────────────────────────────────────────────────────────────────

export const CreatePlaylistBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional(),
  is_public: z.boolean().default(true),
})

export type CreatePlaylistBody = z.infer<typeof CreatePlaylistBodySchema>

export const UpdatePlaylistBodySchema = CreatePlaylistBodySchema.partial()

export type UpdatePlaylistBody = z.infer<typeof UpdatePlaylistBodySchema>

export const ReorderTracksBodySchema = z.object({
  from: z.number().int().nonnegative(),
  to: z.number().int().nonnegative(),
})

export type ReorderTracksBody = z.infer<typeof ReorderTracksBodySchema>

// ─── Search ───────────────────────────────────────────────────────────────────

export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  type: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',') : ['tracks', 'artists', 'albums', 'playlists'])),
  limit: z.coerce.number().int().positive().max(50).default(20),
  offset: z.coerce.number().int().nonnegative().default(0),
})

export type SearchQuery = z.infer<typeof SearchQuerySchema>
