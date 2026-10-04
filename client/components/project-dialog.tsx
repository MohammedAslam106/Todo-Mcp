import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'

import { actions, useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
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
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { ProjectDot } from '@/components/project-dot'
import { projectColors, type ProjectColor } from '../../schemas/projects'

/** Create/edit dialog for a project. Rendered once in the app layout, driven by the store. */
export function ProjectDialog() {
  const { open, project } = useAppStore((s) => s.projectDialog)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<ProjectColor>('chart-1')
  const [pending, setPending] = useState(false)
  const navigate = useNavigate()
  const projectCount = useAppStore((s) => s.projects.length)

  useEffect(() => {
    if (!open) return
    setName(project?.name ?? '')
    setDescription(project?.description ?? '')
    // New projects cycle through the palette so neighbours look distinct.
    setColor(project?.color ?? projectColors[projectCount % projectColors.length]!)
  }, [open, project])

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    const body = { name: name.trim(), description: description.trim() || null, color }
    setPending(true)
    try {
      if (project) {
        await actions.updateProject(project.id, body)
      } else {
        const created = await actions.createProject(body)
        navigate(`/projects/${created.id}`)
      }
      actions.closeProjectDialog()
    } catch {
      // The store already surfaced a toast.
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && actions.closeProjectDialog()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <DialogHeader>
            <DialogTitle>{project ? 'Edit project' : 'New project'}</DialogTitle>
            <DialogDescription>
              {project ? 'Rename or recolor this project.' : 'Group related tasks together in a project.'}
            </DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="project-name">Name</FieldLabel>
              <Input
                id="project-name"
                autoFocus
                required
                maxLength={100}
                placeholder="e.g. Website redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="project-description">Description</FieldLabel>
              <Textarea
                id="project-description"
                rows={2}
                maxLength={2000}
                placeholder="What is this project about? (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel id="project-color-label">Color</FieldLabel>
              <ToggleGroup
                type="single"
                variant="outline"
                className="justify-start"
                aria-labelledby="project-color-label"
                value={color}
                onValueChange={(value) => value && setColor(value as ProjectColor)}
              >
                {projectColors.map((value, index) => (
                  <ToggleGroupItem key={value} value={value} aria-label={`Color ${index + 1}`}>
                    <ProjectDot color={value} className="size-3" />
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => actions.closeProjectDialog()}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !name.trim()}>
              {pending && <Spinner />}
              {project ? 'Save changes' : 'Create project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
