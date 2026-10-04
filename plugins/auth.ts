import fp from 'fastify-plugin'
import fastifyJwt from '@fastify/jwt'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'

async function authPlugin(server: FastifyInstance) {
  await server.register(fastifyJwt, {
    secret: process.env.JWT_SECRET as string,
    cookie: {
      cookieName: 'token',
      signed: false,
    },
  })

  server.decorate('authenticate', async function authenticate(req: FastifyRequest, reply: FastifyReply) {
    try {
      await req.jwtVerify()
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}

export default fp(authPlugin, { name: 'auth' })
