import { z } from 'zod'

export const apiTokenSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  created_at: z.iso.datetime(),
  last_used_at: z.iso.datetime().nullable(),
})

export const apiTokenListSchema = z.array(apiTokenSchema)

export const createApiTokenBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
})

// The plaintext token is only ever returned here, once.
export const createdApiTokenSchema = apiTokenSchema.extend({
  token: z.string(),
})

export const apiTokenParamsSchema = z.object({
  id: z.coerce.number().int(),
})

export type ApiToken = z.infer<typeof apiTokenSchema>
export type CreatedApiToken = z.infer<typeof createdApiTokenSchema>
