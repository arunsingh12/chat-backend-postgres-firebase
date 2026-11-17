import { ArrowLeft, Settings2 } from 'lucide-react';
import { Link } from 'react-router';
import type { Chat } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { chatAvatarSeed, chatTitle, directPeer } from '../../chats/chat-utils';

interface ChatHeaderProps {
  chat: Chat;
  meId: string;
  onOpenSettings: () => void;
}

export const ChatHeader = ({ chat, meId, onOpenSettings }: ChatHeaderProps) => {
  const title = chatTitle(chat, meId);
  const isGroup = chat.type === 'group';

  const subtitle = isGroup
    ? chat.members
        .map((member) => (member.userId === meId ? 'You' : member.displayName.split(' ')[0]))
        .join(', ')
    : directPeer(chat, meId)
      ? 'Direct message'
      : '';

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white/80 px-4 backdrop-blur sm:px-6">
      <Link
        to="/chats"
        className="-ml-1 rounded-full p-2 text-slate-500 hover:bg-slate-100 md:hidden"
        aria-label="Back to conversations"
      >
        <ArrowLeft className="size-5" />
      </Link>
      <Avatar name={title} seed={chatAvatarSeed(chat, meId)} group={isGroup} />
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[15px] font-semibold text-slate-900">{title}</h1>
        <p className="truncate text-xs text-slate-500">{subtitle}</p>
      </div>
      {isGroup ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenSettings}
          title="Group settings"
          aria-label="Group settings"
        >
          <Settings2 className="size-[18px]" />
        </Button>
      ) : null}
    </header>
  );
};
