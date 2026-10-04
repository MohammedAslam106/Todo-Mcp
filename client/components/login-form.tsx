import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { TriangleAlertIcon } from 'lucide-react'

import { api } from '@/lib/api'
import { ProviderIcon } from '@/components/provider-icons'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import type { AuthProviders, OAuthProviderId } from '../../schemas/auth'

export function LoginForm() {
  const [providers, setProviders] = useState<AuthProviders | null>(null)
  const [loadError, setLoadError] = useState('')
  const [redirecting, setRedirecting] = useState<OAuthProviderId | null>(null)
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  // Set by the server when a sign-in attempt fails (cancelled, no verified email, …).
  const error = params.get('error') || loadError
  // Where to return afterwards (e.g. /connect). The server only honours same-origin paths.
  const next = params.get('next')

  useEffect(() => {
    api.authProviders().then(
      (res) => setProviders(res.providers),
      (err) => setLoadError(err instanceof Error ? err.message : 'Could not load sign-in options'),
    )
    // Coming back with the browser's back button would otherwise leave the buttons spinning.
    const reset = () => setRedirecting(null)
    window.addEventListener('pageshow', reset)
    return () => window.removeEventListener('pageshow', reset)
  }, [])

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome</CardTitle>
        <CardDescription>Sign in to pick up where you left off. New here? Signing in creates your account.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        {!providers ? (
          !loadError && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )
        ) : providers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No sign-in providers are configured on this server. Set the Google or GitHub OAuth credentials in its
            environment and restart it.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                variant="outline"
                size="lg"
                className="w-full"
                asChild
                aria-disabled={redirecting !== null || undefined}
              >
                <a
                  href={`/api/auth/${provider.id}${next ? `?${new URLSearchParams({ next })}` : ''}`}
                  onClick={(e) => (redirecting ? e.preventDefault() : setRedirecting(provider.id))}
                >
                  {redirecting === provider.id ? <Spinner /> : <ProviderIcon provider={provider.id} />}
                  Continue with {provider.label}
                </a>
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
