import { env } from './config/env.js';
import type { Logger } from './lib/logger.js';
import { AuthService } from './modules/auth/auth.service.js';
import { TokenService } from './modules/auth/token.service.js';
import { ChatService } from './modules/chats/chat.service.js';
import type { ChatRepository } from './modules/chats/chat.types.js';
import { MessageService } from './modules/messages/message.service.js';
import type { MessageRepository } from './modules/messages/message.types.js';
import { UserService } from './modules/users/user.service.js';
import type { UserRepository } from './modules/users/user.types.js';

export interface Repositories {
  users: UserRepository;
  chats: ChatRepository;
  messages: MessageRepository;
}

export interface HealthCheck {
  name: string;
  check: () => Promise<void>;
}

export interface Container {
  services: {
    auth: AuthService;
    tokens: TokenService;
    users: UserService;
    chats: ChatService;
    messages: MessageService;
  };
  healthChecks: HealthCheck[];
}

/**
 * Composition root. Services only depend on repository interfaces, so the
 * same wiring runs against Postgres/Firestore in production and in-memory
 * fakes in tests.
 */
export const createContainer = (
  repositories: Repositories,
  logger: Logger,
  healthChecks: HealthCheck[] = [],
): Container => {
  const tokens = new TokenService(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const auth = new AuthService(repositories.users, tokens);
  const users = new UserService(repositories.users);
  const chats = new ChatService(repositories.chats, users);
  const messages = new MessageService(repositories.messages, chats, logger);

  return { services: { auth, tokens, users, chats, messages }, healthChecks };
};
