import { Suspense, useEffect, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { actions, useAppStore } from '@/lib/store'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { Toaster } from '@/components/ui/sonner'
import { AppSidebar } from '@/components/app-sidebar'
import { CommandMenu } from '@/components/command-menu'
import { ProjectDialog } from '@/components/project-dialog'
import { SiteHeader } from '@/components/site-header'
import { TodoDialog } from '@/components/todo-dialog'

/** The signed-in app shell: sidebar + header, with a client-side auth guard. */
export default function Default({ children }: { children: ReactNode }) {
  const status = useAppStore((s) => s.status)
  const navigate = useNavigate()
  const { pathname } = useLocation()

  useEffect(() => {
    void actions.load()
  }, [])

  useEffect(() => {
    if (status === 'signed-out') {
      const next = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`
      navigate(`/login${next}`, { replace: true })
    }
  }, [status])

  return (
    <>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SiteHeader />
          <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">
            {status === 'ready' ? <Suspense fallback={<PageSkeleton />}>{children}</Suspense> : <PageSkeleton />}
          </main>
        </SidebarInset>
        <TodoDialog />
        <ProjectDialog />
        <CommandMenu />
      </SidebarProvider>
      <Toaster richColors closeButton />
    </>
  )
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-11 w-full" />
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    </div>
  )
}
