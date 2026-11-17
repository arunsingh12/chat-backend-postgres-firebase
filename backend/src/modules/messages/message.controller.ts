import { handler, send } from '../../common/http/handler.js';
import { assertActingUser, currentUserId } from '../../common/http/identity.js';
import { chatParams, messageParams } from '../../common/http/schemas.js';
import {
  deleteMessageBody,
  editMessageBody,
  lastSeenBody,
  listMessagesQuery,
  markReadBody,
  sendMessageBody,
} from './message.schemas.js';
import type { MessageService } from './message.service.js';

export const createMessageController = (messages: MessageService) => ({
  /** POST /chat/:chatId/message/send */
  send: handler(
    { params: chatParams, body: sendMessageBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.senderId, 'senderId');
      send(res, await messages.send(params.chatId, body.senderId, body.text), 201);
    },
  ),

  /** GET /chat/:chatId/messages?limit=50&before=<messageId> */
  list: handler(
    { params: chatParams, query: listMessagesQuery },
    async ({ params, query }, res, req) => {
      if (query.userId) assertActingUser(req, query.userId, 'userId');
      send(res, await messages.list(params.chatId, { ...query, userId: currentUserId(req) }));
    },
  ),

  /** POST /chat/:chatId/message/:messageId/read */
  markRead: handler(
    { params: messageParams, body: markReadBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.userId, 'userId');
      send(res, await messages.markRead(params.chatId, params.messageId, body.userId));
    },
  ),

  /** POST /chat/:chatId/lastseen */
  updateLastSeen: handler(
    { params: chatParams, body: lastSeenBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.userId, 'userId');
      send(res, await messages.updateLastSeen(params.chatId, body.userId, body.messageId));
    },
  ),

  /** GET /chat/:chatId/lastseen */
  listLastSeen: handler({ params: chatParams }, async ({ params }, res, req) => {
    send(res, await messages.listLastSeen(params.chatId, currentUserId(req)));
  }),

  /** PATCH /chat/:chatId/message/:messageId */
  edit: handler(
    { params: messageParams, body: editMessageBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.senderId, 'senderId');
      send(res, await messages.edit(params.chatId, params.messageId, body.senderId, body.text));
    },
  ),

  /** DELETE /chat/:chatId/message/:messageId (soft delete) */
  remove: handler(
    { params: messageParams, body: deleteMessageBody },
    async ({ params, body }, res, req) => {
      assertActingUser(req, body.senderId, 'senderId');
      send(res, await messages.remove(params.chatId, params.messageId, body.senderId));
    },
  ),
});
