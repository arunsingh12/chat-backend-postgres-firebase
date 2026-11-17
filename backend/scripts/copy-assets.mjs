import { cpSync } from 'node:fs';

// tsc only emits .ts output; ship the SQL migrations alongside the compiled runner.
cpSync('src/db/migrations', 'dist/db/migrations', { recursive: true });
