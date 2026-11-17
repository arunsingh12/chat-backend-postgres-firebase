import { logger } from '../lib/logger.js';
import { hashPassword } from '../lib/password.js';
import { pool } from '../lib/postgres.js';

/** Local demo accounts. Every one signs in with DEMO_PASSWORD. */
const DEMO_PASSWORD = 'Password123';

const DEMO_USERS = [
  { displayName: 'Aarav Sharma', email: 'aarav@example.com' },
  { displayName: 'Priya Patel', email: 'priya@example.com' },
  { displayName: 'Rohan Mehta', email: 'rohan@example.com' },
  { displayName: 'Sara Khan', email: 'sara@example.com' },
  { displayName: 'Vikram Singh', email: 'vikram@example.com' },
];

const seed = async (): Promise<void> => {
  for (const user of DEMO_USERS) {
    // Idempotent; also backfills a password for demo users created before auth existed.
    await pool.query(
      `INSERT INTO users (display_name, email, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = COALESCE(users.password_hash, EXCLUDED.password_hash)`,
      [user.displayName, user.email, await hashPassword(DEMO_PASSWORD)],
    );
  }
  logger.info(
    { count: DEMO_USERS.length, password: DEMO_PASSWORD },
    'Seeded demo users (log in with any of their emails)',
  );
};

seed()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seeding failed');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
