import { z } from 'zod';
import { messageId, messageText, uuid } from '../../common/http/schemas.js';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export const listMessagesQuery = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
  before: messageId.optional(),
  /** Optional: when supplied, the caller must be a member of the chat. */
  userId: uuid('userId').optional(),
});

export const sendMessageBody = z.object({
  senderId: uuid('senderId'),
  text: messageText,
});

export const markReadBody = z.object({ userId: uuid('userId') });

export const lastSeenBody = z.object({
  userId: uuid('userId'),
  messageId,
});

export const editMessageBody = sendMessageBody;

export const deleteMessageBody = z.object({ senderId: uuid('senderId') });
