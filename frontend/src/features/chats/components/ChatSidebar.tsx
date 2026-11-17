import { LogOut, MessageSquarePlus, MessagesSquare, Search, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { Logo } from '@/components/Logo';
import { useCurrentUser, useSession } from '../../session/session-context';
import { chatTitle } from '../chat-utils';
import { useUserChats } from '../hooks';
import { ChatListItem } from './ChatListItem';
import { NewChatModal } from './NewChatModal';
import { NewGroupModal } from './NewGroupModal';

type Dialog = 'direct' | 'group' | null;

export const ChatSidebar = () => {
  const me = useCurrentUser();
  const { logout } = useSession();
  const chats = useUserChats();
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chats.data ?? [];
    return (chats.data ?? []).filter((chat) =>
      chatTitle(chat, me.id).toLowerCase().includes(needle),
    );
  }, [chats.data, query, me.id]);

  return (
    <aside className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <Logo />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title="New group"
            aria-label="New group"
            onClick={() => setDialog('group')}
          >
            <UsersRound className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="New message"
            aria-label="New message"
            onClick={() => setDialog('direct')}
          >
            <MessageSquarePlus className="size-[18px]" />
          </Button>
        </div>
      </header>

      <div className="px-4 pb-3">
        <Input
          placeholder="Search conversations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          icon={<Search className="size-4" />}
        />
      </div>

      <nav className="scrollbar-thin min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {chats.isPending ? (
          <div className="flex justify-center py-12 text-brand-600">
            <Spinner />
          </div>
        ) : chats.isError ? (
          <p className="px-4 py-8 text-center text-sm text-rose-600">{chats.error.message}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            className="py-14"
            icon={<MessagesSquare className="size-6" />}
            title={query ? 'No matches' : 'No conversations yet'}
            description={
              query ? 'Try a different name.' : 'Start a chat with someone to see it here.'
            }
            action={
              query ? null : (
                <Button size="sm" onClick={() => setDialog('direct')}>
                  <MessageSquarePlus className="size-4" /> New message
                </Button>
              )
            }
          />
        ) : (
          filtered.map((chat) => <ChatListItem key={chat.id} chat={chat} meId={me.id} />)
        )}
      </nav>

      <footer className="flex items-center gap-3 border-t border-slate-100 px-4 py-3">
        <Avatar name={me.displayName} seed={me.id} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{me.displayName}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="size-1.5 rounded-full bg-emerald-500" /> Online
          </p>
        </div>
        <Button variant="ghost" size="icon" title="Log out" aria-label="Log out" onClick={logout}>
          <LogOut className="size-4" />
        </Button>
      </footer>

      <NewChatModal open={dialog === 'direct'} onClose={() => setDialog(null)} />
      <NewGroupModal open={dialog === 'group'} onClose={() => setDialog(null)} />
    </aside>
  );
};
