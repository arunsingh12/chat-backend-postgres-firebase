import { z } from 'zod';
import { chatParams, uuid } from '../../common/http/schemas.js';

const groupName = z.string().trim().min(1, 'name is required').max(80);

export const createDirectChatBody = z.object({
  userAId: uuid('userAId'),
  userBId: uuid('userBId'),
});

export const createGroupChatBody = z.object({
  creatorId: uuid('creatorId'),
  name: groupName,
  memberIds: z.array(uuid('memberIds[]')).min(1, 'Add at least one member').max(256),
});

export const getChatQuery = z.object({ userId: uuid('userId').optional() });

export const renameGroupBody = z.object({ requesterId: uuid('requesterId'), name: groupName });

export const addMembersBody = z.object({
  requesterId: uuid('requesterId'),
  userIds: z.array(uuid('userIds[]')).min(1).max(256),
});

export const memberParams = chatParams.extend({ userId: uuid('userId') });

export const removeMemberBody = z.object({ requesterId: uuid('requesterId') });
