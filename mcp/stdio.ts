/**
 * Local MCP server over stdio, for clients that launch a process (Claude Desktop, Claude Code, …).
 * Talks to Postgres directly; identifies the user by an API token in TODO_API_TOKEN.
 *
 * stdout is the JSON-RPC channel — log to stderr only.
 */
import 'dotenv/config'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { db, pool } from '../db/client'
import { verifyApiToken } from '../services/tokens'
import { createMcpServer } from './server'

const token = process.env.TODO_API_TOKEN
if (!token) {
  console.error('TODO_API_TOKEN is not set. Create one with `pnpm run mcp:token <email>`.')
  process.exit(1)
}

const user = await verifyApiToken(db, token)
if (!user) {
  console.error('TODO_API_TOKEN is invalid or has been revoked.')
  await pool.end()
  process.exit(1)
}

const server = createMcpServer(db, user)
await server.connect(new StdioServerTransport())
console.error(`todo-mcp-server running on stdio as ${user.email}`)

const shutdown = async () => {
  await server.close()
  await pool.end()
  process.exit(0)
}
process.stdin.on('close', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
