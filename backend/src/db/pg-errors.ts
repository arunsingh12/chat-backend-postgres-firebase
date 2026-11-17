/** https://www.postgresql.org/docs/current/errcodes-appendix.html */
const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

const hasCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === code;

export const isUniqueViolation = (error: unknown) => hasCode(error, PG_UNIQUE_VIOLATION);
export const isForeignKeyViolation = (error: unknown) => hasCode(error, PG_FOREIGN_KEY_VIOLATION);
