export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  /** Empty string once the message has been deleted. */
  text: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  /** Read receipts: userId → first time that user read the message. */
  readBy: Record<string, string>;
}

/** Per-user pointer to the newest message they have seen in a chat. */
export interface ReadState {
  userId: string;
  lastSeenMessageId: string;
  lastSeenMessageAt: string;
  updatedAt: string;
}

export interface MessagePage {
  /** Oldest → newest. */
  messages: Message[];
  hasMore: boolean;
  /** Pass as `before` to load the previous page. */
  nextCursor: string | null;
}

export interface ListMessagesOptions {
  limit: number;
  before?: string | undefined;
}

export interface MessageRepository {
  create(chatId: string, input: { senderId: string; text: string }): Promise<Message>;
  findById(chatId: string, messageId: string): Promise<Message | null>;
  /** Returns null when the `before` cursor does not exist. */
  list(chatId: string, options: ListMessagesOptions): Promise<MessagePage | null>;
  /** Idempotent; keeps the first read timestamp. Null when the message does not exist. */
  markRead(chatId: string, messageId: string, userId: string): Promise<Message | null>;
  updateText(chatId: string, messageId: string, text: string): Promise<Message>;
  softDelete(chatId: string, messageId: string): Promise<Message>;
  /**
   * Monotonic: only moves forward in time. Null when the message does not exist.
   */
  setLastSeen(chatId: string, userId: string, messageId: string): Promise<ReadState | null>;
  listReadStates(chatId: string): Promise<ReadState[]>;
}
