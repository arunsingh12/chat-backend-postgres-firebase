import { AppError } from '../../common/errors/app-error.js';
import type { User, UserRepository } from './user.types.js';

/** Read-side user directory. Account creation lives in the auth module. */
export class UserService {
  constructor(private readonly users: UserRepository) {}

  list(): Promise<User[]> {
    return this.users.list();
  }

  async getById(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  /** Throws 404 naming the first id that does not exist. */
  async assertAllExist(userIds: readonly string[]): Promise<void> {
    const unique = [...new Set(userIds)];
    const found = await this.users.findManyByIds(unique);
    if (found.length === unique.length) return;

    const foundIds = new Set(found.map((user) => user.id));
    const missing = unique.filter((id) => !foundIds.has(id));
    throw new AppError(404, 'NOT_FOUND', 'One or more users were not found', { missing });
  }
}
