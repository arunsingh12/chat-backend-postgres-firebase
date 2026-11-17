import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        // Browsers send origins without a trailing slash; tolerate one in config.
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean),
    ),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z
    .string()
    .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN must look like 15m, 12h or 7d')
    .default('7d'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  /** Set to "true" when connecting to a hosted database over its external URL. */
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((key) => key?.replace(/\\n/g, '\n')),
  FIRESTORE_EMULATOR_HOST: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const loadEnv = (): Env => {
  const parsed = envSchema.safeParse({
    // Tests never touch real infrastructure, so give them harmless defaults.
    ...(process.env.NODE_ENV === 'test'
      ? {
          DATABASE_URL: 'postgres://test',
          FIREBASE_PROJECT_ID: 'test',
          JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
        }
      : {}),
    ...process.env,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
};

export const env = loadEnv();
export const isProduction = env.NODE_ENV === 'production';
