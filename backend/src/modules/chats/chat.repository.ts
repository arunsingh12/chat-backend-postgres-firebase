import type pg from 'pg';
import { withTransaction, type Queryable } from '../../lib/postgres.js';
import type {
  Chat,
  ChatMember,
  ChatRepository,
  ChatType,
  CreateDirectChatInput,
  CreateGroupChatInput,
  LastMessageSummary,
  MemberRole,
  Membership,
} from './chat.types.js';

interface ChatRow {
  id: string;
  type: ChatType;
  name: string | null;
  created_by: string;
  last_message_id: string | null;
  last_message_preview: string | null;
  last_message_sender_id: string | null;
  last_message_at: Date | null;
  created_at: Date;
  updated_at: Date;
  members: Array<{ userId: string; displayName: string; role: MemberRole; joinedAt: string }>;
}

/**
 * Members are aggregated in SQL so one round-trip returns chats ready to
 * serialise. `FILTER` keeps the subquery cheap for the per-user listing.
 */
const CHAT_SELECT = `
  SELECT
    c.id, c.type, c.name, c.created_by,
    c.last_message_id, c.last_message_preview, c.last_message_sender_id, c.last_message_at,
    c.created_at, c.updated_at,
    (
      SELECT json_agg(
        json_build_object(
          'userId', u.id,
          'displayName', u.display_name,
          'role', m.role,
          'joinedAt', m.joined_at
        ) ORDER BY m.joined_at, u.display_name
      )
      FROM chat_members m
      JOIN users u ON u.id = m.user_id
      WHERE m.chat_id = c.id
    ) AS members
  FROM chats c
`;

const toChat = (row: ChatRow): Chat => {
  const members: ChatMember[] = (row.members ?? []).map((member) => ({
    ...member,
    joinedAt: new Date(member.joinedAt).toISOString(),
  }));

  return {
    id: row.id,
    type: row.type,
    name: row.name,
    createdBy: row.created_by,
    memberIds: members.map((member) => member.userId),
    members,
    lastMessage:
      row.last_message_id && row.last_message_at
        ? {
            id: row.last_message_id,
            preview: row.last_message_preview ?? '',
            senderId: row.last_message_sender_id,
            sentAt: row.last_message_at.toISOString(),
          }
        : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
};

const insertMembers = async (
  db: Queryable,
  chatId: string,
  members: ReadonlyArray<{ userId: string; role: MemberRole }>,
) => {
  if (members.length === 0) return;
  await db.query(
    `INSERT INTO chat_members (chat_id, user_id, role)
     SELECT $1, member.user_id, member.role
     FROM unnest($2::uuid[], $3::text[]) AS member(user_id, role)
     ON CONFLICT (chat_id, user_id) DO NOTHING`,
    [chatId, members.map((m) => m.userId), members.map((m) => m.role)],
  );
};

export class PostgresChatRepository implements ChatRepository {
  constructor(private readonly pool: pg.Pool) {}

  createDirect({ directKey, createdBy, memberIds }: CreateDirectChatInput) {
    return withTransaction(this.pool, async (tx) => {
      // Under concurrent requests the loser blocks on the unique index until
      // the winner commits, then falls through to the SELECT below.
      const inserted = await tx.query<{ id: string }>(
        `INSERT INTO chats (type, direct_key, created_by)
         VALUES ('direct', $1, $2)
         ON CONFLICT (direct_key) DO NOTHING
         RETURNING id`,
        [directKey, createdBy],
      );

      const newChatId = inserted.rows[0]?.id;
      if (newChatId) {
        await insertMembers(
          tx,
          newChatId,
          memberIds.map((userId) => ({ userId, role: 'member' as const })),
        );
        return { chatId: newChatId, created: true };
      }

      const existing = await tx.query<{ id: string }>(
        'SELECT id FROM chats WHERE direct_key = $1',
        [directKey],
      );
      return { chatId: existing.rows[0]!.id, created: false };
    });
  }

  createGroup({ name, createdBy, memberIds }: CreateGroupChatInput) {
    return withTransaction(this.pool, async (tx) => {
      const { rows } = await tx.query<{ id: string }>(
        `INSERT INTO chats (type, name, created_by) VALUES ('group', $1, $2) RETURNING id`,
        [name, createdBy],
      );
      const chatId = rows[0]!.id;
      await insertMembers(tx, chatId, [
        { userId: createdBy, role: 'owner' },
        ...memberIds
          .filter((userId) => userId !== createdBy)
          .map((userId) => ({ userId, role: 'member' as const })),
      ]);
      return chatId;
    });
  }

  async findById(chatId: string): Promise<Chat | null> {
    const { rows } = await this.pool.query<ChatRow>(`${CHAT_SELECT} WHERE c.id = $1`, [chatId]);
    return rows[0] ? toChat(rows[0]) : null;
  }

  async listForUser(userId: string): Promise<Chat[]> {
    const { rows } = await this.pool.query<ChatRow>(
      `${CHAT_SELECT}
       WHERE EXISTS (SELECT 1 FROM chat_members cm WHERE cm.chat_id = c.id AND cm.user_id = $1)
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
      [userId],
    );
    return rows.map(toChat);
  }

  async findMembership(chatId: string, userId: string): Promise<Membership | null> {
    const { rows } = await this.pool.query<{ chat_id: string; user_id: string; role: MemberRole }>(
      'SELECT chat_id, user_id, role FROM chat_members WHERE chat_id = $1 AND user_id = $2',
      [chatId, userId],
    );
    const row = rows[0];
    return row ? { chatId: row.chat_id, userId: row.user_id, role: row.role } : null;
  }

  async addMembers(chatId: string, userIds: readonly string[]): Promise<void> {
    await insertMembers(
      this.pool,
      chatId,
      userIds.map((userId) => ({ userId, role: 'member' as const })),
    );
    await this.touch(chatId);
  }

  async removeMember(chatId: string, userId: string): Promise<void> {
    await this.pool.query('DELETE FROM chat_members WHERE chat_id = $1 AND user_id = $2', [
      chatId,
      userId,
    ]);
    await this.touch(chatId);
  }

  async rename(chatId: string, name: string): Promise<void> {
    await this.pool.query('UPDATE chats SET name = $2, updated_at = now() WHERE id = $1', [
      chatId,
      name,
    ]);
  }

  async recordLastMessage(chatId: string, message: LastMessageSummary): Promise<void> {
    // Guarded so an out-of-order write can never move the pointer backwards.
    await this.pool.query(
      `UPDATE chats
       SET last_message_id = $2, last_message_preview = $3, last_message_sender_id = $4,
           last_message_at = $5, updated_at = now()
       WHERE id = $1 AND (last_message_at IS NULL OR last_message_at <= $5)`,
      [chatId, message.id, message.preview, message.senderId, message.sentAt],
    );
  }

  async refreshLastMessagePreview(chatId: string, messageId: string, preview: string) {
    await this.pool.query(
      `UPDATE chats SET last_message_preview = $3, updated_at = now()
       WHERE id = $1 AND last_message_id = $2`,
      [chatId, messageId, preview],
    );
  }

  private async touch(chatId: string) {
    await this.pool.query('UPDATE chats SET updated_at = now() WHERE id = $1', [chatId]);
  }
}
