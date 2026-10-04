import { Suspense, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ListTodoIcon } from 'lucide-react'

import { Toaster } from '@/components/ui/sonner'

/** Centered layout for the signed-out page (login). */
export default function Auth({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Link to="/" className="flex items-center gap-2 self-center font-semibold">
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ListTodoIcon className="size-4" />
            </div>
            Todo App
          </Link>
          <Suspense>{children}</Suspense>
        </div>
      </div>
      <Toaster richColors closeButton />
    </>
  )
}
