export const queryKeys = {
  me: ['auth', 'me'] as const,
  users: ['users'] as const,
  userChats: (userId: string) => ['users', userId, 'chats'] as const,
  chat: (chatId: string) => ['chats', chatId] as const,
  messages: (chatId: string) => ['chats', chatId, 'messages'] as const,
  lastSeen: (chatId: string) => ['chats', chatId, 'lastseen'] as const,
};

/** Polling intervals (ms). Swap for Firestore listeners / websockets to go realtime. */
export const POLL = {
  messages: 2_500,
  lastSeen: 4_000,
  chats: 5_000,
} as const;
