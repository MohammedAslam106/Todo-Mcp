import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import {
  CalendarClockIcon,
  CalendarDaysIcon,
  ChevronsUpDownIcon,
  CircleCheckBigIcon,
  InboxIcon,
  LayoutDashboardIcon,
  ListTodoIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlugIcon,
  PlusIcon,
  SearchIcon,
  SunIcon,
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { useTheme, type Theme } from '@/lib/theme'
import { daysUntilDue } from '@/lib/todos'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Kbd } from '@/components/ui/kbd'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { ProjectDot } from '@/components/project-dot'
import type { Project } from '../../schemas/projects'

interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  count?: number
}

export function AppSidebar() {
  const status = useAppStore((s) => s.status)
  const todos = useAppStore((s) => s.todos)
  const { pathname } = useLocation()

  const nav: NavItem[] = useMemo(() => {
    const active = todos.filter((t) => !t.is_completed)
    return [
      { title: 'Dashboard', url: '/', icon: LayoutDashboardIcon },
      { title: 'Inbox', url: '/inbox', icon: InboxIcon, count: active.filter((t) => t.project_id === null).length },
      {
        title: 'Today',
        url: '/today',
        icon: CalendarClockIcon,
        count: active.filter((t) => (daysUntilDue(t) ?? 1) <= 0).length,
      },
      {
        title: 'Upcoming',
        url: '/upcoming',
        icon: CalendarDaysIcon,
        count: active.filter((t) => (daysUntilDue(t) ?? 0) > 0).length,
      },
      { title: 'Completed', url: '/completed', icon: CircleCheckBigIcon },
    ]
  }, [todos])

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <ListTodoIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Todo App</span>
                  <span className="truncate text-xs text-muted-foreground">Plan. Focus. Finish.</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="New task"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground"
                  onClick={() => actions.openNewTodo()}
                  disabled={status !== 'ready'}
                >
                  <PlusIcon />
                  <span>New task</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Search" onClick={() => actions.setCommandOpen(true)}>
                  <SearchIcon />
                  <span>Search</span>
                </SidebarMenuButton>
                <SidebarMenuBadge>
                  <Kbd>Ctrl K</Kbd>
                </SidebarMenuBadge>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {!!item.count && <SidebarMenuBadge>{item.count}</SidebarMenuBadge>}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <NavProjects />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === '/connect'} tooltip="Connect AI assistant">
              <Link to="/connect">
                <PlugIcon />
                <span>Connect AI assistant</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function NavProjects() {
  const status = useAppStore((s) => s.status)
  const projects = useAppStore((s) => s.projects)
  const todos = useAppStore((s) => s.todos)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const [deleting, setDeleting] = useState<Project | null>(null)

  const openCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const todo of todos) {
      if (todo.project_id !== null && !todo.is_completed) {
        counts.set(todo.project_id, (counts.get(todo.project_id) ?? 0) + 1)
      }
    }
    return counts
  }, [todos])

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupAction title="New project" onClick={() => actions.openNewProject()}>
        <PlusIcon />
        <span className="sr-only">New project</span>
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {status !== 'ready' &&
            Array.from({ length: 3 }).map((_, index) => (
              <SidebarMenuItem key={index}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))}

          {status === 'ready' && projects.length === 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton className="text-muted-foreground" onClick={() => actions.openNewProject()}>
                <PlusIcon />
                <span>Create your first project</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {projects.map((project) => {
            const url = `/projects/${project.id}`
            const count = openCounts.get(project.id) ?? 0
            return (
              <SidebarMenuItem key={project.id}>
                <SidebarMenuButton asChild isActive={pathname === url} tooltip={project.name}>
                  <Link to={url}>
                    <span className="flex size-4 items-center justify-center">
                      <ProjectDot color={project.color} />
                    </span>
                    <span>{project.name}</span>
                  </Link>
                </SidebarMenuButton>
                {count > 0 && (
                  <SidebarMenuBadge className="group-hover/menu-item:opacity-0 group-has-[[data-state=open]]/menu-item:opacity-0">
                    {count}
                  </SidebarMenuBadge>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuAction showOnHover>
                      <MoreHorizontalIcon />
                      <span className="sr-only">Project actions</span>
                    </SidebarMenuAction>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-48"
                    side={isMobile ? 'bottom' : 'right'}
                    align={isMobile ? 'end' : 'start'}
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={() => actions.openNewTodo({ project_id: project.id })}>
                        <PlusIcon />
                        Add task
                      </DropdownMenuItem>
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
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>

      <DeleteProjectDialog
        project={deleting}
        taskCount={deleting ? todos.filter((t) => t.project_id === deleting.id).length : 0}
        onOpenChange={(open) => !open && setDeleting(null)}
        onDeleted={() => {
          if (deleting && pathname === `/projects/${deleting.id}`) navigate('/')
        }}
      />
    </SidebarGroup>
  )
}

function NavUser() {
  const user = useAppStore((s) => s.user)
  const { isMobile } = useSidebar()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  if (!user) {
    return <SidebarMenuSkeleton showIcon />
  }

  const name = user.name || user.email.split('@')[0]!
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  // Google avatars refuse requests that carry a Referer.
  const avatar = user.avatar_url && (
    <AvatarImage src={user.avatar_url} alt="" referrerPolicy="no-referrer" className="rounded-lg" />
  )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="size-8 rounded-lg">
                {avatar}
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronsUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {avatar}
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  {theme === 'dark' ? <MoonIcon /> : theme === 'light' ? <SunIcon /> : <MonitorIcon />}
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onSelect={async () => {
                  await actions.logout()
                  navigate('/login')
                }}
              >
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
