import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { actions } from '@/lib/store'
import { LoginForm } from '@/components/login-form'
import { Spinner } from '@/components/ui/spinner'

export const layout = 'auth'

export function getMeta() {
  return { title: 'Sign in - Todo App' }
}

/** Same-origin paths only, mirroring the server's check in routes/auth.ts. */
function safeNext(next: string | null) {
  return next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

export default function Login() {
  const navigate = useNavigate()
  const { search } = useLocation()
  // Hold off on the form until we know the visitor isn't already signed in.
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    void actions.load().then((signedIn) => {
      if (signedIn) {
        navigate(safeNext(new URLSearchParams(search).get('next')), { replace: true })
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    )
  }

  return <LoginForm />
}
