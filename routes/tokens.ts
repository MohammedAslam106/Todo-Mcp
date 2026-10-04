import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  apiTokenListSchema,
  apiTokenParamsSchema,
  createApiTokenBodySchema,
  createdApiTokenSchema,
} from '../schemas/tokens'
import { okResponseSchema } from '../schemas/todos'
import { errorResponseSchema } from '../schemas/common'
import { createApiToken, listApiTokens, revokeApiToken } from '../services/tokens'

const tokenRoutes: FastifyPluginAsyncZod = async (server) => {
  server.addHook('onRequest', server.authenticate)

  server.get(
    '/',
    {
      schema: {
        tags: ['tokens'],
        summary: "List the authenticated user's API tokens (for MCP clients)",
        response: { 200: apiTokenListSchema },
      },
    },
    async (req, reply) => {
      reply.send(await listApiTokens(server.db, req.user.id))
    },
  )

  server.post(
    '/',
    {
      schema: {
        tags: ['tokens'],
        summary: 'Create an API token. The plaintext token is only returned in this response.',
        body: createApiTokenBodySchema,
        response: { 201: createdApiTokenSchema },
      },
    },
    async (req, reply) => {
      reply.code(201).send(await createApiToken(server.db, req.user.id, req.body.name))
    },
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['tokens'],
        summary: 'Revoke an API token',
        params: apiTokenParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      if (!(await revokeApiToken(server.db, req.params.id, req.user.id))) {
        return reply.code(404).send({ error: 'Token not found' })
      }
      reply.send({ ok: true })
    },
  )
}

export default tokenRoutes
