import { useMemo } from 'react'
import { format } from 'date-fns'
import { CalendarClockIcon, TriangleAlertIcon } from 'lucide-react'

import { useAppStore } from '@/lib/store'
import { daysUntilDue, isOverdue, toDateString } from '@/lib/todos'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/page-header'
import { TodoList } from '@/components/todo-list'

export function getMeta() {
  return { title: 'Today - Todo App' }
}

export default function Today() {
  const todos = useAppStore((s) => s.todos)
  const today = useMemo(
    () => todos.filter((t) => daysUntilDue(t) === 0 || isOverdue(t)),
    [todos],
  )
  const overdue = today.filter(isOverdue).length

  return (
    <>
      <PageHeader title="Today" description={format(new Date(), 'EEEE, MMMM d')}>
        {overdue > 0 && (
          <Badge variant="destructive">
            <TriangleAlertIcon />
            {overdue} overdue
          </Badge>
        )}
      </PageHeader>
      <TodoList
        todos={today}
        defaults={{ due_date: toDateString(new Date()) }}
        showProject
        emptyIcon={CalendarClockIcon}
        emptyTitle="Nothing due today"
        emptyDescription="Enjoy the breathing room, or plan something for today."
      />
    </>
  )
}
