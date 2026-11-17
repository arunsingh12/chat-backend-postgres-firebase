import type { AuthContext } from '../modules/auth/token.service.js';

declare global {
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware on protected routes. */
      auth?: AuthContext;
    }
  }
}

export {};
