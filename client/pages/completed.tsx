import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { CircleCheckBigIcon } from 'lucide-react'

import { useAppStore } from '@/lib/store'
import { formatDueDate, toDateString } from '@/lib/todos'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { PageHeader } from '@/components/page-header'
import { TodoItem } from '@/components/todo-item'
import type { Todo } from '../../schemas/todos'

export function getMeta() {
  return { title: 'Completed - Todo App' }
}

export default function Completed() {
  const todos = useAppStore((s) => s.todos)

  // Completed tasks, newest first, grouped by the day they were completed.
  const groups = useMemo(() => {
    const done = todos
      .filter((t) => t.is_completed)
      .sort((a, b) => (b.completed_at ?? b.updated_at).localeCompare(a.completed_at ?? a.updated_at))
    const byDay = new Map<string, Todo[]>()
    for (const todo of done) {
      const day = toDateString(parseISO(todo.completed_at ?? todo.updated_at))
      const list = byDay.get(day) ?? []
      list.push(todo)
      byDay.set(day, list)
    }
    return [...byDay.entries()]
  }, [todos])

  const total = groups.reduce((sum, [, items]) => sum + items.length, 0)

  return (
    <>
      <PageHeader
        title="Completed"
        description={total > 0 ? `${total} ${total === 1 ? 'task' : 'tasks'} done. Nice work.` : 'Your finished tasks.'}
      />

      {groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleCheckBigIcon />
            </EmptyMedia>
            <EmptyTitle>No completed tasks yet</EmptyTitle>
            <EmptyDescription>Tick off a task and it'll be celebrated here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([day, items]) => (
            <section key={day} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between border-b pb-2">
                <h2 className="text-sm font-semibold">{formatDueDate(parseISO(day))}</h2>
                <span className="text-xs text-muted-foreground">{items.length} done</span>
              </div>
              <ul className="flex flex-col gap-2">
                {items.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} showProject />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
