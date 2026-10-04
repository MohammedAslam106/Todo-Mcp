import { and, asc, count, eq, sql, type SQL } from 'drizzle-orm'

import { projects, todos } from '../db/schema'
import type { CreateProjectBody, Project, UpdateProjectBody } from '../schemas/projects'
import type { Db } from './errors'

// Projects are always returned with their todo counts, for sidebar badges and progress bars.
function selectProjects(db: Db, where: SQL | undefined) {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      color: projects.color,
      created_at: projects.created_at,
      updated_at: projects.updated_at,
      todo_count: count(todos.id),
      completed_count: sql<number>`count(${todos.id}) FILTER (WHERE ${todos.is_completed})`.mapWith(Number),
    })
    .from(projects)
    .leftJoin(todos, eq(todos.project_id, projects.id))
    .where(where)
    .groupBy(projects.id)
}

export async function listProjects(db: Db, userId: number): Promise<Project[]> {
  return selectProjects(db, eq(projects.user_id, userId)).orderBy(asc(projects.created_at))
}

export async function getProject(db: Db, id: number, userId: number): Promise<Project | undefined> {
  const [project] = await selectProjects(db, and(eq(projects.id, id), eq(projects.user_id, userId)))
  return project
}

export async function createProject(db: Db, userId: number, body: CreateProjectBody) {
  const { name, description, color } = body
  const [created] = await db
    .insert(projects)
    .values({ user_id: userId, name, description: description || null, color: color ?? 'chart-1' })
    .returning({ id: projects.id })
  return (await getProject(db, created!.id, userId))!
}

/** Returns the updated project, or `undefined` if it doesn't exist / isn't the user's. */
export async function updateProject(db: Db, id: number, userId: number, body: UpdateProjectBody) {
  const { name, description, color } = body
  const updated = await db
    .update(projects)
    .set({
      name,
      // `undefined` leaves the column alone; null or "" clears it.
      description: description === undefined ? undefined : description || null,
      color,
      updated_at: sql`now()`,
    })
    .where(and(eq(projects.id, id), eq(projects.user_id, userId)))
    .returning({ id: projects.id })
  if (updated.length === 0) return undefined
  return getProject(db, id, userId)
}

/** Deletes a project and (via ON DELETE CASCADE) its todos. Returns false if not found. */
export async function deleteProject(db: Db, id: number, userId: number) {
  const deleted = await db
    .delete(projects)
    .where(and(eq(projects.id, id), eq(projects.user_id, userId)))
    .returning({ id: projects.id })
  return deleted.length === 1
}
