export type ChatType = 'direct' | 'group';
export type MemberRole = 'owner' | 'admin' | 'member';

export interface ChatMember {
  userId: string;
  displayName: string;
  role: MemberRole;
  joinedAt: string;
}

export interface LastMessageSummary {
  id: string;
  preview: string;
  senderId: string | null;
  sentAt: string;
}

export interface Chat {
  id: string;
  type: ChatType;
  /** Only set for group chats. */
  name: string | null;
  createdBy: string;
  memberIds: string[];
  members: ChatMember[];
  lastMessage: LastMessageSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface Membership {
  chatId: string;
  userId: string;
  role: MemberRole;
}

export interface CreateDirectChatInput {
  directKey: string;
  createdBy: string;
  memberIds: [string, string];
}

export interface CreateGroupChatInput {
  name: string;
  createdBy: string;
  memberIds: string[];
}

export interface ChatRepository {
  /** Idempotent: returns the existing chat id when the direct key already exists. */
  createDirect(input: CreateDirectChatInput): Promise<{ chatId: string; created: boolean }>;
  createGroup(input: CreateGroupChatInput): Promise<string>;
  findById(chatId: string): Promise<Chat | null>;
  listForUser(userId: string): Promise<Chat[]>;
  findMembership(chatId: string, userId: string): Promise<Membership | null>;
  addMembers(chatId: string, userIds: readonly string[]): Promise<void>;
  removeMember(chatId: string, userId: string): Promise<void>;
  rename(chatId: string, name: string): Promise<void>;
  recordLastMessage(chatId: string, message: LastMessageSummary): Promise<void>;
  /** Only touches the preview if `messageId` is still the chat's latest message. */
  refreshLastMessagePreview(chatId: string, messageId: string, preview: string): Promise<void>;
}
