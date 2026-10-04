import { projectColorClass } from '@/lib/todos'
import { cn } from '@/lib/utils'
import type { ProjectColor } from '../../schemas/projects'

export function ProjectDot({ color, className }: { color: ProjectColor; className?: string }) {
  return <span aria-hidden className={cn('size-2 shrink-0 rounded-full', projectColorClass[color], className)} />
}
