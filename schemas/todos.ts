import { z } from 'zod'

export const priorities = ['none', 'low', 'medium', 'high'] as const
export const prioritySchema = z.enum(priorities)

export const todoSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  is_completed: z.boolean(),
  priority: prioritySchema,
  due_date: z.iso.date().nullable(),
  project_id: z.number().int().nullable(),
  completed_at: z.iso.datetime().nullable(),
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
})

export const todoListSchema = z.array(todoSchema)

export const createTodoBodySchema = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().max(5000).nullable().optional(),
  priority: prioritySchema.optional(),
  due_date: z.iso.date().nullable().optional(),
  project_id: z.number().int().nullable().optional(),
})

export const updateTodoBodySchema = createTodoBodySchema.partial().extend({
  is_completed: z.boolean().optional(),
})

export const todoParamsSchema = z.object({
  id: z.coerce.number().int(),
})

export const todoQuerySchema = z.object({
  // A project id, or "inbox" for todos that don't belong to any project.
  project_id: z.union([z.literal('inbox'), z.coerce.number().int()]).optional(),
})

export const okResponseSchema = z.object({
  ok: z.boolean(),
})

export type Priority = z.infer<typeof prioritySchema>
export type Todo = z.infer<typeof todoSchema>
export type CreateTodoBody = z.infer<typeof createTodoBodySchema>
export type UpdateTodoBody = z.infer<typeof updateTodoBodySchema>
export type TodoParams = z.infer<typeof todoParamsSchema>
