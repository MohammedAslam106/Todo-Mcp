import type { AuthProviders, UserPublic } from '../../schemas/auth'
import type { CreateProjectBody, Project, UpdateProjectBody } from '../../schemas/projects'
import type { CreateTodoBody, Todo, UpdateTodoBody } from '../../schemas/todos'
import type { ApiToken, CreatedApiToken } from '../../schemas/tokens'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // empty body
  }

  if (!res.ok) {
    // Validation errors carry the useful detail in `message`; route errors use `error`.
    const body = data as { error?: string; message?: string } | null
    const message = body?.message || body?.error || res.statusText
    throw new ApiError(message, res.status)
  }

  return data as T
}

export const api = {
  // Signing in is a full-page redirect to /api/auth/<provider>, not a fetch.
  authProviders: () => request<{ providers: AuthProviders }>('/auth/providers'),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () => request<{ user: UserPublic }>('/auth/me'),

  listProjects: () => request<Project[]>('/projects'),
  createProject: (body: CreateProjectBody) => request<Project>('/projects', { method: 'POST', body }),
  updateProject: (id: number, patch: UpdateProjectBody) =>
    request<Project>(`/projects/${id}`, { method: 'PATCH', body: patch }),
  deleteProject: (id: number) => request<{ ok: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  listTodos: () => request<Todo[]>('/todos'),
  createTodo: (body: CreateTodoBody) => request<Todo>('/todos', { method: 'POST', body }),
  updateTodo: (id: number, patch: UpdateTodoBody) =>
    request<Todo>(`/todos/${id}`, { method: 'PATCH', body: patch }),
  deleteTodo: (id: number) => request<{ ok: boolean }>(`/todos/${id}`, { method: 'DELETE' }),

  listApiTokens: () => request<ApiToken[]>('/tokens'),
  createApiToken: (name: string) => request<CreatedApiToken>('/tokens', { method: 'POST', body: { name } }),
  revokeApiToken: (id: number) => request<{ ok: boolean }>(`/tokens/${id}`, { method: 'DELETE' }),
}
