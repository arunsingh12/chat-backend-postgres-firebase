import type { Request } from 'express';
import { AppError } from '../errors/app-error.js';

/** The authenticated caller's id (only valid behind the `authenticate` middleware). */
export const currentUserId = (req: Request): string => {
  if (!req.auth) throw AppError.unauthorized();
  return req.auth.userId;
};

/**
 * The task's endpoints carry the acting user in the payload (`senderId`,
 * `userId`, …). Keep that contract, but never trust it: it must be the
 * authenticated caller, otherwise anyone could act on someone else's behalf.
 */
export const assertActingUser = (req: Request, claimedUserId: string, field: string): string => {
  const userId = currentUserId(req);
  if (claimedUserId !== userId) {
    throw AppError.forbidden(`${field} must match the logged-in user`);
  }
  return userId;
};
