import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  createProjectBodySchema,
  projectListSchema,
  projectParamsSchema,
  projectSchema,
  updateProjectBodySchema,
} from '../schemas/projects'
import { okResponseSchema } from '../schemas/todos'
import { errorResponseSchema } from '../schemas/common'
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../services/projects'

const projectRoutes: FastifyPluginAsyncZod = async (server) => {
  server.addHook('onRequest', server.authenticate)

  server.get(
    '/',
    {
      schema: {
        tags: ['projects'],
        summary: "List the authenticated user's projects",
        response: { 200: projectListSchema },
      },
    },
    async (req, reply) => {
      reply.send(await listProjects(server.db, req.user.id))
    },
  )

  server.get(
    '/:id',
    {
      schema: {
        tags: ['projects'],
        summary: 'Get a single project',
        params: projectParamsSchema,
        response: { 200: projectSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const project = await getProject(server.db, req.params.id, req.user.id)
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      reply.send(project)
    },
  )

  server.post(
    '/',
    {
      schema: {
        tags: ['projects'],
        summary: 'Create a project',
        body: createProjectBodySchema,
        response: { 201: projectSchema },
      },
    },
    async (req, reply) => {
      reply.code(201).send(await createProject(server.db, req.user.id, req.body))
    },
  )

  server.patch(
    '/:id',
    {
      schema: {
        tags: ['projects'],
        summary: "Update a project's name, description, or color",
        params: projectParamsSchema,
        body: updateProjectBodySchema,
        response: { 200: projectSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const project = await updateProject(server.db, req.params.id, req.user.id, req.body)
      if (!project) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      reply.send(project)
    },
  )

  server.delete(
    '/:id',
    {
      schema: {
        tags: ['projects'],
        summary: 'Delete a project and all of its todos',
        params: projectParamsSchema,
        response: { 200: okResponseSchema, 404: errorResponseSchema },
      },
    },
    async (req, reply) => {
      if (!(await deleteProject(server.db, req.params.id, req.user.id))) {
        return reply.code(404).send({ error: 'Project not found' })
      }
      reply.send({ ok: true })
    },
  )
}

export default projectRoutes
