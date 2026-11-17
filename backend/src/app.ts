import cors from 'cors';
import express, { type Express, type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { authenticate } from './common/middleware/authenticate.js';
import { errorHandler, notFoundHandler } from './common/middleware/error-handler.js';
import { env } from './config/env.js';
import type { Container } from './container.js';
import { logger } from './lib/logger.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createChatController } from './modules/chats/chat.controller.js';
import { createChatRouter } from './modules/chats/chat.routes.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createMessageController } from './modules/messages/message.controller.js';
import { createUserController } from './modules/users/user.controller.js';
import { createUserRouter } from './modules/users/user.routes.js';

const isTest = env.NODE_ENV === 'test';
const passThrough: RequestHandler = (_req, _res, next) => next();

const limiter = (windowMs: number, limit: number, message: string): RequestHandler =>
  isTest
    ? passThrough
    : rateLimit({
        windowMs,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { error: { code: 'TOO_MANY_REQUESTS', message } },
      });

export const createApp = ({ services, healthChecks }: Container): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json({ limit: '100kb' }));
  if (!isTest) {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));
  }
  app.use(limiter(60_000, 600, 'Too many requests, slow down'));

  const requireAuth = authenticate(services.tokens);
  // Brute-force protection for password endpoints.
  const credentialsLimiter = limiter(15 * 60_000, 20, 'Too many attempts, try again later');

  app.use('/health', createHealthRouter(healthChecks));
  app.use(
    '/auth',
    createAuthRouter(createAuthController(services.auth), {
      authenticate: requireAuth,
      credentialsLimiter,
    }),
  );

  // Everything below requires a logged-in user.
  app.use(
    '/user',
    requireAuth,
    createUserRouter(createUserController(services.users, services.chats)),
  );
  app.use(
    '/chat',
    requireAuth,
    createChatRouter(
      createChatController(services.chats),
      createMessageController(services.messages),
    ),
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
