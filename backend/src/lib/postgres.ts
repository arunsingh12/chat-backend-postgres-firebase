import pg from 'pg';
import { env } from '../config/env.js';
import { logger } from './logger.js';

/**
 * Anything that can run a query: the pool itself or a checked-out client
 * inside a transaction. Repositories accept this so they compose with
 * `withTransaction` without knowing about it.
 */
export type Queryable = Pick<pg.Pool | pg.PoolClient, 'query'>;

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Managed databases reached over the public internet require TLS. Their
  // certificates are often not in Node's CA bundle, so encryption is enforced
  // without CA pinning.
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
});

pool.on('error', (error) => {
  logger.error({ err: error }, 'Unexpected PostgreSQL idle client error');
});

export const withTransaction = async <T>(
  db: pg.Pool,
  work: (client: pg.PoolClient) => Promise<T>,
): Promise<T> => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const checkPostgres = async (): Promise<void> => {
  await pool.query('SELECT 1');
};
