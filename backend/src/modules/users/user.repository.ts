import { AppError } from '../../common/errors/app-error.js';
import { isUniqueViolation } from '../../db/pg-errors.js';
import type { Queryable } from '../../lib/postgres.js';
import type { CreateUserInput, User, UserRepository, UserWithCredentials } from './user.types.js';

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  created_at: Date;
}

interface UserCredentialsRow extends UserRow {
  password_hash: string | null;
}

/** password_hash is deliberately absent so it can never leak through a profile query. */
const USER_COLUMNS = 'id, display_name, email, created_at';

const toUser = (row: UserRow): User => ({
  id: row.id,
  displayName: row.display_name,
  email: row.email,
  createdAt: row.created_at.toISOString(),
});

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: Queryable) {}

  async create({ displayName, email, passwordHash }: CreateUserInput): Promise<User> {
    try {
      const { rows } = await this.db.query<UserRow>(
        `INSERT INTO users (display_name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING ${USER_COLUMNS}`,
        [displayName, email, passwordHash],
      );
      return toUser(rows[0]!);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw AppError.conflict('An account with this email already exists');
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = $1`,
      [id],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findByEmailWithCredentials(email: string): Promise<UserWithCredentials | null> {
    const { rows } = await this.db.query<UserCredentialsRow>(
      `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE lower(email) = lower($1)`,
      [email],
    );
    const row = rows[0];
    return row ? { ...toUser(row), passwordHash: row.password_hash } : null;
  }

  async findManyByIds(ids: readonly string[]): Promise<User[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users WHERE id = ANY($1::uuid[])`,
      [ids],
    );
    return rows.map(toUser);
  }

  async list(): Promise<User[]> {
    const { rows } = await this.db.query<UserRow>(
      `SELECT ${USER_COLUMNS} FROM users ORDER BY display_name ASC`,
    );
    return rows.map(toUser);
  }
}
