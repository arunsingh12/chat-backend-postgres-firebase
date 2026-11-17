import { http } from './http';
import type {
  AuthResult,
  Chat,
  CreateChatResult,
  Message,
  MessagePage,
  ReadState,
  User,
} from './types';

export const authApi = {
  register: (input: { name: string; email: string; password: string }) =>
    http.post<AuthResult>('/auth/register', input),
  login: (input: { email: string; password: string }) =>
    http.post<AuthResult>('/auth/login', input),
  me: () => http.get<User>('/auth/me'),
};

export const usersApi = {
  list: () => http.get<User[]>('/user'),
  chats: (userId: string) => http.get<Chat[]>(`/user/${userId}/chats`),
};

export const chatsApi = {
  createDirect: (userAId: string, userBId: string) =>
    http.post<CreateChatResult>('/chat/create', { userAId, userBId }),
  createGroup: (input: { creatorId: string; name: string; memberIds: string[] }) =>
    http.post<CreateChatResult>('/chat/group', input),
  get: (chatId: string, userId: string) => http.get<Chat>(`/chat/${chatId}`, { userId }),
  rename: (chatId: string, requesterId: string, name: string) =>
    http.patch<Chat>(`/chat/${chatId}`, { requesterId, name }),
  addMembers: (chatId: string, requesterId: string, userIds: string[]) =>
    http.post<Chat>(`/chat/${chatId}/members`, { requesterId, userIds }),
  removeMember: (chatId: string, requesterId: string, userId: string) =>
    http.delete<Chat>(`/chat/${chatId}/members/${userId}`, { requesterId }),
};

export const messagesApi = {
  list: (chatId: string, params: { userId: string; limit?: number; before?: string }) =>
    http.get<MessagePage>(`/chat/${chatId}/messages`, params),
  send: (chatId: string, senderId: string, text: string) =>
    http.post<Message>(`/chat/${chatId}/message/send`, { senderId, text }),
  markRead: (chatId: string, messageId: string, userId: string) =>
    http.post<Message>(`/chat/${chatId}/message/${messageId}/read`, { userId }),
  edit: (chatId: string, messageId: string, senderId: string, text: string) =>
    http.patch<Message>(`/chat/${chatId}/message/${messageId}`, { senderId, text }),
  remove: (chatId: string, messageId: string, senderId: string) =>
    http.delete<Message>(`/chat/${chatId}/message/${messageId}`, { senderId }),
  lastSeen: (chatId: string) => http.get<ReadState[]>(`/chat/${chatId}/lastseen`),
  updateLastSeen: (chatId: string, userId: string, messageId: string) =>
    http.post<ReadState>(`/chat/${chatId}/lastseen`, { userId, messageId }),
};
