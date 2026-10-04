import { useMemo, useState, type ComponentType, type FormEvent } from 'react'
import { CheckCheckIcon, PlusIcon, SearchIcon, SlidersHorizontalIcon } from 'lucide-react'

import { actions } from '@/lib/store'
import { filterTodos, sortTodos, type SortKey, type StatusFilter } from '@/lib/todos'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TodoItem } from '@/components/todo-item'
import type { CreateTodoBody, Todo } from '../../schemas/todos'

interface TodoListProps {
  todos: Todo[]
  /** Values applied to tasks created from the quick-add bar (e.g. the current project). */
  defaults?: Partial<CreateTodoBody>
  showProject?: boolean
  emptyIcon: ComponentType
  emptyTitle: string
  emptyDescription: string
}

const sortLabels: Record<SortKey, string> = {
  created: 'Newest first',
  due: 'Due date',
  priority: 'Priority',
  title: 'Title (A–Z)',
}

export function TodoList({
  todos,
  defaults = {},
  showProject = false,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
}: TodoListProps) {
  const [status, setStatus] = useState<StatusFilter>('active')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('created')

  const counts = useMemo(() => {
    const completed = todos.filter((t) => t.is_completed).length
    return { all: todos.length, active: todos.length - completed, completed }
  }, [todos])

  const visible = useMemo(
    () => sortTodos(filterTodos(todos, { status, query }), sort),
    [todos, status, query, sort],
  )

  return (
    <div className="flex flex-col gap-4">
      <QuickAdd defaults={defaults} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="active">
              Active <CountLabel value={counts.active} />
            </TabsTrigger>
            <TabsTrigger value="completed">
              Done <CountLabel value={counts.completed} />
            </TabsTrigger>
            <TabsTrigger value="all">
              All <CountLabel value={counts.all} />
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <InputGroup className="md:w-60">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Filter tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter tasks"
            />
          </InputGroup>
          <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
            <SelectTrigger className="w-40 shrink-0" aria-label="Sort tasks">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectGroup>
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {sortLabels[key]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {visible.map((todo) => (
            <TodoItem key={todo.id} todo={todo} showProject={showProject} />
          ))}
        </ul>
      ) : todos.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <EmptyIcon />
            </EmptyMedia>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => actions.openNewTodo(defaults)}>
              <PlusIcon />
              Add a task
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              {query ? <SearchIcon /> : <CheckCheckIcon />}
            </EmptyMedia>
            <EmptyTitle>{query ? 'No matching tasks' : status === 'active' ? 'All caught up!' : 'Nothing here yet'}</EmptyTitle>
            <EmptyDescription>
              {query
                ? `Nothing matches "${query}". Try a different search.`
                : status === 'active'
                  ? 'Every task in this list is done.'
                  : 'Completed tasks will show up here.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </div>
  )
}

function CountLabel({ value }: { value: number }) {
  return <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
}

function QuickAdd({ defaults }: { defaults: Partial<CreateTodoBody> }) {
  const [title, setTitle] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim()) return
    setPending(true)
    try {
      await actions.createTodo({ ...defaults, title: title.trim() })
      setTitle('')
    } catch {
      // The store already surfaced a toast.
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup className="h-11 bg-card">
        <InputGroupAddon>
          <PlusIcon />
        </InputGroupAddon>
        <InputGroupInput
          placeholder="Add a task and press Enter…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={pending}
          aria-label="New task title"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            type="button"
            size="icon-xs"
            aria-label="Add with details"
            title="Add with details"
            onClick={() => {
              actions.openNewTodo({ ...defaults, title: title.trim() })
              setTitle('')
            }}
          >
            <SlidersHorizontalIcon />
          </InputGroupButton>
          <InputGroupButton type="submit" variant="default" size="sm" disabled={pending || !title.trim()}>
            {pending && <Spinner />}
            Add
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  )
}
