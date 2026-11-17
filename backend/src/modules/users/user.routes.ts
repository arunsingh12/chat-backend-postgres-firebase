import { Router } from 'express';
import type { createUserController } from './user.controller.js';

export const createUserRouter = (controller: ReturnType<typeof createUserController>) => {
  const router = Router();

  router.get('/', controller.list);
  router.get('/:userId', controller.getById);
  router.get('/:userId/chats', controller.listChats);

  return router;
};
