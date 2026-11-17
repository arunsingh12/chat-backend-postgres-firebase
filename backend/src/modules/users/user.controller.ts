import { handler, send } from '../../common/http/handler.js';
import { assertActingUser } from '../../common/http/identity.js';
import type { ChatService } from '../chats/chat.service.js';
import { userParams } from './user.schemas.js';
import type { UserService } from './user.service.js';

export const createUserController = (users: UserService, chats: ChatService) => ({
  /** GET /user: registered people you can start a chat with. */
  list: handler({}, async (_input, res) => {
    send(res, await users.list());
  }),

  getById: handler({ params: userParams }, async ({ params }, res) => {
    send(res, await users.getById(params.userId));
  }),

  /** GET /user/:userId/chats: a user can only list their own chats. */
  listChats: handler({ params: userParams }, async ({ params }, res, req) => {
    assertActingUser(req, params.userId, 'userId');
    send(res, await chats.listUserChats(params.userId));
  }),
});
