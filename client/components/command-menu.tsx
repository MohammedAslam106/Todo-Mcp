import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import {
  CalendarClockIcon,
  CalendarDaysIcon,
  CircleCheckBigIcon,
  CircleIcon,
  FolderPlusIcon,
  InboxIcon,
  LayoutDashboardIcon,
  MoonIcon,
  PlugIcon,
  PlusIcon,
  SunIcon,
} from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { useTheme } from '@/lib/theme'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import { ProjectDot } from '@/components/project-dot'

const pages = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboardIcon },
  { title: 'Inbox', url: '/inbox', icon: InboxIcon },
  { title: 'Today', url: '/today', icon: CalendarClockIcon },
  { title: 'Upcoming', url: '/upcoming', icon: CalendarDaysIcon },
  { title: 'Completed', url: '/completed', icon: CircleCheckBigIcon },
  { title: 'Connect AI assistant', url: '/connect', icon: PlugIcon },
]

/** Global Ctrl/⌘+K palette: navigate, create, and jump to any open task. */
export function CommandMenu() {
  const open = useAppStore((s) => s.commandOpen)
  const projects = useAppStore((s) => s.projects)
  const todos = useAppStore((s) => s.todos)
  const navigate = useNavigate()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        actions.setCommandOpen(!open)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  function run(fn: () => void) {
    actions.setCommandOpen(false)
    fn()
  }

  const openTodos = todos.filter((t) => !t.is_completed)

  return (
    <CommandDialog
      open={open}
      onOpenChange={actions.setCommandOpen}
      title="Search"
      description="Search tasks, projects, and commands"
    >
      <CommandInput placeholder="Search tasks, projects, and commands…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => actions.openNewTodo()}>
            <PlusIcon />
            New task
          </CommandItem>
          <CommandItem onSelect={() => actions.openNewProject()}>
            <FolderPlusIcon />
            New project
          </CommandItem>
          <CommandItem onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}>
            {resolvedTheme === 'dark' ? <SunIcon /> : <MoonIcon />}
            Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} theme
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {pages.map((page) => (
            <CommandItem key={page.url} onSelect={() => run(() => navigate(page.url))}>
              <page.icon />
              {page.title}
            </CommandItem>
          ))}
        </CommandGroup>
        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={`project ${project.name} ${project.id}`}
                  onSelect={() => run(() => navigate(`/projects/${project.id}`))}
                >
                  <span className="flex size-5 items-center justify-center">
                    <ProjectDot color={project.color} />
                  </span>
                  {project.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        {openTodos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Open tasks">
              {openTodos.map((todo) => {
                const project = projects.find((p) => p.id === todo.project_id)
                return (
                  <CommandItem
                    key={todo.id}
                    value={`task ${todo.title} ${todo.id}`}
                    onSelect={() => actions.openEditTodo(todo)}
                  >
                    <CircleIcon />
                    <span className="truncate">{todo.title}</span>
                    <CommandShortcut>{project?.name ?? 'Inbox'}</CommandShortcut>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
