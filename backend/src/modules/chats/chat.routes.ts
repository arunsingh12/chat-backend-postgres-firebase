import { Router } from 'express';
import type { createMessageController } from '../messages/message.controller.js';
import type { createChatController } from './chat.controller.js';

type ChatController = ReturnType<typeof createChatController>;
type MessageController = ReturnType<typeof createMessageController>;

export const createChatRouter = (chat: ChatController, message: MessageController) => {
  const router = Router();

  // Chats
  router.post('/create', chat.createDirect);
  router.post('/group', chat.createGroup);
  router.get('/:chatId', chat.getById);
  router.patch('/:chatId', chat.rename);
  router.post('/:chatId/members', chat.addMembers);
  router.delete('/:chatId/members/:userId', chat.removeMember);

  // Messages (Firestore)
  router.get('/:chatId/messages', message.list);
  router.post('/:chatId/message/send', message.send);
  router.patch('/:chatId/message/:messageId', message.edit);
  router.delete('/:chatId/message/:messageId', message.remove);
  router.post('/:chatId/message/:messageId/read', message.markRead);

  // Last seen (Firestore)
  router.get('/:chatId/lastseen', message.listLastSeen);
  router.post('/:chatId/lastseen', message.updateLastSeen);

  return router;
};
