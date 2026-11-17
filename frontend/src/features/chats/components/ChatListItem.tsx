import { NavLink } from 'react-router';
import type { Chat } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { formatListTime } from '@/lib/format';
import { chatAvatarSeed, chatTitle } from '../chat-utils';

interface ChatListItemProps {
  chat: Chat;
  meId: string;
}

export const ChatListItem = ({ chat, meId }: ChatListItemProps) => {
  const title = chatTitle(chat, meId);
  const last = chat.lastMessage;

  const senderLabel = (() => {
    if (!last?.senderId) return '';
    if (last.senderId === meId) return 'You: ';
    if (chat.type !== 'group') return '';
    const sender = chat.members.find((m) => m.userId === last.senderId);
    return sender ? `${sender.displayName.split(' ')[0]}: ` : '';
  })();

  return (
    <NavLink
      to={`/chats/${chat.id}`}
      className={({ isActive }) =>
        cn(
          'group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition',
          isActive ? 'bg-brand-50' : 'hover:bg-slate-50',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Avatar name={title} seed={chatAvatarSeed(chat, meId)} group={chat.type === 'group'} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span
                className={cn(
                  'truncate text-sm font-semibold',
                  isActive ? 'text-brand-700' : 'text-slate-900',
                )}
              >
                {title}
              </span>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">
                {formatListTime(last?.sentAt ?? chat.createdAt)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[13px] text-slate-500">
              {last ? (
                <>
                  <span className="text-slate-400">{senderLabel}</span>
                  {last.preview}
                </>
              ) : (
                <span className="italic text-slate-400">
                  {chat.type === 'group' ? `${chat.members.length} members` : 'Say hello 👋'}
                </span>
              )}
            </p>
          </div>
        </>
      )}
    </NavLink>
  );
};
