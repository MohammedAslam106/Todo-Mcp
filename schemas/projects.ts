import { z } from 'zod'

// Project colors map to the theme's chart tokens (`--chart-1` … `--chart-5`),
// so they adapt to light/dark mode instead of being raw color values.
export const projectColors = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'] as const
export const projectColorSchema = z.enum(projectColors)

export const projectSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  color: projectColorSchema,
  created_at: z.iso.datetime(),
  updated_at: z.iso.datetime(),
  todo_count: z.number().int(),
  completed_count: z.number().int(),
})

export const projectListSchema = z.array(projectSchema)

export const createProjectBodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
  color: projectColorSchema.optional(),
})

export const updateProjectBodySchema = createProjectBodySchema.partial()

export const projectParamsSchema = z.object({
  id: z.coerce.number().int(),
})

export type Project = z.infer<typeof projectSchema>
export type ProjectColor = z.infer<typeof projectColorSchema>
export type CreateProjectBody = z.infer<typeof createProjectBodySchema>
export type UpdateProjectBody = z.infer<typeof updateProjectBodySchema>
