import { AppError } from '../../common/errors/app-error.js';
import type { UserService } from '../users/user.service.js';
import type { Chat, ChatRepository, LastMessageSummary, Membership } from './chat.types.js';

/** Order-independent key so (A, B) and (B, A) resolve to the same chat. */
export const buildDirectKey = (userAId: string, userBId: string): string =>
  [userAId, userBId].sort().join(':');

const MANAGER_ROLES = new Set(['owner', 'admin']);

export class ChatService {
  constructor(
    private readonly chats: ChatRepository,
    private readonly users: UserService,
  ) {}

  async getOrCreateDirectChat(
    userAId: string,
    userBId: string,
  ): Promise<{ chat: Chat; created: boolean }> {
    if (userAId === userBId) throw AppError.badRequest('A chat needs two different users');
    await this.users.assertAllExist([userAId, userBId]);

    const { chatId, created } = await this.chats.createDirect({
      directKey: buildDirectKey(userAId, userBId),
      createdBy: userAId,
      memberIds: [userAId, userBId],
    });

    return { chat: await this.getChat(chatId), created };
  }

  async createGroupChat(creatorId: string, name: string, memberIds: string[]): Promise<Chat> {
    const allMembers = [...new Set([creatorId, ...memberIds])];
    if (allMembers.length < 2) throw AppError.badRequest('A group needs at least one other member');
    await this.users.assertAllExist(allMembers);

    const chatId = await this.chats.createGroup({
      name,
      createdBy: creatorId,
      memberIds: allMembers,
    });
    return this.getChat(chatId);
  }

  async getChat(chatId: string): Promise<Chat> {
    const chat = await this.chats.findById(chatId);
    if (!chat) throw AppError.notFound('Chat');
    return chat;
  }

  async listUserChats(userId: string): Promise<Chat[]> {
    await this.users.getById(userId);
    return this.chats.listForUser(userId);
  }

  /** Throws 404 for an unknown chat and 403 for a non-member. */
  async assertMember(chatId: string, userId: string): Promise<Membership> {
    const membership = await this.chats.findMembership(chatId, userId);
    if (membership) return membership;

    const chat = await this.chats.findById(chatId);
    if (!chat) throw AppError.notFound('Chat');
    throw AppError.forbidden('User is not a member of this chat');
  }

  async assertChatExists(chatId: string): Promise<void> {
    await this.getChat(chatId);
  }

  // ── Group management ──────────────────────────────────────────────────────

  async renameGroup(chatId: string, requesterId: string, name: string): Promise<Chat> {
    await this.assertGroupManager(chatId, requesterId);
    await this.chats.rename(chatId, name);
    return this.getChat(chatId);
  }

  async addGroupMembers(chatId: string, requesterId: string, userIds: string[]): Promise<Chat> {
    await this.assertGroupManager(chatId, requesterId);
    await this.users.assertAllExist(userIds);
    await this.chats.addMembers(chatId, userIds);
    return this.getChat(chatId);
  }

  /** Managers can remove others; anyone can remove themselves (leave). */
  async removeGroupMember(chatId: string, requesterId: string, userId: string): Promise<Chat> {
    const chat = await this.getGroup(chatId);
    const requester = await this.assertMember(chatId, requesterId);
    const target = chat.members.find((member) => member.userId === userId);

    if (!target) throw AppError.notFound('Member');
    if (target.role === 'owner') throw AppError.badRequest('The group owner cannot be removed');
    if (requesterId !== userId && !MANAGER_ROLES.has(requester.role)) {
      throw AppError.forbidden('Only group admins can remove members');
    }

    await this.chats.removeMember(chatId, userId);
    return this.getChat(chatId);
  }

  // ── Denormalised "last message" used by the chat list ─────────────────────

  recordLastMessage(chatId: string, summary: LastMessageSummary): Promise<void> {
    return this.chats.recordLastMessage(chatId, summary);
  }

  refreshLastMessagePreview(chatId: string, messageId: string, preview: string): Promise<void> {
    return this.chats.refreshLastMessagePreview(chatId, messageId, preview);
  }

  private async getGroup(chatId: string): Promise<Chat> {
    const chat = await this.getChat(chatId);
    if (chat.type !== 'group')
      throw AppError.badRequest('This action is only available for groups');
    return chat;
  }

  private async assertGroupManager(chatId: string, requesterId: string): Promise<void> {
    await this.getGroup(chatId);
    const membership = await this.assertMember(chatId, requesterId);
    if (!MANAGER_ROLES.has(membership.role)) {
      throw AppError.forbidden('Only group admins can manage this group');
    }
  }
}
