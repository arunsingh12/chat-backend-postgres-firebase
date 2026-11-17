import { randomUUID } from 'node:crypto';
import type { Repositories } from '../../src/container.js';
import type {
  Chat,
  ChatRepository,
  CreateDirectChatInput,
  CreateGroupChatInput,
  LastMessageSummary,
  MemberRole,
  Membership,
} from '../../src/modules/chats/chat.types.js';
import type {
  ListMessagesOptions,
  Message,
  MessagePage,
  MessageRepository,
  ReadState,
} from '../../src/modules/messages/message.types.js';
import type {
  CreateUserInput,
  User,
  UserRepository,
  UserWithCredentials,
} from '../../src/modules/users/user.types.js';

/** Monotonic clock so ordering assertions are deterministic. */
let tick = Date.parse('2026-01-01T00:00:00.000Z');
const now = () => new Date((tick += 1000)).toISOString();

class InMemoryUserRepository implements UserRepository {
  private readonly accounts = new Map<string, UserWithCredentials>();

  async create({ displayName, email, passwordHash }: CreateUserInput) {
    const account: UserWithCredentials = {
      id: randomUUID(),
      displayName,
      email,
      passwordHash,
      createdAt: now(),
    };
    this.accounts.set(account.id, account);
    return this.toUser(account);
  }
  async findById(id: string) {
    const account = this.accounts.get(id);
    return account ? this.toUser(account) : null;
  }
  async findByEmailWithCredentials(email: string) {
    const needle = email.toLowerCase();
    return [...this.accounts.values()].find((a) => a.email.toLowerCase() === needle) ?? null;
  }
  async findManyByIds(ids: readonly string[]) {
    return ids.flatMap((id) => {
      const account = this.accounts.get(id);
      return account ? [this.toUser(account)] : [];
    });
  }
  async list() {
    return [...this.accounts.values()].map((account) => this.toUser(account));
  }
  displayNameOf(id: string) {
    return this.accounts.get(id)?.displayName;
  }
  private toUser({ passwordHash: _passwordHash, ...user }: UserWithCredentials): User {
    return user;
  }
}

interface ChatRecord extends Omit<Chat, 'members' | 'memberIds'> {
  directKey: string | null;
  members: Map<string, { role: MemberRole; joinedAt: string }>;
}

class InMemoryChatRepository implements ChatRepository {
  private readonly rows = new Map<string, ChatRecord>();

  constructor(private readonly users: InMemoryUserRepository) {}

  async createDirect({ directKey, createdBy, memberIds }: CreateDirectChatInput) {
    const existing = [...this.rows.values()].find((chat) => chat.directKey === directKey);
    if (existing) return { chatId: existing.id, created: false };

    const chat = this.insert('direct', null, createdBy, directKey);
    memberIds.forEach((id) => chat.members.set(id, { role: 'member', joinedAt: now() }));
    return { chatId: chat.id, created: true };
  }

  async createGroup({ name, createdBy, memberIds }: CreateGroupChatInput) {
    const chat = this.insert('group', name, createdBy, null);
    memberIds.forEach((id) =>
      chat.members.set(id, { role: id === createdBy ? 'owner' : 'member', joinedAt: now() }),
    );
    return chat.id;
  }

  async findById(chatId: string) {
    const record = this.rows.get(chatId);
    return record ? this.toChat(record) : null;
  }

  async listForUser(userId: string) {
    return [...this.rows.values()]
      .filter((chat) => chat.members.has(userId))
      .map((chat) => this.toChat(chat));
  }

  async findMembership(chatId: string, userId: string): Promise<Membership | null> {
    const member = this.rows.get(chatId)?.members.get(userId);
    return member ? { chatId, userId, role: member.role } : null;
  }

  async addMembers(chatId: string, userIds: readonly string[]) {
    const chat = this.rows.get(chatId)!;
    userIds.forEach((id) => {
      if (!chat.members.has(id)) chat.members.set(id, { role: 'member', joinedAt: now() });
    });
  }

  async removeMember(chatId: string, userId: string) {
    this.rows.get(chatId)?.members.delete(userId);
  }

  async rename(chatId: string, name: string) {
    this.rows.get(chatId)!.name = name;
  }

