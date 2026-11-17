import { Router, type RequestHandler } from 'express';
import type { createAuthController } from './auth.controller.js';

export const createAuthRouter = (
  controller: ReturnType<typeof createAuthController>,
  middleware: { authenticate: RequestHandler; credentialsLimiter: RequestHandler },
) => {
  const router = Router();

  router.post('/register', middleware.credentialsLimiter, controller.register);
  router.post('/login', middleware.credentialsLimiter, controller.login);
  router.get('/me', middleware.authenticate, controller.me);

  return router;
};
