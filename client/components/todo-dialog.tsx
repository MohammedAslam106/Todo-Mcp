import { useEffect, useState, type FormEvent } from 'react'
import { CalendarIcon, InboxIcon, Trash2Icon, XIcon } from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { formatDueDate, priorityMeta, toDateString } from '@/lib/todos'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ProjectDot } from '@/components/project-dot'
import { priorities, type Priority } from '../../schemas/todos'

interface FormState {
  title: string
  description: string
  priority: Priority
  dueDate: Date | undefined
  projectId: string // project id, or "inbox"
}

/** Create/edit dialog for a task. Rendered once in the app layout, driven by the store. */
export function TodoDialog() {
  const { open, todo, defaults } = useAppStore((s) => s.todoDialog)
  const projects = useAppStore((s) => s.projects)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [pending, setPending] = useState(false)

  // Reset the form each time the dialog opens.
  useEffect(() => {
    if (!open) return
    setForm(
      todo
        ? {
            title: todo.title,
            description: todo.description ?? '',
            priority: todo.priority,
            dueDate: todo.due_date ? new Date(`${todo.due_date}T00:00:00`) : undefined,
            projectId: String(todo.project_id ?? 'inbox'),
          }
        : {
            ...emptyForm(),
            title: defaults.title ?? '',
            priority: defaults.priority ?? 'none',
            dueDate: defaults.due_date ? new Date(`${defaults.due_date}T00:00:00`) : undefined,
            projectId: String(defaults.project_id ?? 'inbox'),
          },
    )
  }, [open, todo, defaults])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.title.trim()) return
    const body = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      priority: form.priority,
      due_date: form.dueDate ? toDateString(form.dueDate) : null,
      project_id: form.projectId === 'inbox' ? null : Number(form.projectId),
    }
    setPending(true)
    try {
      if (todo) {
        await actions.updateTodo(todo.id, body)
      } else {
        await actions.createTodo(body)
      }
      actions.closeTodoDialog()
    } catch {
      // The store already surfaced a toast; keep the dialog open so nothing is lost.
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && actions.closeTodoDialog()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{todo ? 'Edit task' : 'New task'}</DialogTitle>
            <DialogDescription>
              {todo ? 'Update the details of this task.' : 'Capture what needs doing, then organise it.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="todo-title">Title</FieldLabel>
              <Input
                id="todo-title"
                autoFocus
                required
                maxLength={500}
                placeholder="e.g. Draft the launch announcement"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="todo-description">Description</FieldLabel>
              <Textarea
                id="todo-description"
                rows={3}
                maxLength={5000}
                placeholder="Add more details (optional)"
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="todo-project">Project</FieldLabel>
                <Select value={form.projectId} onValueChange={(value) => update('projectId', value)}>
                  <SelectTrigger id="todo-project">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="inbox">
                        <span className="flex items-center gap-2">
                          <InboxIcon className="text-muted-foreground" />
                          Inbox
                        </span>
                      </SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          <span className="flex items-center gap-2">
                            <ProjectDot color={project.color} />
                            {project.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field>
                <FieldLabel htmlFor="todo-priority">Priority</FieldLabel>
                <Select value={form.priority} onValueChange={(value) => update('priority', value as Priority)}>
                  <SelectTrigger id="todo-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {[...priorities].reverse().map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priorityMeta[priority].label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="todo-due">Due date</FieldLabel>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="todo-due"
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal data-[empty=true]:text-muted-foreground"
                      data-empty={!form.dueDate}
                    >
                      <CalendarIcon />
                      {form.dueDate ? formatDueDate(form.dueDate) : 'No due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.dueDate}
                      onSelect={(date) => update('dueDate', date)}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {form.dueDate && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Clear due date"
                    onClick={() => update('dueDate', undefined)}
                  >
                    <XIcon />
                  </Button>
                )}
              </div>
            </Field>
          </FieldGroup>

          <DialogFooter className="sm:justify-between">
            {todo ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  actions.closeTodoDialog()
                  void actions.deleteTodo(todo)
                }}
              >
                <Trash2Icon />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={() => actions.closeTodoDialog()}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !form.title.trim()}>
                {pending && <Spinner />}
                {todo ? 'Save changes' : 'Create task'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function emptyForm(): FormState {
  return { title: '', description: '', priority: 'none', dueDate: undefined, projectId: 'inbox' }
}
