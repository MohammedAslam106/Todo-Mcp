import { and, eq } from 'drizzle-orm'

import { accounts, users } from '../db/schema'
import type { UserPublic } from '../schemas/auth'
import { ServiceError, type Db } from './errors'

export type OAuthProvider = (typeof accounts.$inferSelect)['provider']

/** What we learn about a person from Google/GitHub after they sign in. */
export interface OAuthProfile {
  provider: OAuthProvider
  /** The provider's stable user id (Google `sub`, GitHub numeric id). */
  providerAccountId: string
  /** Only set when the provider says the address is verified. */
  email: string | null
  name: string | null
  avatarUrl: string | null
}

const userColumns = {
  id: users.id,
  email: users.email,
  name: users.name,
  avatar_url: users.avatar_url,
}

export async function getUser(db: Db, id: number): Promise<UserPublic | undefined> {
  const [user] = await db.select(userColumns).from(users).where(eq(users.id, id))
  return user
}

export async function getUserByEmail(db: Db, email: string): Promise<UserPublic | undefined> {
  const [user] = await db
    .select(userColumns)
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
  return user
}

/**
 * Signs a provider identity in: the user already linked to it, else the user with the
 * same verified email (so one person can use both Google and GitHub, and accounts from
 * the email/password days carry over), else a new user.
 */
export async function signInWithOAuth(db: Db, profile: OAuthProfile): Promise<UserPublic> {
  return db.transaction(async (tx) => {
    const [linked] = await tx
      .select(userColumns)
      .from(accounts)
      .innerJoin(users, eq(users.id, accounts.user_id))
      .where(
        and(eq(accounts.provider, profile.provider), eq(accounts.provider_account_id, profile.providerAccountId)),
      )
    if (linked) return refreshProfile(tx, linked, profile)

    if (!profile.email) {
      throw new ServiceError(
        400,
        `Your ${profile.provider === 'github' ? 'GitHub' : 'Google'} account has no verified email address.`,
      )
    }
    const email = profile.email.trim().toLowerCase()

    let user = await getUserByEmail(tx, email)
    if (user) {
      user = await refreshProfile(tx, user, profile)
    } else {
      const [created] = await tx
        .insert(users)
        .values({ email, name: profile.name, avatar_url: profile.avatarUrl })
        .returning(userColumns)
      user = created!
    }

    await tx.insert(accounts).values({
      user_id: user.id,
      provider: profile.provider,
      provider_account_id: profile.providerAccountId,
    })
    return user
  })
}

/** Keeps the display name and avatar in sync with the provider the user last signed in with. */
async function refreshProfile(db: Db, user: UserPublic, profile: OAuthProfile): Promise<UserPublic> {
  const name = profile.name ?? user.name
  const avatar_url = profile.avatarUrl ?? user.avatar_url
  if (name === user.name && avatar_url === user.avatar_url) return user

  const [updated] = await db.update(users).set({ name, avatar_url }).where(eq(users.id, user.id)).returning(userColumns)
  return updated!
}
