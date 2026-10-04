import fastifyOauth2 from '@fastify/oauth2'
import type { FastifyReply } from 'fastify'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'

import {
  authResponseSchema,
  oauthCallbackQuerySchema,
  oauthStartQuerySchema,
  okResponseSchema,
  providersResponseSchema,
} from '../schemas/auth'
import { errorResponseSchema } from '../schemas/common'
import { ServiceError } from '../services/errors'
import { appUrl, enabledProviders, oauthProviders } from '../services/oauth'
import { getUser, signInWithOAuth } from '../services/users'

// Secure cookies are dropped by browsers on plain http, so follow the scheme the app is actually served on.
const secure = appUrl().startsWith('https://')

const SESSION_COOKIE = 'token'
const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax' as const,
  secure,
  maxAge: 60 * 60 * 24 * 7, // 7 days
}

// Where to send the user once the provider redirects back (e.g. /connect). Lives only for the round trip.
const NEXT_COOKIE = 'oauth_next'
const OAUTH_COOKIE_OPTS = { httpOnly: true, path: '/api/auth', sameSite: 'lax' as const, secure }

const NAMESPACES = { google: 'oauth2Google', github: 'oauth2Github' } as const

/** Same-origin paths only, so `next` can't bounce the user to another site. */
function safeNext(next: string | undefined) {
  return next?.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/'
}

const authRoutes: FastifyPluginAsyncZod = async (server) => {
  server.get(
    '/providers',
    {
      schema: {
        tags: ['auth'],
        summary: 'List the sign-in providers configured on this server',
        response: { 200: providersResponseSchema },
      },
    },
    async (req, reply) => {
      reply.send({ providers: enabledProviders().map((id) => ({ id, label: oauthProviders[id].label })) })
    },
  )

  for (const id of enabledProviders()) {
    const provider = oauthProviders[id]
    const namespace = NAMESPACES[id]

    // Handles the state (CSRF) and PKCE cookies and the code-for-token exchange.
    await server.register(fastifyOauth2, {
      name: namespace,
      scope: provider.scope,
      credentials: { client: provider.credentials()!, auth: provider.configuration },
      callbackUri: `${appUrl()}/api/auth/${id}/callback`,
      pkce: provider.pkce,
      cookie: { path: '/api/auth', secure },
      redirectStateCookieName: `oauth2_${id}_state`,
      verifierCookieName: `oauth2_${id}_verifier`,
    })
    const oauth = server[namespace]!

    server.get(
      `/${id}`,
      {
        schema: {
          tags: ['auth'],
          summary: `Sign in with ${provider.label} (redirects to ${provider.label})`,
          querystring: oauthStartQuerySchema,
        },
      },
      async (req, reply) => {
        reply.setCookie(NEXT_COOKIE, safeNext(req.query.next), OAUTH_COOKIE_OPTS)
        return reply.redirect(await oauth.generateAuthorizationUri(req, reply))
      },
    )

    server.get(
      `/${id}/callback`,
      {
        schema: {
          tags: ['auth'],
          summary: `${provider.label} redirects here after sign-in; sets the session cookie`,
          querystring: oauthCallbackQuerySchema,
        },
      },
      async (req, reply) => {
        const next = safeNext(req.cookies[NEXT_COOKIE])
        reply.clearCookie(NEXT_COOKIE, OAUTH_COOKIE_OPTS)

        if (req.query.error) {
          const message =
            req.query.error === 'access_denied'
              ? `${provider.label} sign-in was cancelled.`
              : `${provider.label} sign-in failed (${req.query.error}).`
          return redirectToLogin(reply, message, next)
        }

        try {
          const { token } = await oauth.getAccessTokenFromAuthorizationCodeFlow(req, reply)
          const user = await signInWithOAuth(server.db, await provider.fetchProfile(token.access_token))
          reply.setCookie(SESSION_COOKIE, server.jwt.sign({ id: user.id, email: user.email }), SESSION_COOKIE_OPTS)
          return reply.redirect(next)
        } catch (err) {
          req.log.warn({ err }, `${provider.label} sign-in failed`)
          const message =
            err instanceof ServiceError ? err.message : `Could not sign in with ${provider.label}. Please try again.`
          return redirectToLogin(reply, message, next)
        }
      },
    )
  }

  server.post(
    '/logout',
    {
      schema: {
        tags: ['auth'],
        summary: 'Clear the session cookie',
        response: { 200: okResponseSchema },
      },
    },
    async (req, reply) => {
      reply.clearCookie(SESSION_COOKIE, { path: '/' })
      reply.send({ ok: true })
    },
  )

  server.get(
    '/me',
    {
      onRequest: [server.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get the currently authenticated user',
        response: { 200: authResponseSchema, 401: errorResponseSchema },
      },
    },
    async (req, reply) => {
      const user = await getUser(server.db, req.user.id)
      if (!user) {
        // A valid session for a user that has since been deleted.
        reply.clearCookie(SESSION_COOKIE, { path: '/' })
        return reply.code(401).send({ error: 'Unauthorized' })
      }
      reply.send({ user })
    },
  )
}

function redirectToLogin(reply: FastifyReply, error: string, next: string) {
  const params = new URLSearchParams({ error })
  if (next !== '/') params.set('next', next)
  return reply.redirect(`/login?${params}`)
}

export default authRoutes
