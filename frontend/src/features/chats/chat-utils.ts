import type { Chat, ChatMember } from '@/api/types';

/** The other participant of a 1:1 chat. */
export const directPeer = (chat: Chat, meId: string): ChatMember | undefined =>
  chat.members.find((member) => member.userId !== meId);

export const chatTitle = (chat: Chat, meId: string): string =>
  chat.type === 'group' ? (chat.name ?? 'Group') : (directPeer(chat, meId)?.displayName ?? 'Chat');

/** Colour seed for the avatar: the peer for 1:1 chats, the chat for groups. */
export const chatAvatarSeed = (chat: Chat, meId: string): string =>
  chat.type === 'group' ? chat.id : (directPeer(chat, meId)?.userId ?? chat.id);

export const canManageGroup = (chat: Chat, meId: string): boolean =>
  chat.members.some(
    (member) => member.userId === meId && (member.role === 'owner' || member.role === 'admin'),
  );
