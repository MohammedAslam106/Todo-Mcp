import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  createTodoBodySchema,
  okResponseSchema,
  todoListSchema,
  todoParamsSchema,
  todoQuerySchema,
  todoSchema,
  updateTodoBodySchema,
} from '../schemas/todos'
import { errorResponseSchema } from '../schemas/common'
import { ServiceError } from '../services/errors'
import { createTodo, deleteTodo, listTodos, updateTodo } from '../services/todos'

const todoRoutes: FastifyPluginAsyncZod = async (server) => {
  server.addHook('onRequest', server.authenticate)

  // "Project not found" on create/update is thrown by the service as a 400 ServiceError.
  // Anything else is rethrown to Fastify's default handler.
  server.setErrorHandler((error, req, reply) => {
    if (error instanceof ServiceError) {
      return reply.code(error.statusCode).send({ error: error.message })
    }
    throw error
  })

  server.get(
    '/',
    {
      schema: {
        tags: ['todos'],
        summary: "List the authenticated user's todos, optionally filtered by project",
        querystring: todoQuerySchema,
        response: { 200: todoListSchema },
      },
    },
    async (req, reply) => {
      reply.send(await listTodos(server.db, req.user.id, { project_id: req.query.project_id }))
    },
  )

  server.post(
    '/',
    {
      schema: {
        tags: ['todos'],
        summary: 'Create a todo',
        body: createTodoBodySchema,
        response: { 201: todoSchema, 400: errorResponseSchema },
      },
    },
    async (req, reply) => {
      reply.code(201).send(await createTodo(server.db, req.user.id, req.body))
    },
  )

  server.patch(
    '/:id',
    {
      schema: {
        tags: ['todos'],
        summary: 'Update any field of a todo',
        params: todoParamsSchema,
        body: updateTodoBodySchema,
        response: { 200: todoSchema, 400: errorResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const todo = await updateTodo(server.db, req.params.id, req.user.id, req.body)
      if (!todo) {
        return reply.code(404).send({ error: 'Todo not found' })
      }
      reply.send(todo)
    },
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['todos'],
        summary: 'Delete a todo',
        params: todoParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      if (!(await deleteTodo(server.db, req.params.id, req.user.id))) {
        return reply.code(404).send({ error: 'Todo not found' })
      }
      reply.send({ ok: true })
    },
  )
}

export default todoRoutes
