import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FolderSearchIcon, ListTodoIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { isOverdue } from '@/lib/todos'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { PageHeader } from '@/components/page-header'
import { ProjectDot } from '@/components/project-dot'
import { TodoList } from '@/components/todo-list'
import type { Project } from '../../../schemas/projects'

export function getMeta() {
  return { title: 'Project - Todo App' }
}

export default function ProjectPage() {
  const { id } = useParams()
  const projects = useAppStore((s) => s.projects)
  const todos = useAppStore((s) => s.todos)
  const navigate = useNavigate()
  const [deleting, setDeleting] = useState<Project | null>(null)

  const project = projects.find((p) => p.id === Number(id))
  const projectTodos = useMemo(() => todos.filter((t) => t.project_id === Number(id)), [todos, id])

  if (!project) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderSearchIcon />
          </EmptyMedia>
          <EmptyTitle>Project not found</EmptyTitle>
          <EmptyDescription>It may have been deleted, or the link is wrong.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/">Back to dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  const done = projectTodos.filter((t) => t.is_completed).length
  const overdue = projectTodos.filter(isOverdue).length
  const percent = projectTodos.length ? Math.round((done / projectTodos.length) * 100) : 0

  return (
    <>
      <PageHeader
        title={
          <>
            <ProjectDot color={project.color} className="size-3" />
            <span className="truncate">{project.name}</span>
          </>
        }
        description={project.description || 'No description.'}
      >
        <Button variant="outline" size="sm" onClick={() => actions.openNewTodo({ project_id: project.id })}>
          <PlusIcon />
          Add task
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="size-8" aria-label="Project actions">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => actions.openEditProject(project)}>
                <PencilIcon />
                Edit project
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onSelect={() => setDeleting(project)}
              >
                <Trash2Icon />
                Delete project
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </PageHeader>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress</span>
              <span className="tabular-nums text-muted-foreground">{percent}%</span>
            </div>
            <Progress value={percent} aria-label={`${percent}% complete`} />
          </div>
          <dl className="grid grid-cols-3 gap-6 text-sm">
            <Stat label="Open" value={projectTodos.length - done} />
            <Stat label="Done" value={done} />
            <Stat label="Overdue" value={overdue} />
          </dl>
        </CardContent>
      </Card>

      <TodoList
        todos={projectTodos}
        defaults={{ project_id: project.id }}
        emptyIcon={ListTodoIcon}
        emptyTitle="No tasks in this project"
        emptyDescription="Break the project down into small, concrete next steps."
      />

      <DeleteProjectDialog
        project={deleting}
        taskCount={projectTodos.length}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => navigate('/')}
      />
    </>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
