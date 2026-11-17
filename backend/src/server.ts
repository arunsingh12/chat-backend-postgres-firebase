import { createApp } from './app.js';
import { env } from './config/env.js';
import { createContainer } from './container.js';
import { checkFirestore, getFirestoreDb } from './lib/firestore.js';
import { logger } from './lib/logger.js';
import { checkPostgres, pool } from './lib/postgres.js';
import { PostgresChatRepository } from './modules/chats/chat.repository.js';
import { FirestoreMessageRepository } from './modules/messages/message.repository.js';
import { PostgresUserRepository } from './modules/users/user.repository.js';

const container = createContainer(
  {
    users: new PostgresUserRepository(pool),
    chats: new PostgresChatRepository(pool),
    messages: new FirestoreMessageRepository(getFirestoreDb()),
  },
  logger,
  [
    { name: 'postgres', check: checkPostgres },
    { name: 'firestore', check: checkFirestore },
  ],
);

const server = createApp(container).listen(env.PORT, (error?: Error) => {
  // Express 5 reports bind failures (e.g. port already in use) to this callback.
  if (error) {
    logger.fatal({ err: error }, `Could not start on port ${env.PORT}`);
    process.exit(1);
  }
  logger.info(`Chat API listening on http://localhost:${env.PORT}`);
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(async () => {
    await pool.end().catch(() => undefined);
    process.exit(0);
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});
