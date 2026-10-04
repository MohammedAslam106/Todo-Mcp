import { useMemo } from 'react'
import { addDays } from 'date-fns'
import { CalendarDaysIcon, PlusIcon } from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { daysUntilDue, dueDate, formatDueDate, sortTodos, toDateString } from '@/lib/todos'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { PageHeader } from '@/components/page-header'
import { TodoItem } from '@/components/todo-item'
import type { Todo } from '../../schemas/todos'

export function getMeta() {
  return { title: 'Upcoming - Todo App' }
}

export default function Upcoming() {
  const todos = useAppStore((s) => s.todos)

  // Open tasks due after today, grouped by due date.
  const groups = useMemo(() => {
    const upcoming = sortTodos(
      todos.filter((t) => !t.is_completed && (daysUntilDue(t) ?? 0) > 0),
      'due',
    )
    const byDate = new Map<string, Todo[]>()
    for (const todo of upcoming) {
      const list = byDate.get(todo.due_date!) ?? []
      list.push(todo)
      byDate.set(todo.due_date!, list)
    }
    return [...byDate.entries()]
  }, [todos])

  const tomorrow = toDateString(addDays(new Date(), 1))

  return (
    <>
      <PageHeader title="Upcoming" description="Everything scheduled after today.">
        <Button variant="outline" size="sm" onClick={() => actions.openNewTodo({ due_date: tomorrow })}>
          <PlusIcon />
          Plan for tomorrow
        </Button>
      </PageHeader>

      {groups.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDaysIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing scheduled</EmptyTitle>
            <EmptyDescription>Give tasks a due date and they'll line up here.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => actions.openNewTodo({ due_date: tomorrow })}>
              <PlusIcon />
              Schedule a task
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map(([date, items]) => (
            <section key={date} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between border-b pb-2">
                <h2 className="text-sm font-semibold">{formatDueDate(dueDate({ due_date: date })!)}</h2>
                <span className="text-xs text-muted-foreground">
                  {items.length} {items.length === 1 ? 'task' : 'tasks'}
                </span>
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
