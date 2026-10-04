import { useState } from 'react'

import { actions } from '@/lib/store'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { Project } from '../../schemas/projects'

interface DeleteProjectDialogProps {
  project: Project | null
  taskCount: number
  onOpenChange: (open: boolean) => void
  onDeleted?: () => void
}

export function DeleteProjectDialog({ project, taskCount, onOpenChange, onDeleted }: DeleteProjectDialogProps) {
  const [pending, setPending] = useState(false)

  async function handleDelete() {
    if (!project) return
    setPending(true)
    try {
      await actions.deleteProject(project)
      onOpenChange(false)
      onDeleted?.()
    } catch {
      // The store already surfaced a toast.
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={project !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete "{project?.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            {taskCount > 0
              ? `This permanently deletes the project and its ${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}. This can't be undone.`
              : "This permanently deletes the project. This can't be undone."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: 'destructive' })}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              void handleDelete()
            }}
          >
            {pending && <Spinner />}
            Delete project
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
