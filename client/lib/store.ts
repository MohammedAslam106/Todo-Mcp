import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'

import { api, ApiError } from '@/lib/api'
import type { UserPublic } from '../../schemas/auth'
import type { CreateProjectBody, Project, UpdateProjectBody } from '../../schemas/projects'
import type { CreateTodoBody, Todo, UpdateTodoBody } from '../../schemas/todos'

// A tiny client-side store shared by the sidebar, pages, and dialogs. It lives at
// module level so data survives page navigation. It is only ever written to in the
// browser (from effects and event handlers), so SSR always renders the initial state.

type Status = 'idle' | 'loading' | 'ready' | 'signed-out'

interface TodoDialogState {
  open: boolean
  todo: Todo | null
  defaults: Partial<CreateTodoBody>
}

interface ProjectDialogState {
  open: boolean
  project: Project | null
}

export interface AppState {
  status: Status
  user: UserPublic | null
  projects: Project[]
  todos: Todo[]
  todoDialog: TodoDialogState
  projectDialog: ProjectDialogState
  commandOpen: boolean
}

const initialState: AppState = {
  status: 'idle',
  user: null,
  projects: [],
  todos: [],
  todoDialog: { open: false, todo: null, defaults: {} },
  projectDialog: { open: false, project: null },
  commandOpen: false,
}

let state = initialState
const listeners = new Set<() => void>()

function setState(update: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
  const patch = typeof update === 'function' ? update(state) : update
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(initialState),
  )
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : 'Something went wrong'
}

function replaceTodo(todo: Todo) {
  setState((s) => ({ todos: s.todos.map((t) => (t.id === todo.id ? todo : t)) }))
}

export const actions = {
  /** Loads the session, projects, and todos once. Resolves to false when signed out. */
  async load(force = false) {
    if (!force && (state.status === 'ready' || state.status === 'loading')) {
      return state.status === 'ready'
    }
    setState({ status: 'loading' })
    try {
      const { user } = await api.me()
      const [projects, todos] = await Promise.all([api.listProjects(), api.listTodos()])
      setState({ status: 'ready', user, projects, todos })
      return true
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setState({ ...initialState, status: 'signed-out' })
      } else {
        setState({ status: 'idle' })
        toast.error('Could not load your data', { description: errorMessage(err) })
      }
      return false
    }
  },

  async logout() {
    await api.logout()
    setState({ ...initialState, status: 'signed-out' })
  },

  // --- Todos -------------------------------------------------------------

  async createTodo(body: CreateTodoBody) {
    try {
      const todo = await api.createTodo(body)
      setState((s) => ({ todos: [todo, ...s.todos] }))
      return todo
    } catch (err) {
      toast.error('Could not create task', { description: errorMessage(err) })
      throw err
    }
  },

  /** Optimistically applies `patch`, rolling back if the request fails. */
  async updateTodo(id: number, patch: UpdateTodoBody) {
    const previous = state.todos.find((t) => t.id === id)
    if (!previous) return
    replaceTodo({
      ...previous,
      ...patch,
      description: patch.description === undefined ? previous.description : (patch.description ?? null),
      due_date: patch.due_date === undefined ? previous.due_date : (patch.due_date ?? null),
      project_id: patch.project_id === undefined ? previous.project_id : (patch.project_id ?? null),
    })
    try {
      replaceTodo(await api.updateTodo(id, patch))
    } catch (err) {
      replaceTodo(previous)
      toast.error('Could not update task', { description: errorMessage(err) })
      throw err
    }
  },

  async toggleTodo(todo: Todo) {
    await actions.updateTodo(todo.id, { is_completed: !todo.is_completed }).catch(() => {})
  },

  async deleteTodo(todo: Todo) {
    setState((s) => ({ todos: s.todos.filter((t) => t.id !== todo.id) }))
    try {
      await api.deleteTodo(todo.id)
      toast('Task deleted', {
        description: todo.title,
        action: {
          label: 'Undo',
          onClick: () => void actions.restoreTodo(todo),
        },
      })
    } catch (err) {
      setState((s) => ({ todos: [todo, ...s.todos] }))
      toast.error('Could not delete task', { description: errorMessage(err) })
    }
  },

  /** Re-creates a deleted todo (it gets a new id). */
  async restoreTodo(todo: Todo) {
    const { title, description, priority, due_date, project_id } = todo
    const created = await actions.createTodo({ title, description, priority, due_date, project_id })
    if (todo.is_completed) {
      await actions.updateTodo(created.id, { is_completed: true })
    }
  },

  // --- Projects ----------------------------------------------------------

  async createProject(body: CreateProjectBody) {
    try {
      const project = await api.createProject(body)
      setState((s) => ({ projects: [...s.projects, project] }))
      toast.success(`Project "${project.name}" created`)
      return project
    } catch (err) {
      toast.error('Could not create project', { description: errorMessage(err) })
      throw err
    }
  },

  async updateProject(id: number, patch: UpdateProjectBody) {
    try {
      const project = await api.updateProject(id, patch)
      setState((s) => ({ projects: s.projects.map((p) => (p.id === id ? project : p)) }))
      toast.success('Project updated')
      return project
    } catch (err) {
      toast.error('Could not update project', { description: errorMessage(err) })
      throw err
    }
  },

  async deleteProject(project: Project) {
    try {
      await api.deleteProject(project.id)
      setState((s) => ({
        projects: s.projects.filter((p) => p.id !== project.id),
        todos: s.todos.filter((t) => t.project_id !== project.id),
      }))
      toast.success(`Project "${project.name}" deleted`)
    } catch (err) {
      toast.error('Could not delete project', { description: errorMessage(err) })
      throw err
    }
  },

  // --- Dialogs -----------------------------------------------------------

  openNewTodo(defaults: Partial<CreateTodoBody> = {}) {
    setState({ todoDialog: { open: true, todo: null, defaults }, commandOpen: false })
  },

  openEditTodo(todo: Todo) {
    setState({ todoDialog: { open: true, todo, defaults: {} }, commandOpen: false })
  },

  closeTodoDialog() {
    setState((s) => ({ todoDialog: { ...s.todoDialog, open: false } }))
  },

  openNewProject() {
    setState({ projectDialog: { open: true, project: null }, commandOpen: false })
  },

  openEditProject(project: Project) {
    setState({ projectDialog: { open: true, project }, commandOpen: false })
  },

  closeProjectDialog() {
    setState((s) => ({ projectDialog: { ...s.projectDialog, open: false } }))
  },

  setCommandOpen(open: boolean) {
    setState({ commandOpen: open })
  },
}
