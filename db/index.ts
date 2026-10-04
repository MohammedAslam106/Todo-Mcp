import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'

import { db, pool } from './client'

async function dbPlugin(server: FastifyInstance) {
  server.decorate('db', db)

  server.addHook('onClose', async () => {
    await pool.end()
  })
}

export default fp(dbPlugin, { name: 'db' })
