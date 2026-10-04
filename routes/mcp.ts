import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

import { createMcpServer } from '../mcp/server'
import { verifyApiToken } from '../services/tokens'

/**
 * MCP over Streamable HTTP at `POST /mcp`, in stateless JSON mode: every request gets
 * a fresh server + transport, so there are no sessions to track.
 *
 * Clients authenticate with `Authorization: Bearer <api token>` (see routes/tokens.ts).
 * Deliberately not a Zod-typed route: the MCP SDK validates the JSON-RPC body itself.
 */
const mcpRoutes: FastifyPluginAsync = async (server) => {
  server.post('/', { schema: { hide: true } }, async (req, reply) => {
    const token = req.headers.authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
    const user = token ? await verifyApiToken(server.db, token) : undefined
    if (!user) {
      return reply
        .code(401)
        .header('WWW-Authenticate', 'Bearer')
        .send({
          jsonrpc: '2.0',
          error: { code: -32001, message: 'Unauthorized: send a valid API token as "Authorization: Bearer <token>"' },
          id: null,
        })
    }

    const mcp = createMcpServer(server.db, user)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true })
    reply.raw.on('close', () => {
      void transport.close()
      void mcp.close()
    })

    // The transport writes to the raw response itself, so take it away from Fastify.
    reply.hijack()
    await mcp.connect(transport)
    await transport.handleRequest(req.raw, reply.raw, req.body)
  })

  // Stateless mode has no server-initiated stream (GET) or sessions to end (DELETE).
  const methodNotAllowed = async (_req: unknown, reply: FastifyReply) =>
    reply
      .code(405)
      .header('Allow', 'POST')
      .send({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed.' }, id: null })
  server.get('/', { schema: { hide: true } }, methodNotAllowed)
  server.delete('/', { schema: { hide: true } }, methodNotAllowed)
}

export default mcpRoutes
