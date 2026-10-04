import { useMemo } from 'react'
import { Link } from 'react-router'
import { eachDayOfInterval, format, parseISO, startOfToday, subDays } from 'date-fns'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ArrowRightIcon,
  CalendarClockIcon,
  CircleCheckBigIcon,
  FolderPlusIcon,
  ListTodoIcon,
  PartyPopperIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react'

import { actions, useAppStore } from '@/lib/store'
import { daysUntilDue, isOverdue, priorityMeta, sortTodos, toDateString } from '@/lib/todos'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Progress } from '@/components/ui/progress'
import { PageHeader } from '@/components/page-header'
import { ProjectDot } from '@/components/project-dot'
import { TodoItem } from '@/components/todo-item'
import { priorities } from '../../schemas/todos'

export function getMeta() {
  return { title: 'Dashboard - Todo App' }
}

const CHART_DAYS = 14

const chartConfig = {
  completed: { label: 'Completed', color: 'var(--chart-2)' },
} satisfies ChartConfig

export default function Dashboard() {
  const user = useAppStore((s) => s.user)
  const todos = useAppStore((s) => s.todos)
  const projects = useAppStore((s) => s.projects)

  const stats = useMemo(() => {
    const open = todos.filter((t) => !t.is_completed)
    const weekAgo = subDays(startOfToday(), 6).toISOString()
    return {
      open: open.length,
      dueToday: open.filter((t) => daysUntilDue(t) === 0).length,
      overdue: open.filter(isOverdue).length,
      completedThisWeek: todos.filter((t) => t.completed_at && t.completed_at >= weekAgo).length,
      completionRate: todos.length ? Math.round(((todos.length - open.length) / todos.length) * 100) : 0,
      byPriority: priorities.map((priority) => ({
        priority,
        count: open.filter((t) => t.priority === priority).length,
      })),
    }
  }, [todos])

  const chartData = useMemo(() => {
    const counts = new Map<string, number>()
    for (const todo of todos) {
      if (todo.completed_at) {
        const day = toDateString(parseISO(todo.completed_at))
        counts.set(day, (counts.get(day) ?? 0) + 1)
      }
    }
    return eachDayOfInterval({ start: subDays(startOfToday(), CHART_DAYS - 1), end: startOfToday() }).map(
      (day) => ({ date: toDateString(day), completed: counts.get(toDateString(day)) ?? 0 }),
    )
  }, [todos])

  // Overdue first, then today, then the next few scheduled; fall back to high priority.
  const upNext = useMemo(() => {
    const open = todos.filter((t) => !t.is_completed)
    const dated = sortTodos(
      open.filter((t) => t.due_date),
      'due',
    )
    const undated = sortTodos(
      open.filter((t) => !t.due_date),
      'priority',
    )
    return [...dated, ...undated].slice(0, 6)
  }, [todos])

  const projectProgress = useMemo(
    () =>
      projects.map((project) => {
        const items = todos.filter((t) => t.project_id === project.id)
        const done = items.filter((t) => t.is_completed).length
        return {
          project,
          total: items.length,
          done,
          percent: items.length ? Math.round((done / items.length) * 100) : 0,
        }
      }),
    [projects, todos],
  )

  const name = user?.email.split('@')[0] ?? 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      <PageHeader title={`${greeting}, ${name}`} description={format(new Date(), 'EEEE, MMMM d, yyyy')}>
        <Button variant="outline" size="sm" asChild>
          <Link to="/today">
            <CalendarClockIcon />
            Plan today
          </Link>
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ListTodoIcon} label="Open tasks" value={stats.open} hint="Across all projects" />
        <StatCard icon={CalendarClockIcon} label="Due today" value={stats.dueToday} hint="Scheduled for today" />
        <StatCard
          icon={TriangleAlertIcon}
          label="Overdue"
          value={stats.overdue}
          hint={stats.overdue ? 'Past their due date' : 'Nothing overdue'}
          badge={stats.overdue > 0 ? <Badge variant="destructive">Needs attention</Badge> : undefined}
        />
        <StatCard
          icon={CircleCheckBigIcon}
          label="Completed this week"
          value={stats.completedThisWeek}
          hint="Last 7 days"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tasks completed</CardTitle>
            <CardDescription>Daily completions over the last {CHART_DAYS} days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="aspect-auto h-56 w-full">
              <BarChart data={chartData} margin={{ left: -20, right: 4, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tickFormatter={(value: string) => format(parseISO(value), 'MMM d')}
                />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} width={40} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value: string) => format(parseISO(value), 'EEEE, MMM d')}
                    />
                  }
                />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Overall progress</CardTitle>
            <CardDescription>
              {todos.length - stats.open} of {todos.length} tasks done
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-4xl font-semibold tabular-nums">{stats.completionRate}%</span>
              <Progress value={stats.completionRate} aria-label={`${stats.completionRate}% of tasks completed`} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Open by priority</span>
              <ul className="flex flex-col gap-1.5 text-sm">
                {[...stats.byPriority].reverse().map(({ priority, count }) => (
                  <li key={priority} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{priorityMeta[priority].label}</span>
                    <span className="font-medium tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Up next</CardTitle>
            <CardDescription>Overdue and upcoming tasks, then your highest priorities</CardDescription>
          </CardHeader>
          <CardContent>
            {upNext.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {upNext.map((todo) => (
                  <TodoItem key={todo.id} todo={todo} showProject />
                ))}
              </ul>
            ) : (
              <Empty className="p-6 md:p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <PartyPopperIcon />
                  </EmptyMedia>
                  <EmptyTitle>You're all caught up</EmptyTitle>
                  <EmptyDescription>No open tasks. Add one to get going.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" onClick={() => actions.openNewTodo()}>
                    New task
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projects</CardTitle>
            <CardDescription>Progress across your projects</CardDescription>
          </CardHeader>
          <CardContent>
            {projectProgress.length > 0 ? (
              <ul className="flex flex-col gap-4">
                {projectProgress.map(({ project, total, done, percent }) => (
                  <li key={project.id}>
                    <Link
                      to={`/projects/${project.id}`}
                      className="group flex flex-col gap-2 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <ProjectDot color={project.color} />
                        <span className="truncate font-medium group-hover:underline">{project.name}</span>
                        <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
                          {done}/{total}
                        </span>
                      </div>
                      <Progress value={percent} className="h-1.5" aria-label={`${project.name}: ${percent}% complete`} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="p-6 md:p-6">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderPlusIcon />
                  </EmptyMedia>
                  <EmptyTitle>No projects yet</EmptyTitle>
                  <EmptyDescription>Projects keep related tasks together.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button size="sm" variant="outline" onClick={() => actions.openNewProject()}>
                    Create a project
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
          {projectProgress.length > 0 && (
            <CardFooter>
              <Button variant="ghost" size="sm" className="-ml-2" onClick={() => actions.openNewProject()}>
                New project
                <ArrowRightIcon />
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  badge,
}: {
  icon: LucideIcon
  label: string
  value: number
  hint: string
  badge?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription className="font-medium">{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
          {badge}
        </div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}
