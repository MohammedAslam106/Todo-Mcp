import { createHash, randomBytes } from 'node:crypto'
import { and, desc, eq, sql } from 'drizzle-orm'

import { apiTokens, users } from '../db/schema'
import type { ApiToken, CreatedApiToken } from '../schemas/tokens'
import type { Db } from './errors'

const TOKEN_PREFIX = 'todo_'

const tokenColumns = {
  id: apiTokens.id,
  name: apiTokens.name,
  created_at: apiTokens.created_at,
  last_used_at: apiTokens.last_used_at,
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createApiToken(db: Db, userId: number, name: string): Promise<CreatedApiToken> {
  const token = TOKEN_PREFIX + randomBytes(32).toString('base64url')
  const [created] = await db
    .insert(apiTokens)
    .values({ user_id: userId, name, token_hash: hashToken(token) })
    .returning(tokenColumns)
  return { ...created!, token }
}

export async function listApiTokens(db: Db, userId: number): Promise<ApiToken[]> {
  return db
    .select(tokenColumns)
    .from(apiTokens)
    .where(eq(apiTokens.user_id, userId))
    .orderBy(desc(apiTokens.created_at))
}

export async function revokeApiToken(db: Db, id: number, userId: number) {
  const deleted = await db
    .delete(apiTokens)
    .where(and(eq(apiTokens.id, id), eq(apiTokens.user_id, userId)))
    .returning({ id: apiTokens.id })
  return deleted.length === 1
}

/** Resolves a plaintext token to its user (and bumps `last_used_at`), or `undefined` if invalid. */
export async function verifyApiToken(db: Db, token: string) {
  if (!token.startsWith(TOKEN_PREFIX)) return undefined
  const [user] = await db
    .update(apiTokens)
    .set({ last_used_at: sql`now()` })
    .from(users)
    .where(and(eq(apiTokens.token_hash, hashToken(token)), eq(users.id, apiTokens.user_id)))
    .returning({ id: users.id, email: users.email })
  return user
}
