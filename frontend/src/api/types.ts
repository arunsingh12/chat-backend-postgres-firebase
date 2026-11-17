/** Mirrors the API contracts in server/src/modules/**\/*.types.ts */

export interface User {
  id: string;
  displayName: string;
  email: string;
  createdAt: string;
}

export interface AuthResult {
  user: User;
  token: string;
}

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
  name: string | null;
  createdBy: string;
  memberIds: string[];
  members: ChatMember[];
  lastMessage: LastMessageSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatResult {
  chatId: string;
  created: boolean;
  chat: Chat;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  readBy: Record<string, string>;
  /** Client-only: optimistic message not yet acknowledged by the server. */
  pending?: boolean;
}

export interface MessagePage {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ReadState {
  userId: string;
  lastSeenMessageId: string;
  lastSeenMessageAt: string;
  updatedAt: string;
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
