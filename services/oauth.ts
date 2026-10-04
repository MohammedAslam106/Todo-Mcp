import fastifyOauth2, { type ProviderConfiguration } from '@fastify/oauth2'

import type { OAuthProfile, OAuthProvider } from './users'

interface ProviderDefinition {
  label: string
  configuration: ProviderConfiguration
  scope: string[]
  /** Google supports PKCE; GitHub's OAuth apps rely on the client secret alone. */
  pkce?: 'S256'
  credentials: () => { id: string; secret: string } | undefined
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>
}

function credentialsFromEnv(prefix: string) {
  const id = process.env[`${prefix}_CLIENT_ID`]
  const secret = process.env[`${prefix}_CLIENT_SECRET`]
  return id && secret ? { id, secret } : undefined
}

async function getJson<T>(url: string, accessToken: string, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, ...headers } })
  if (!res.ok) {
    throw new Error(`${new URL(url).host} responded ${res.status} ${res.statusText}`)
  }
  return (await res.json()) as T
}

const githubHeaders = { Accept: 'application/vnd.github+json', 'User-Agent': 'todo-app' }

export const oauthProviders: Record<OAuthProvider, ProviderDefinition> = {
  google: {
    label: 'Google',
    configuration: fastifyOauth2.GOOGLE_CONFIGURATION,
    scope: ['openid', 'email', 'profile'],
    pkce: 'S256',
    credentials: () => credentialsFromEnv('GOOGLE'),
    async fetchProfile(accessToken) {
      const info = await getJson<{
        sub: string
        email?: string
        email_verified?: boolean
        name?: string
        picture?: string
      }>('https://openidconnect.googleapis.com/v1/userinfo', accessToken)
      return {
        provider: 'google',
        providerAccountId: info.sub,
        email: info.email && info.email_verified ? info.email : null,
        name: info.name || null,
        avatarUrl: info.picture || null,
      }
    },
  },

  github: {
    label: 'GitHub',
    configuration: fastifyOauth2.GITHUB_CONFIGURATION,
    scope: ['read:user', 'user:email'],
    credentials: () => credentialsFromEnv('GITHUB'),
    async fetchProfile(accessToken) {
      const [user, emails] = await Promise.all([
        getJson<{ id: number; login: string; name: string | null; avatar_url: string | null }>(
          'https://api.github.com/user',
          accessToken,
          githubHeaders,
        ),
        // The profile's public `email` may be empty or unverified; the primary verified address is what we trust.
        getJson<{ email: string; primary: boolean; verified: boolean }[]>(
          'https://api.github.com/user/emails',
          accessToken,
          githubHeaders,
        ),
      ])
      return {
        provider: 'github',
        providerAccountId: String(user.id),
        email: emails.find((e) => e.primary && e.verified)?.email ?? null,
        name: user.name || user.login,
        avatarUrl: user.avatar_url,
      }
    },
  },
}

/** Providers with a client id and secret set in the environment, in display order. */
export function enabledProviders() {
  return (Object.keys(oauthProviders) as OAuthProvider[]).filter((id) => oauthProviders[id].credentials())
}

/**
 * The app's public address, as seen from the browser. Providers redirect back to
 * `${appUrl()}/api/auth/<provider>/callback`, so it must match the OAuth app's settings.
 */
export function appUrl() {
  return (process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '')
}
