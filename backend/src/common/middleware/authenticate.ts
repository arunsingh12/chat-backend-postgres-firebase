import type { RequestHandler } from 'express';
import type { TokenService } from '../../modules/auth/token.service.js';
import { AppError } from '../errors/app-error.js';

/** Requires `Authorization: Bearer <token>` and exposes the caller as `req.auth`. */
export const authenticate =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw AppError.unauthorized();

    req.auth = tokens.verify(token);
    next();
  };
