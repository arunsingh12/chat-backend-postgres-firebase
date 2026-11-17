import jwt from 'jsonwebtoken';
import { AppError } from '../../common/errors/app-error.js';

export interface AuthContext {
  userId: string;
}

interface TokenPayload {
  sub: string;
}

/** Stateless JWT access tokens (HS256). */
export class TokenService {
  constructor(
    private readonly secret: string,
    private readonly expiresIn: string,
  ) {}

  sign(userId: string): string {
    return jwt.sign({}, this.secret, {
      subject: userId,
      expiresIn: this.expiresIn as jwt.SignOptions['expiresIn'],
      algorithm: 'HS256',
    });
  }

  verify(token: string): AuthContext {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] }) as TokenPayload;
      if (!payload.sub) throw new Error('Token has no subject');
      return { userId: payload.sub };
    } catch (error) {
      const expired = error instanceof jwt.TokenExpiredError;
      throw AppError.unauthorized(
        expired ? 'Session expired, please log in again' : 'Invalid token',
      );
    }
  }
}
