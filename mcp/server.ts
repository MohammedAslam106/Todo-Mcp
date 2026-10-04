import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

import { projectColorSchema } from '../schemas/projects'
import { prioritySchema } from '../schemas/todos'
import { ServiceError, type Db } from '../services/errors'
import { createProject, deleteProject, getProject, listProjects, updateProject } from '../services/projects'
import { createTodo, deleteTodo, getOverview, getTodo, listTodos, updateTodo } from '../services/todos'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

// Shared field schemas. `.describe()` text is what the model sees, so it should say how to use the field.
const id = (what: string) => z.number().int().positive().describe(`The ${what}'s numeric id`)
const date = z.iso.date()
const today = date
  .optional()
  .describe("The user's current local date (YYYY-MM-DD). Pass it so 'today'/'overdue' match the user's timezone.")
const todoFields = {
  title: z.string().trim().min(1).max(500).describe('Short title of the task'),
  description: z.string().max(5000).nullable().describe('Longer notes; null clears it'),
  priority: prioritySchema.describe('Task priority'),
  due_date: date.nullable().describe('Due date as YYYY-MM-DD; null clears it'),
  project_id: z.number().int().nullable().describe('Project to file the task under; null moves it to the Inbox'),
}
const projectFields = {
  name: z.string().trim().min(1).max(100).describe('Project name'),
  description: z.string().max(2000).nullable().describe('Project description; null clears it'),
  color: projectColorSchema.describe('Theme color token for the project'),
}

function ok(data: Record<string, unknown>): CallToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  }
}

function fail(message: string): CallToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/** Turns expected domain errors into tool errors the model can react to; rethrows anything else. */
function handle<A>(fn: (args: A) => Promise<CallToolResult>) {
  return async (args: A): Promise<CallToolResult> => {
    try {
      return await fn(args)
    } catch (err) {
      if (err instanceof ServiceError) {
        const hint = err.message === 'Project not found' ? ' Call todo_list_projects to see valid project ids.' : ''
        return fail(`Error: ${err.message}.${hint}`)
      }
      throw err
    }
  }
}

const todoNotFound = (id: number) =>
  fail(`Error: Todo ${id} not found. Call todo_list_todos (optionally with \`search\`) to find the right id.`)
const projectNotFound = (id: number) =>
  fail(`Error: Project ${id} not found. Call todo_list_projects to see valid project ids.`)

/**
 * Builds an MCP server whose tools act on behalf of `userId`. Every call is scoped
 * to that user's data, exactly like the cookie-authenticated REST API.
 */
