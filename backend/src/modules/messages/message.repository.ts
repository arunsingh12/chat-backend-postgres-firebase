import {
  FieldPath,
  FieldValue,
  Timestamp,
  type CollectionReference,
  type DocumentSnapshot,
  type Firestore,
} from 'firebase-admin/firestore';
import type {
  ListMessagesOptions,
  Message,
  MessagePage,
  MessageRepository,
  ReadState,
} from './message.types.js';

/**
 * Firestore layout
 *
 *   chats/{chatId}/messages/{messageId}   → MessageDoc
 *   chats/{chatId}/readStates/{userId}    → ReadStateDoc   (last seen pointer)
 *
 * Read receipts live on the message itself as a `readBy` map so a single read
 * returns the message together with who has seen it.
 */
interface MessageDoc {
  chatId: string;
  senderId: string;
  text: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editedAt: Timestamp | null;
  deletedAt: Timestamp | null;
  readBy: Record<string, Timestamp>;
}

interface ReadStateDoc {
  userId: string;
  lastSeenMessageId: string;
  lastSeenMessageAt: Timestamp;
  updatedAt: Timestamp;
}

const toIso = (value: Timestamp | null | undefined): string =>
  (value ?? Timestamp.now()).toDate().toISOString();

const toIsoOrNull = (value: Timestamp | null | undefined): string | null =>
  value ? value.toDate().toISOString() : null;

const toMessage = (snapshot: DocumentSnapshot): Message => {
  const doc = snapshot.data() as MessageDoc;
  return {
    id: snapshot.id,
    chatId: doc.chatId,
    senderId: doc.senderId,
    text: doc.deletedAt ? '' : doc.text,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    editedAt: toIsoOrNull(doc.editedAt),
    deletedAt: toIsoOrNull(doc.deletedAt),
    readBy: Object.fromEntries(
      Object.entries(doc.readBy ?? {}).map(([userId, readAt]) => [userId, toIso(readAt)]),
    ),
  };
};

const toReadState = (doc: ReadStateDoc): ReadState => ({
  userId: doc.userId,
  lastSeenMessageId: doc.lastSeenMessageId,
  lastSeenMessageAt: toIso(doc.lastSeenMessageAt),
  updatedAt: toIso(doc.updatedAt),
});

export class FirestoreMessageRepository implements MessageRepository {
  constructor(private readonly db: Firestore) {}

  async create(chatId: string, { senderId, text }: { senderId: string; text: string }) {
    const ref = this.messages(chatId).doc();
    const now = FieldValue.serverTimestamp();

    await ref.set({
      chatId,
      senderId,
      text,
      createdAt: now,
      updatedAt: now,
      editedAt: null,
      deletedAt: null,
      // The sender has implicitly read their own message.
      readBy: { [senderId]: now },
    });

    // Re-read so the response carries the resolved server timestamp.
    return toMessage(await ref.get());
  }

  async findById(chatId: string, messageId: string): Promise<Message | null> {
    const snapshot = await this.messages(chatId).doc(messageId).get();
    return snapshot.exists ? toMessage(snapshot) : null;
  }

  async list(chatId: string, { limit, before }: ListMessagesOptions): Promise<MessagePage | null> {
    // Newest first so `limit` returns the most recent window, then flip it.
    let query = this.messages(chatId)
      .orderBy('createdAt', 'desc')
      .limit(limit + 1);

    if (before) {
      const cursor = await this.messages(chatId).doc(before).get();
      if (!cursor.exists) return null;
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();
    const page = snapshot.docs.slice(0, limit);
    const hasMore = snapshot.docs.length > limit;

    return {
      messages: page.map(toMessage).reverse(),
      hasMore,
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async markRead(chatId: string, messageId: string, userId: string): Promise<Message | null> {
    const ref = this.messages(chatId).doc(messageId);

    const result = await this.db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) return 'missing' as const;

      const doc = snapshot.data() as MessageDoc;
      if (doc.readBy?.[userId]) return 'unchanged' as const;

      // FieldPath avoids any ambiguity with characters inside the user id.
      tx.update(ref, new FieldPath('readBy', userId), FieldValue.serverTimestamp());
      return 'updated' as const;
    });

    if (result === 'missing') return null;
    return toMessage(await ref.get());
  }

  async updateText(chatId: string, messageId: string, text: string): Promise<Message> {
    const ref = this.messages(chatId).doc(messageId);
    const now = FieldValue.serverTimestamp();
    await ref.update({ text, editedAt: now, updatedAt: now });
    return toMessage(await ref.get());
  }

  async softDelete(chatId: string, messageId: string): Promise<Message> {
    const ref = this.messages(chatId).doc(messageId);
    const now = FieldValue.serverTimestamp();
    await ref.update({ text: '', deletedAt: now, updatedAt: now });
    return toMessage(await ref.get());
  }

  async setLastSeen(chatId: string, userId: string, messageId: string): Promise<ReadState | null> {
    const messageRef = this.messages(chatId).doc(messageId);
    const stateRef = this.readStates(chatId).doc(userId);

    const found = await this.db.runTransaction(async (tx) => {
      const [messageSnap, stateSnap] = await tx.getAll(messageRef, stateRef);
      if (!messageSnap?.exists) return false;

      const message = messageSnap.data() as MessageDoc;
      const current = stateSnap?.exists ? (stateSnap.data() as ReadStateDoc) : null;

      // Never move the pointer backwards (e.g. an older tab reporting late).
      if (current && current.lastSeenMessageAt.toMillis() >= message.createdAt.toMillis()) {
        return true;
      }

      tx.set(stateRef, {
        userId,
        lastSeenMessageId: messageId,
        lastSeenMessageAt: message.createdAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    if (!found) return null;
    return toReadState((await stateRef.get()).data() as ReadStateDoc);
  }

  async listReadStates(chatId: string): Promise<ReadState[]> {
    const snapshot = await this.readStates(chatId).get();
    return snapshot.docs.map((doc) => toReadState(doc.data() as ReadStateDoc));
  }

  private messages(chatId: string): CollectionReference {
    return this.db.collection('chats').doc(chatId).collection('messages');
  }

  private readStates(chatId: string): CollectionReference {
    return this.db.collection('chats').doc(chatId).collection('readStates');
  }
}
