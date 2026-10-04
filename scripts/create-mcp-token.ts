/**
 * Mints an API token for an existing user, for use by MCP clients.
 *
 *   pnpm run mcp:token <email> [token name]
 */
import 'dotenv/config'

import { db, pool } from '../db/client'
import { createApiToken } from '../services/tokens'
import { getUserByEmail } from '../services/users'

const [email, name = 'MCP client'] = process.argv.slice(2)
if (!email) {
  console.error('Usage: pnpm run mcp:token <email> [token name]')
  process.exit(1)
}

try {
  const user = await getUserByEmail(db, email)
  if (!user) {
    console.error(`No user with email ${email}. Sign in to the app with Google or GitHub first.`)
    process.exitCode = 1
  } else {
    const created = await createApiToken(db, user.id, name)
    console.log(`Created token "${created.name}" (id ${created.id}) for ${email}.`)
    console.log('Copy it now — it will not be shown again:\n')
    console.log(`  ${created.token}\n`)
  }
} finally {
  await pool.end()
}