  async recordLastMessage(chatId: string, message: LastMessageSummary) {
    this.rows.get(chatId)!.lastMessage = message;
  }

  async refreshLastMessagePreview(chatId: string, messageId: string, preview: string) {
    const chat = this.rows.get(chatId)!;
    if (chat.lastMessage?.id === messageId) chat.lastMessage = { ...chat.lastMessage, preview };
  }

  private insert(
    type: Chat['type'],
    name: string | null,
    createdBy: string,
    directKey: string | null,
  ) {
    const timestamp = now();
    const record: ChatRecord = {
      id: randomUUID(),
      type,
      name,
      createdBy,
      directKey,
      lastMessage: null,
      members: new Map(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.rows.set(record.id, record);
    return record;
  }

  private toChat({ directKey: _directKey, members, ...chat }: ChatRecord): Chat {
    const list = [...members.entries()].map(([userId, member]) => ({
      userId,
      displayName: this.users.displayNameOf(userId) ?? 'Unknown',
      ...member,
    }));
    return { ...chat, memberIds: list.map((m) => m.userId), members: list };
  }
}

class InMemoryMessageRepository implements MessageRepository {
  private readonly messages = new Map<string, Message[]>();
  private readonly readStates = new Map<string, Map<string, ReadState>>();

  async create(chatId: string, { senderId, text }: { senderId: string; text: string }) {
    const timestamp = now();
    const message: Message = {
      id: randomUUID().replace(/-/g, '').slice(0, 20),
      chatId,
      senderId,
      text,
      createdAt: timestamp,
      updatedAt: timestamp,
      editedAt: null,
      deletedAt: null,
      readBy: { [senderId]: timestamp },
    };
    this.chat(chatId).push(message);
    return structuredClone(message);
  }

  async findById(chatId: string, messageId: string) {
    const found = this.chat(chatId).find((m) => m.id === messageId);
    return found ? structuredClone(found) : null;
  }

  async list(chatId: string, { limit, before }: ListMessagesOptions): Promise<MessagePage | null> {
    const newestFirst = [...this.chat(chatId)].reverse();
    let start = 0;
    if (before) {
      start = newestFirst.findIndex((m) => m.id === before) + 1;
      if (start === 0) return null;
    }
    const window = newestFirst.slice(start, start + limit + 1);
    const page = window.slice(0, limit);
    const hasMore = window.length > limit;
    return {
      messages: structuredClone(page).reverse(),
      hasMore,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async markRead(chatId: string, messageId: string, userId: string) {
    const message = this.chat(chatId).find((m) => m.id === messageId);
    if (!message) return null;
    message.readBy[userId] ??= now();
    return structuredClone(message);
  }

  async updateText(chatId: string, messageId: string, text: string) {
    const message = this.chat(chatId).find((m) => m.id === messageId)!;
    Object.assign(message, { text, editedAt: now(), updatedAt: now() });
    return structuredClone(message);
  }

  async softDelete(chatId: string, messageId: string) {
    const message = this.chat(chatId).find((m) => m.id === messageId)!;
    Object.assign(message, { text: '', deletedAt: now(), updatedAt: now() });
    return structuredClone(message);
  }

  async setLastSeen(chatId: string, userId: string, messageId: string) {
    const message = this.chat(chatId).find((m) => m.id === messageId);
    if (!message) return null;

    const states = this.readStates.get(chatId) ?? new Map<string, ReadState>();
    this.readStates.set(chatId, states);
    const current = states.get(userId);
    if (current && current.lastSeenMessageAt >= message.createdAt) return current;

    const next: ReadState = {
      userId,
      lastSeenMessageId: message.id,
      lastSeenMessageAt: message.createdAt,
      updatedAt: now(),
    };
    states.set(userId, next);
    return next;
  }

  async listReadStates(chatId: string) {
    return [...(this.readStates.get(chatId)?.values() ?? [])];
  }

  private chat(chatId: string) {
    const list = this.messages.get(chatId) ?? [];
    this.messages.set(chatId, list);
    return list;
  }
}

export const createInMemoryRepositories = (): Repositories => {
  const users = new InMemoryUserRepository();
  return {
    users,
    chats: new InMemoryChatRepository(users),
    messages: new InMemoryMessageRepository(),
  };
};
