import { useMemo } from 'react'
import { InboxIcon } from 'lucide-react'

import { useAppStore } from '@/lib/store'
import { PageHeader } from '@/components/page-header'
import { TodoList } from '@/components/todo-list'

export function getMeta() {
  return { title: 'Inbox - Todo App' }
}

export default function Inbox() {
  const todos = useAppStore((s) => s.todos)
  const inbox = useMemo(() => todos.filter((t) => t.project_id === null), [todos])

  return (
    <>
      <PageHeader title="Inbox" description="Tasks that don't belong to a project yet." />
      <TodoList
        todos={inbox}
        defaults={{ project_id: null }}
        emptyIcon={InboxIcon}
        emptyTitle="Your inbox is empty"
        emptyDescription="Capture anything on your mind here, then sort it into projects later."
      />
    </>
  )
}
