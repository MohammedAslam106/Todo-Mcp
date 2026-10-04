import 'dotenv/config'

import Fastify, { type FastifyError } from 'fastify'
import FastifyVite from '@fastify/vite'
import fastifyCookie from '@fastify/cookie'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'

import dbPlugin from './db/index'
import authPlugin from './plugins/auth'
import authRoutes from './routes/auth'
import todoRoutes from './routes/todos'
import projectRoutes from './routes/projects'
import tokenRoutes from './routes/tokens'
import mcpRoutes from './routes/mcp'
import { appUrl, enabledProviders, oauthProviders } from './services/oauth'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.')
}
if (enabledProviders().length === 0) {
  console.warn(
    'No sign-in providers are configured, so nobody can log in. Set GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET ' +
      'and/or GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET (see .env.example).',
  )
}

const server = Fastify({
  logger: {
    transport: {
      target: '@fastify/one-line-logger',
    },
  },
}).withTypeProvider<ZodTypeProvider>()

server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

await server.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Todo App API',
      description: 'API for the Fastify + React todo application',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    tags: [
      { name: 'auth', description: 'Google/GitHub sign-in and session endpoints' },
      { name: 'projects', description: 'Project CRUD endpoints' },
      { name: 'todos', description: 'Todo item CRUD endpoints' },
      { name: 'tokens', description: 'API tokens for MCP clients (Bearer auth on /mcp)' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
      },
    },
  },
  transform: jsonSchemaTransform,
})

await server.register(fastifySwaggerUi, {
  routePrefix: '/docs',
})

await server.register(fastifyCookie)
await server.register(dbPlugin)
await server.register(authPlugin)

await server.register(authRoutes, { prefix: '/api/auth' })
await server.register(projectRoutes, { prefix: '/api/projects' })
await server.register(todoRoutes, { prefix: '/api/todos' })
await server.register(tokenRoutes, { prefix: '/api/tokens' })
await server.register(mcpRoutes, { prefix: '/mcp' })

await server.register(FastifyVite, {
  root: import.meta.dirname,
  renderer: '@fastify/react',
})

server.setErrorHandler((error: FastifyError, req, reply) => {
  server.log.error(error)
  reply.code(error.statusCode || 500).send({ error: error.message })
})

await server.vite.ready()

const port = Number(process.env.PORT) || 3000
// Hosts like Render only route traffic to 0.0.0.0, so production listens on all interfaces.
const host = process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost')
await server.listen({ port, host })

// Tell whoever started the server what to do next.
const providers = enabledProviders().map((id) => oauthProviders[id].label)
const signIn = providers.length
  ? `Sign in with ${providers.join(' or ')}`
  : 'Configure Google or GitHub sign-in first (see the warning above)'
console.log(`
  ┌──────────────────────────────────────────────────────────────┐
    Todo App is ready.

    1. Open ${appUrl()}/connect in your browser
    2. ${signIn}
    3. Create a token and add the server to Claude (or any MCP client)

    MCP endpoint: ${appUrl()}/mcp
  └──────────────────────────────────────────────────────────────┘
`)
