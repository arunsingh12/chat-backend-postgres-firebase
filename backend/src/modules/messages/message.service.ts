import { AppError } from '../../common/errors/app-error.js';
import type { Logger } from '../../lib/logger.js';
import type { ChatService } from '../chats/chat.service.js';
import type {
  ListMessagesOptions,
  Message,
  MessagePage,
  MessageRepository,
  ReadState,
} from './message.types.js';

const PREVIEW_LENGTH = 120;
const DELETED_PREVIEW = 'Message deleted';

const toPreview = (text: string) =>
  text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH - 1)}…` : text;

export class MessageService {
  constructor(
    private readonly messages: MessageRepository,
    private readonly chats: ChatService,
    private readonly logger: Logger,
  ) {}

  async send(chatId: string, senderId: string, text: string): Promise<Message> {
    await this.chats.assertMember(chatId, senderId);
    const message = await this.messages.create(chatId, { senderId, text });

    // Firestore is the source of truth for the message itself. The relational
    // summary only powers the chat list, so a failure here must not fail the send.
    await this.chats
      .recordLastMessage(chatId, {
        id: message.id,
        preview: toPreview(text),
        senderId,
        sentAt: message.createdAt,
      })
      .catch((error: unknown) =>
        this.logger.warn({ err: error, chatId }, 'Failed to update chat last message summary'),
      );

    return message;
  }

  async list(
    chatId: string,
    options: ListMessagesOptions & { userId: string },
  ): Promise<MessagePage> {
    await this.chats.assertMember(chatId, options.userId);

    const page = await this.messages.list(chatId, options);
    if (!page) throw AppError.notFound('Cursor message');
    return page;
  }

  async markRead(chatId: string, messageId: string, userId: string): Promise<Message> {
    await this.chats.assertMember(chatId, userId);
    const message = await this.messages.markRead(chatId, messageId, userId);
    if (!message) throw AppError.notFound('Message');
    return message;
  }

  async updateLastSeen(chatId: string, userId: string, messageId: string): Promise<ReadState> {
    await this.chats.assertMember(chatId, userId);
    const state = await this.messages.setLastSeen(chatId, userId, messageId);
    if (!state) throw AppError.notFound('Message');
    return state;
  }

  async listLastSeen(chatId: string, userId: string): Promise<ReadState[]> {
    await this.chats.assertMember(chatId, userId);
    return this.messages.listReadStates(chatId);
  }

  async edit(chatId: string, messageId: string, senderId: string, text: string): Promise<Message> {
    await this.assertEditable(chatId, messageId, senderId);
    const message = await this.messages.updateText(chatId, messageId, text);
    await this.chats.refreshLastMessagePreview(chatId, messageId, toPreview(text));
    return message;
  }

  async remove(chatId: string, messageId: string, senderId: string): Promise<Message> {
    await this.assertEditable(chatId, messageId, senderId);
    const message = await this.messages.softDelete(chatId, messageId);
    await this.chats.refreshLastMessagePreview(chatId, messageId, DELETED_PREVIEW);
    return message;
  }

  private async assertEditable(chatId: string, messageId: string, senderId: string) {
    await this.chats.assertMember(chatId, senderId);
    const message = await this.messages.findById(chatId, messageId);

    if (!message) throw AppError.notFound('Message');
    if (message.senderId !== senderId) {
      throw AppError.forbidden('Only the sender can change this message');
    }
    if (message.deletedAt) throw AppError.conflict('Message has already been deleted');
  }
}
