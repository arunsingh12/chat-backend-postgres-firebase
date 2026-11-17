import { AppError } from '../../common/errors/app-error.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import type { User, UserRepository } from '../users/user.types.js';
import type { TokenService } from './token.service.js';

export interface AuthResult {
  user: User;
  token: string;
}

const INVALID_CREDENTIALS = 'Invalid email or password';

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenService,
  ) {}

  async register(input: { name: string; email: string; password: string }): Promise<AuthResult> {
    const existing = await this.users.findByEmailWithCredentials(input.email);
    if (existing) throw AppError.conflict('An account with this email already exists');

    const user = await this.users.create({
      displayName: input.name,
      email: input.email,
      passwordHash: await hashPassword(input.password),
    });
    return { user, token: this.tokens.sign(user.id) };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const account = await this.users.findByEmailWithCredentials(email);

    // Same error for "no such email" and "wrong password" so accounts can't be enumerated.
    if (!account?.passwordHash || !(await verifyPassword(password, account.passwordHash))) {
      throw AppError.unauthorized(INVALID_CREDENTIALS);
    }

    const { passwordHash: _passwordHash, ...user } = account;
    return { user, token: this.tokens.sign(user.id) };
  }

  async me(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    // A valid token for a deleted account is no longer a valid session.
    if (!user) throw AppError.unauthorized('Account no longer exists');
    return user;
  }
}
