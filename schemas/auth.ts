import { z } from 'zod'

export const oauthProviderSchema = z.enum(['google', 'github'])

export const userPublicSchema = z.object({
  id: z.number().int(),
  email: z.email(),
  name: z.string().nullable(),
  avatar_url: z.string().nullable(),
})

export const authResponseSchema = z.object({
  user: userPublicSchema,
})

export const providersResponseSchema = z.object({
  providers: z.array(z.object({ id: oauthProviderSchema, label: z.string() })),
})

export const oauthStartQuerySchema = z.object({
  next: z.string().optional().describe('Same-origin path to return to after signing in'),
})

// The provider adds `code`/`state` on success, or `error` (e.g. access_denied) when the user cancels.
export const oauthCallbackQuerySchema = z.looseObject({
  error: z.string().optional(),
})

export const okResponseSchema = z.object({
  ok: z.boolean(),
})

export type OAuthProviderId = z.infer<typeof oauthProviderSchema>
export type UserPublic = z.infer<typeof userPublicSchema>
export type AuthProviders = z.infer<typeof providersResponseSchema>['providers']
