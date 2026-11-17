import { AppError } from '../../common/errors/app-error.js';
import { handler, send } from '../../common/http/handler.js';
import { assertActingUser, currentUserId } from '../../common/http/identity.js';
import { chatParams } from '../../common/http/schemas.js';
import {
  addMembersBody,
  createDirectChatBody,
  createGroupChatBody,
  getChatQuery,
  memberParams,
  removeMemberBody,
  renameGroupBody,
} from './chat.schemas.js';
import type { ChatService } from './chat.service.js';

export const createChatController = (chats: ChatService) => ({
  /** POST /chat/create: idempotent, 201 when created and 200 when it already existed. */
  createDirect: handler({ body: createDirectChatBody }, async ({ body }, res, req) => {
    const me = currentUserId(req);
    if (body.userAId !== me && body.userBId !== me) {
      throw AppError.forbidden('You can only create chats that include yourself');
    }
    const { chat, created } = await chats.getOrCreateDirectChat(body.userAId, body.userBId);
    send(res, { chatId: chat.id, created, chat }, created ? 201 : 200);
  }),

  createGroup: handler({ body: createGroupChatBody }, async ({ body }, res, req) => {
    assertActingUser(req, body.creatorId, 'creatorId');
    const chat = await chats.createGroupChat(body.creatorId, body.name, body.memberIds);
    send(res, { chatId: chat.id, created: true, chat }, 201);
  }),

  getById: handler(
    { params: chatParams, query: getChatQuery },
    async ({ params, query }, res, req) => {
      if (query.userId) assertActingUser(req, query.userId, 'userId');
      await chats.assertMember(params.chatId, currentUserId(req));
      send(res, await chats.getChat(params.chatId));
    },
  ),

  rename: handler(
    { params: chatParams, body: renameGroupBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.requesterId, 'requesterId');
      send(res, await chats.renameGroup(params.chatId, body.requesterId, body.name));
    },
  ),

  addMembers: handler(
    { params: chatParams, body: addMembersBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.requesterId, 'requesterId');
      send(res, await chats.addGroupMembers(params.chatId, body.requesterId, body.userIds));
    },
  ),

  removeMember: handler(
    { params: memberParams, body: removeMemberBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.requesterId, 'requesterId');
      send(res, await chats.removeGroupMember(params.chatId, body.requesterId, params.userId));
    },
  ),
});
