import 'dotenv/config'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { db, pool } from './client'

const migrationsFolder = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

// Before drizzle, migrations were plain SQL files tracked in `schema_migrations`.
// 0000_baseline reproduces exactly what those files built, so a database that ran all
// of them is marked as already having the baseline instead of re-creating its tables.
const LEGACY_MIGRATIONS = ['001_init.sql', '002_projects.sql', '003_api_tokens.sql']

async function adoptLegacyDatabase() {
  const legacy = await db.execute<{ exists: boolean }>(
    sql`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists`,
  )
  if (!legacy.rows[0]?.exists) return

  const { rows } = await db.execute<{ name: string }>(sql`SELECT name FROM schema_migrations`)
  const applied = new Set(rows.map((row) => row.name))
  const missing = LEGACY_MIGRATIONS.filter((name) => !applied.has(name))
  if (missing.length > 0) {
    throw new Error(
      `This database is on the old migration system but is missing ${missing.join(', ')}. ` +
        'Apply them with the previous version of the app first.',
    )
  }

  const baseline = readMigrationFiles({ migrationsFolder })[0]!
  console.log('adopt existing database at 0000_baseline')
  await db.transaction(async (tx) => {
    await tx.execute(sql`CREATE SCHEMA IF NOT EXISTS drizzle`)
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)
    `)
    await tx.execute(
      sql`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${baseline.hash}, ${baseline.folderMillis})`,
    )
    await tx.execute(sql`DROP TABLE schema_migrations`)
  })
}

async function run() {
  try {
    await adoptLegacyDatabase()
    await migrate(db, { migrationsFolder })
    console.log('Migrations up to date.')
  } finally {
    await pool.end()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
