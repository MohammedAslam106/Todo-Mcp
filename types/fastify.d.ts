import type { FastifyReply, FastifyRequest } from 'fastify'

import type { Db } from '../services/errors'

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string }
    user: { id: number; email: string }
  }
}
