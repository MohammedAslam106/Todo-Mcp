import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  serial,
  text,
  unique,
  varchar,
} from 'drizzle-orm/pg-core'

import { projectColors } from '../schemas/projects'
import { priorities } from '../schemas/todos'

// A TIMESTAMPTZ read back as an ISO 8601 string, so rows match the `z.iso.datetime()`
// response schemas as-is (drizzle's node-postgres driver hands us Postgres' text format).
const timestamptz = customType<{ data: string; driverData: string }>({
  dataType: () => 'timestamp with time zone',
  fromDriver: (value) => new Date(value).toISOString(),
})

const createdAt = () => timestamptz('created_at').notNull().default(sql`now()`)
const updatedAt = () => timestamptz('updated_at').notNull().default(sql`now()`)

// Constraint and index names match what the original hand-written SQL migrations
// created, so databases from before the move to drizzle line up with the snapshots.

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    avatar_url: text('avatar_url'),
    created_at: createdAt(),
  },
  (t) => [unique('users_email_key').on(t.email)],
)

/** A Google/GitHub identity that can sign in as a user. One user can have several. */
export const accounts = pgTable(
  'accounts',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull(),
    provider: varchar('provider', { length: 20, enum: ['google', 'github'] }).notNull(),
    provider_account_id: varchar('provider_account_id', { length: 255 }).notNull(),
    created_at: createdAt(),
  },
  (t) => [
    foreignKey({ name: 'accounts_user_id_fkey', columns: [t.user_id], foreignColumns: [users.id] }).onDelete('cascade'),
    unique('accounts_provider_account_key').on(t.provider, t.provider_account_id),
    index('idx_accounts_user_id').on(t.user_id),
  ],
)

export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 20, enum: projectColors }).notNull().default('chart-1'),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    foreignKey({ name: 'projects_user_id_fkey', columns: [t.user_id], foreignColumns: [users.id] }).onDelete('cascade'),
    index('idx_projects_user_id').on(t.user_id),
  ],
)

export const todos = pgTable(
  'todos',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull(),
    // Todos without a project live in the Inbox.
    project_id: integer('project_id'),
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    is_completed: boolean('is_completed').notNull().default(false),
    priority: varchar('priority', { length: 10, enum: priorities }).notNull().default('none'),
    due_date: date('due_date', { mode: 'string' }),
    completed_at: timestamptz('completed_at'),
    created_at: createdAt(),
    updated_at: updatedAt(),
  },
  (t) => [
    foreignKey({ name: 'todos_user_id_fkey', columns: [t.user_id], foreignColumns: [users.id] }).onDelete('cascade'),
    foreignKey({ name: 'todos_project_id_fkey', columns: [t.project_id], foreignColumns: [projects.id] }).onDelete(
      'cascade',
    ),
    check('todos_priority_check', sql`${t.priority} IN ('none', 'low', 'medium', 'high')`),
    index('idx_todos_user_id').on(t.user_id),
    index('idx_todos_project_id').on(t.project_id),
  ],
)

/** Personal access tokens for MCP clients. Only a SHA-256 hash of each token is stored. */
export const apiTokens = pgTable(
  'api_tokens',
  {
    id: serial('id').primaryKey(),
    user_id: integer('user_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    token_hash: char('token_hash', { length: 64 }).notNull(),
    created_at: createdAt(),
    last_used_at: timestamptz('last_used_at'),
  },
  (t) => [
    foreignKey({ name: 'api_tokens_user_id_fkey', columns: [t.user_id], foreignColumns: [users.id] }).onDelete(
      'cascade',
    ),
    unique('api_tokens_token_hash_key').on(t.token_hash),
    index('idx_api_tokens_user_id').on(t.user_id),
  ],
)
