import { pino } from 'pino';
import { env, isProduction } from '../config/env.js';

const usePrettyLogs = !isProduction && env.NODE_ENV !== 'test';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  ...(usePrettyLogs && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  }),
});

export type Logger = typeof logger;
