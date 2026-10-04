import {
  differenceInCalendarDays,
  format,
  isThisYear,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfToday,
} from 'date-fns'

import type { ProjectColor } from '../../schemas/projects'
import type { Priority, Todo } from '../../schemas/todos'

export const priorityMeta: Record<Priority, { label: string; rank: number }> = {
  high: { label: 'High', rank: 3 },
  medium: { label: 'Medium', rank: 2 },
  low: { label: 'Low', rank: 1 },
  none: { label: 'No priority', rank: 0 },
}

// Literal class names so Tailwind can see them; values map to theme chart tokens.
export const projectColorClass: Record<ProjectColor, string> = {
  'chart-1': 'bg-chart-1',
  'chart-2': 'bg-chart-2',
  'chart-3': 'bg-chart-3',
  'chart-4': 'bg-chart-4',
  'chart-5': 'bg-chart-5',
}

/** Parses a `YYYY-MM-DD` due date as a local calendar date. */
export function dueDate(todo: Pick<Todo, 'due_date'>) {
  return todo.due_date ? parseISO(todo.due_date) : null
}

export function toDateString(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

/** Days from today until the due date (negative = overdue), or null with no due date. */
export function daysUntilDue(todo: Pick<Todo, 'due_date'>) {
  const date = dueDate(todo)
  return date ? differenceInCalendarDays(date, startOfToday()) : null
}

export function isOverdue(todo: Todo) {
  const days = daysUntilDue(todo)
  return !todo.is_completed && days !== null && days < 0
}

export function isDueToday(todo: Todo) {
  return daysUntilDue(todo) === 0
}

export function formatDueDate(date: Date) {
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, isThisYear(date) ? 'EEE, MMM d' : 'MMM d, yyyy')
}

export type StatusFilter = 'all' | 'active' | 'completed'
export type SortKey = 'created' | 'due' | 'priority' | 'title'

export function filterTodos(todos: Todo[], { status, query }: { status: StatusFilter; query: string }) {
  const q = query.trim().toLowerCase()
  return todos.filter((todo) => {
    if (status === 'active' && todo.is_completed) return false
    if (status === 'completed' && !todo.is_completed) return false
    if (!q) return true
    return todo.title.toLowerCase().includes(q) || (todo.description ?? '').toLowerCase().includes(q)
  })
}

export function sortTodos(todos: Todo[], key: SortKey) {
  const byCreated = (a: Todo, b: Todo) => b.created_at.localeCompare(a.created_at)
  const compare: Record<SortKey, (a: Todo, b: Todo) => number> = {
    created: byCreated,
    due: (a, b) => {
      // No due date sorts last.
      if (a.due_date === b.due_date) return byCreated(a, b)
      if (!a.due_date) return 1
      if (!b.due_date) return -1
      return a.due_date.localeCompare(b.due_date)
    },
    priority: (a, b) => priorityMeta[b.priority].rank - priorityMeta[a.priority].rank || byCreated(a, b),
    title: (a, b) => a.title.localeCompare(b.title),
  }
  // Open tasks always come before completed ones.
  return [...todos].sort((a, b) => Number(a.is_completed) - Number(b.is_completed) || compare[key](a, b))
}
