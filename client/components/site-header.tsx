import { Link, useLocation } from 'react-router'
import { MoonIcon, PlusIcon, SearchIcon, SunIcon } from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/inbox': 'Inbox',
  '/today': 'Today',
  '/upcoming': 'Upcoming',
  '/completed': 'Completed',
  '/connect': 'Connect AI assistant',
}

export function SiteHeader() {
  const { pathname } = useLocation()
  const projects = useAppStore((s) => s.projects)
  const status = useAppStore((s) => s.status)
  const { resolvedTheme, setTheme } = useTheme()

  const projectMatch = pathname.match(/^\/projects\/(\d+)/)
  const project = projectMatch ? projects.find((p) => p.id === Number(projectMatch[1])) : undefined
  const title = project?.name ?? pageTitles[pathname] ?? ''

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:rounded-t-xl">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            {projectMatch ? (
              <span>Projects</span>
            ) : (
              <BreadcrumbLink asChild>
                <Link to="/">Workspace</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
          <BreadcrumbSeparator className="hidden md:block" />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate">{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground sm:flex"
          onClick={() => actions.setCommandOpen(true)}
        >
          <SearchIcon />
          Search…
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          <SunIcon className="dark:hidden" />
          <MoonIcon className="hidden dark:block" />
        </Button>
        <Button
          size="sm"
          disabled={status !== 'ready'}
          onClick={() => actions.openNewTodo(project ? { project_id: project.id } : {})}
        >
          <PlusIcon />
          <span className="hidden sm:inline">New task</span>
        </Button>
      </div>
    </header>
  )
}
