import { CalendarIcon, FlagIcon, FolderIcon, InboxIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { dueDate, formatDueDate, isOverdue, priorityMeta } from '@/lib/todos'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ProjectDot } from '@/components/project-dot'
import { priorities, type Priority, type Todo } from '../../schemas/todos'

export function TodoItem({ todo, showProject = false }: { todo: Todo; showProject?: boolean }) {
  const projects = useAppStore((s) => s.projects)
  const project = projects.find((p) => p.id === todo.project_id)
  const due = dueDate(todo)
  const overdue = isOverdue(todo)

  return (
    <li
      className={cn(
        'group flex items-start gap-3 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/40',
        todo.is_completed && 'bg-muted/40',
      )}
    >
      <Checkbox
        className="mt-0.5 rounded-full"
        checked={todo.is_completed}
        onCheckedChange={() => actions.toggleTodo(todo)}
        aria-label={todo.is_completed ? `Mark "${todo.title}" as not done` : `Mark "${todo.title}" as done`}
      />

      <button
        type="button"
        className="flex min-w-0 flex-1 flex-col gap-1.5 text-left outline-none"
        onClick={() => actions.openEditTodo(todo)}
      >
        <span
          className={cn(
            'truncate text-sm font-medium leading-tight',
            todo.is_completed && 'text-muted-foreground line-through',
          )}
        >
          {todo.title}
        </span>
        {todo.description && (
          <span className="line-clamp-2 text-sm text-muted-foreground">{todo.description}</span>
        )}
        {(todo.priority !== 'none' || due || (showProject && project)) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {todo.priority !== 'none' && (
              <Badge variant={todo.priority === 'high' && !todo.is_completed ? 'destructive' : 'secondary'}>
                <FlagIcon />
                {priorityMeta[todo.priority].label}
              </Badge>
            )}
            {due && (
              <Badge variant={overdue ? 'destructive' : 'outline'}>
                <CalendarIcon />
                {overdue ? `Overdue · ${formatDueDate(due)}` : formatDueDate(due)}
              </Badge>
            )}
            {showProject && project && (
              <Badge variant="outline">
                <ProjectDot color={project.color} />
                {project.name}
              </Badge>
            )}
          </span>
        )}
      </button>

      <TodoActions todo={todo} />
    </li>
  )
}

function TodoActions({ todo }: { todo: Todo }) {
  const projects = useAppStore((s) => s.projects)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 opacity-100 md:opacity-0 md:group-hover:opacity-100 data-[state=open]:opacity-100"
          aria-label="Task actions"
        >
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => actions.openEditTodo(todo)}>
            <PencilIcon />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FlagIcon />
              Priority
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={todo.priority}
                onValueChange={(value) =>
                  actions.updateTodo(todo.id, { priority: value as Priority }).catch(() => {})
                }
              >
                {[...priorities].reverse().map((priority) => (
                  <DropdownMenuRadioItem key={priority} value={priority}>
                    {priorityMeta[priority].label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <FolderIcon />
              Move to
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={String(todo.project_id ?? 'inbox')}
                onValueChange={(value) =>
                  actions
                    .updateTodo(todo.id, { project_id: value === 'inbox' ? null : Number(value) })
                    .catch(() => {})
                }
              >
                <DropdownMenuRadioItem value="inbox">
                  <InboxIcon />
                  Inbox
                </DropdownMenuRadioItem>
                {projects.map((project) => (
                  <DropdownMenuRadioItem key={project.id} value={String(project.id)}>
                    <ProjectDot color={project.color} />
                    <span className="truncate">{project.name}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => actions.deleteTodo(todo)}
          >
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
