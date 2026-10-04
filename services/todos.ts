import { and, asc, desc, eq, gt, ilike, isNull, lt, or, sql, type SQL } from 'drizzle-orm'

import { projects, todos } from '../db/schema'
import type { CreateTodoBody, Priority, Todo, UpdateTodoBody } from '../schemas/todos'
import { ServiceError, type Db } from './errors'

const todoColumns = {
  id: todos.id,
  title: todos.title,
  description: todos.description,
  is_completed: todos.is_completed,
  priority: todos.priority,
  due_date: todos.due_date,
  project_id: todos.project_id,
  completed_at: todos.completed_at,
  created_at: todos.created_at,
  updated_at: todos.updated_at,
}

export interface TodoFilters {
  /** A project id, or "inbox" for todos that don't belong to any project. */
  project_id?: number | 'inbox'
  status?: 'active' | 'completed' | 'all'
  priority?: Priority
  /** `overdue`/`today` compare against `today` (a YYYY-MM-DD date), defaulting to the DB's current date. */
  due?: 'overdue' | 'today' | 'upcoming' | 'none'
  today?: string
  /** Case-insensitive match against title and description. */
  search?: string
  limit?: number
  offset?: number
}

/** Throws a 400 unless `projectId` is null/undefined (no project) or a project owned by `userId`. */
async function assertOwnsProject(db: Db, projectId: number | null | undefined, userId: number) {
  if (projectId == null) return
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.user_id, userId)))
  if (!project) {
    throw new ServiceError(400, 'Project not found')
  }
}

export async function listTodos(db: Db, userId: number, filters: TodoFilters = {}): Promise<Todo[]> {
  const where: (SQL | undefined)[] = [eq(todos.user_id, userId)]

  if (filters.project_id === 'inbox') where.push(isNull(todos.project_id))
  else if (filters.project_id !== undefined) where.push(eq(todos.project_id, filters.project_id))

  if (filters.status === 'active') where.push(eq(todos.is_completed, false))
  else if (filters.status === 'completed') where.push(eq(todos.is_completed, true))

  if (filters.priority) where.push(eq(todos.priority, filters.priority))

  if (filters.due) {
    const today = filters.today ? sql`${filters.today}::date` : sql`CURRENT_DATE`
    if (filters.due === 'overdue') where.push(lt(todos.due_date, today))
    else if (filters.due === 'today') where.push(eq(todos.due_date, today))
    else if (filters.due === 'upcoming') where.push(gt(todos.due_date, today))
    else where.push(isNull(todos.due_date))
  }

  if (filters.search) {
    const pattern = `%${filters.search.replace(/[\\%_]/g, '\\$&')}%`
    where.push(or(ilike(todos.title, pattern), ilike(todos.description, pattern)))
  }

  // Due-date filters read most naturally soonest-first; everything else newest-first.
  const order =
    filters.due && filters.due !== 'none' ? [asc(todos.due_date), desc(todos.created_at)] : [desc(todos.created_at)]

  const query = db
    .select(todoColumns)
    .from(todos)
    .where(and(...where))
    .orderBy(...order)
    .$dynamic()
  if (filters.limit !== undefined) query.limit(filters.limit)
  if (filters.offset !== undefined) query.offset(filters.offset)
  return query
}

export async function getTodo(db: Db, id: number, userId: number): Promise<Todo | undefined> {
  const [todo] = await db
    .select(todoColumns)
    .from(todos)
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)))
  return todo
}

export async function createTodo(db: Db, userId: number, body: CreateTodoBody): Promise<Todo> {
  const { title, description, priority, due_date, project_id } = body
  await assertOwnsProject(db, project_id, userId)

  const [todo] = await db
    .insert(todos)
    .values({
      user_id: userId,
      title,
      description: description || null,
      priority: priority ?? 'none',
      due_date: due_date ?? null,
      project_id: project_id ?? null,
    })
    .returning(todoColumns)
  return todo!
}

/** Returns the updated todo, or `undefined` if it doesn't exist / isn't the user's. */
export async function updateTodo(db: Db, id: number, userId: number, body: UpdateTodoBody) {
  await assertOwnsProject(db, body.project_id, userId)

  // Only touch the columns that were sent (drizzle skips `undefined`), so `null` can explicitly clear a field.
  const [todo] = await db
    .update(todos)
    .set({
      title: body.title,
      description: body.description === undefined ? undefined : body.description || null,
      priority: body.priority,
      due_date: body.due_date,
      project_id: body.project_id,
      is_completed: body.is_completed,
      completed_at:
        body.is_completed === undefined ? undefined : body.is_completed ? sql`COALESCE(${todos.completed_at}, now())` : null,
      updated_at: sql`now()`,
    })
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)))
    .returning(todoColumns)
  return todo
}

export async function deleteTodo(db: Db, id: number, userId: number) {
  const deleted = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.user_id, userId)))
    .returning({ id: todos.id })
  return deleted.length === 1
}

export interface TodoOverview {
  total: number
  open: number
  completed: number
  overdue: number
  due_today: number
  completed_last_7_days: number
  open_by_priority: Record<Priority, number>
}

/** Headline counts for the user's todos, mirroring the dashboard. */
export async function getOverview(db: Db, userId: number, today?: string): Promise<TodoOverview> {
  const day = today ? sql`${today}::date` : sql`CURRENT_DATE`
  const countWhere = (condition: SQL) => sql<number>`count(*) FILTER (WHERE ${condition})`.mapWith(Number)
  const open = sql`NOT ${todos.is_completed}`
  const openWithPriority = (priority: Priority) => countWhere(sql`${open} AND ${todos.priority} = ${priority}`)

  const [row] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      open: countWhere(open),
      completed: countWhere(sql`${todos.is_completed}`),
      overdue: countWhere(sql`${open} AND ${todos.due_date} < ${day}`),
      due_today: countWhere(sql`${open} AND ${todos.due_date} = ${day}`),
      completed_last_7_days: countWhere(sql`${todos.completed_at} >= now() - interval '7 days'`),
      open_high: openWithPriority('high'),
      open_medium: openWithPriority('medium'),
      open_low: openWithPriority('low'),
      open_none: openWithPriority('none'),
    })
    .from(todos)
    .where(eq(todos.user_id, userId))

  const { open_high, open_medium, open_low, open_none, ...counts } = row!
  return {
    ...counts,
    open_by_priority: { high: open_high, medium: open_medium, low: open_low, none: open_none },
  }
}