export function createMcpServer(db: Db, user: { id: number; email: string }) {
  const server = new McpServer(
    { name: 'todo-mcp-server', version: '1.0.0' },
    {
      instructions:
        `Manages the todo list and projects of ${user.email}. ` +
        'Todos with project_id = null live in the Inbox. Dates are YYYY-MM-DD. ' +
        'Start with todo_get_overview or todo_list_todos; look up ids with the list tools before updating or deleting.',
    },
  )
  const userId = user.id

  // ── Overview ───────────────────────────────────────────────────────────────

  server.registerTool(
    'todo_get_overview',
    {
      title: 'Get todo overview',
      description:
        'Headline counts for the user: total/open/completed todos, overdue, due today, completed in the last 7 days, ' +
        'and open todos by priority. Use it to answer "how am I doing" questions or before planning the day.',
      inputSchema: { today },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handle(async (args) => ok({ ...(await getOverview(db, userId, args.today)) })),
  )

  // ── Todos ──────────────────────────────────────────────────────────────────

  server.registerTool(
    'todo_list_todos',
    {
      title: 'List todos',
      description:
        'List and filter the user\'s todos. Filters combine with AND. Examples: open tasks due today → ' +
        '{ status: "active", due: "today" }; overdue → { status: "active", due: "overdue" }; Inbox → { project_id: "inbox" }. ' +
        'Results are newest first (soonest due first when filtering by due). Paginate with limit/offset while has_more is true.',
      inputSchema: {
        project_id: z
          .union([z.number().int(), z.literal('inbox')])
          .optional()
          .describe('Only todos in this project, or "inbox" for todos without a project'),
        status: z.enum(['active', 'completed', 'all']).default('active').describe('Completion status (default: active)'),
        priority: prioritySchema.optional().describe('Only todos with this priority'),
        due: z
          .enum(['overdue', 'today', 'upcoming', 'none'])
          .optional()
          .describe('overdue = before today, today = due today, upcoming = after today, none = no due date'),
        search: z.string().min(1).optional().describe('Case-insensitive text to find in title or description'),
        today,
        limit: z.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT).describe('Max results to return'),
        offset: z.number().int().min(0).default(0).describe('Number of results to skip, for pagination'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handle(async ({ limit, offset, ...filters }) => {
      // Fetch one extra row to know whether there's another page.
      const rows = await listTodos(db, userId, { ...filters, limit: limit + 1, offset })
      const todos = rows.slice(0, limit)
      return ok({
        todos,
        count: todos.length,
        offset,
        has_more: rows.length > limit,
        ...(rows.length > limit ? { next_offset: offset + limit } : {}),
      })
    }),
  )

  server.registerTool(
    'todo_get_todo',
    {
      title: 'Get todo',
      description: 'Get one todo by id, including its full description.',
      inputSchema: { id: id('todo') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handle(async (args) => {
      const todo = await getTodo(db, args.id, userId)
      return todo ? ok({ todo }) : todoNotFound(args.id)
    }),
  )

  server.registerTool(
    'todo_create_todo',
    {
      title: 'Create todo',
      description:
        'Create a new todo. Only title is required; omit project_id to put it in the Inbox. Returns the created todo.',
      inputSchema: {
        title: todoFields.title,
        description: todoFields.description.optional(),
        priority: todoFields.priority.optional().describe('Task priority (default: none)'),
        due_date: todoFields.due_date.optional(),
        project_id: todoFields.project_id.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    handle(async (args) => ok({ todo: await createTodo(db, userId, args) })),
  )

  server.registerTool(
    'todo_update_todo',
    {
      title: 'Update todo',
      description:
        'Change fields of an existing todo. Only the fields you pass are changed; pass null to clear ' +
        'description/due_date, or project_id: null to move it to the Inbox. Returns the updated todo.',
      inputSchema: {
        id: id('todo'),
        title: todoFields.title.optional(),
        description: todoFields.description.optional(),
        priority: todoFields.priority.optional(),
        due_date: todoFields.due_date.optional(),
        project_id: todoFields.project_id.optional(),
        is_completed: z.boolean().optional().describe('Mark done (true) or re-open (false)'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    handle(async ({ id, ...patch }) => {
      const todo = await updateTodo(db, id, userId, patch)
      return todo ? ok({ todo }) : todoNotFound(id)
    }),
  )

  server.registerTool(
    'todo_complete_todo',
    {
      title: 'Complete todo',
      description: 'Mark a todo as done, or pass completed: false to re-open it. Returns the updated todo.',
      inputSchema: {
        id: id('todo'),
        completed: z.boolean().default(true).describe('true = mark done (default), false = re-open'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    handle(async (args) => {
      const todo = await updateTodo(db, args.id, userId, { is_completed: args.completed })
      return todo ? ok({ todo }) : todoNotFound(args.id)
    }),
  )

  server.registerTool(
    'todo_delete_todo',
    {
      title: 'Delete todo',
      description:
        'Permanently delete a todo. This cannot be undone — prefer todo_complete_todo when the user finished the task.',
      inputSchema: { id: id('todo') },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    handle(async (args) =>
      (await deleteTodo(db, args.id, userId)) ? ok({ deleted: true, id: args.id }) : todoNotFound(args.id),
    ),
  )

  // ── Projects ───────────────────────────────────────────────────────────────

  server.registerTool(
    'todo_list_projects',
    {
      title: 'List projects',
      description: "List the user's projects with their todo_count and completed_count, oldest first.",
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handle(async () => {
      const projects = await listProjects(db, userId)
      return ok({ projects, count: projects.length })
    }),
  )

  server.registerTool(
    'todo_get_project',
    {
      title: 'Get project',
      description:
        'Get one project with its progress counts. To see its tasks, call todo_list_todos with project_id.',
      inputSchema: { id: id('project') },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    handle(async (args) => {
      const project = await getProject(db, args.id, userId)
      return project ? ok({ project }) : projectNotFound(args.id)
    }),
  )

  server.registerTool(
    'todo_create_project',
    {
      title: 'Create project',
      description: 'Create a project to group todos. Returns the created project (use its id as project_id on todos).',
      inputSchema: {
        name: projectFields.name,
        description: projectFields.description.optional(),
        color: projectFields.color.optional().describe('Theme color token (default: chart-1)'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    handle(async (args) => ok({ project: await createProject(db, userId, args) })),
  )

  server.registerTool(
    'todo_update_project',
    {
      title: 'Update project',
      description: "Rename a project or change its description/color. Only the fields you pass are changed.",
      inputSchema: {
        id: id('project'),
        name: projectFields.name.optional(),
        description: projectFields.description.optional(),
        color: projectFields.color.optional(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    handle(async ({ id, ...patch }) => {
      const project = await updateProject(db, id, userId, patch)
      return project ? ok({ project }) : projectNotFound(id)
    }),
  )

  server.registerTool(
    'todo_delete_project',
    {
      title: 'Delete project',
      description:
        'Permanently delete a project AND ALL OF ITS TODOS. This cannot be undone. Confirm with the user first, ' +
        'or move the todos elsewhere with todo_update_todo if they should be kept.',
      inputSchema: { id: id('project') },
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    handle(async (args) =>
      (await deleteProject(db, args.id, userId)) ? ok({ deleted: true, id: args.id }) : projectNotFound(args.id),
    ),
  )

  return server
}
