import type { PgDatabase } from 'drizzle-orm/pg-core'
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres'

import type * as schema from '../db/schema'

/** Anything that can run a query: the drizzle database, or a transaction. */
export type Db = PgDatabase<NodePgQueryResultHKT, typeof schema>

/**
 * A domain error with an HTTP status. Fastify's error handler replies with
 * `{ error: message }` and this status; MCP tools surface the message to the model.
 */
export class ServiceError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.statusCode = statusCode
  }
}
