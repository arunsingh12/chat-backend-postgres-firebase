import { differenceInMinutes, isSameDay } from 'date-fns';
import { MessageCircleHeart } from 'lucide-react';
import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { Chat, Message, ReadState } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { formatDayDivider } from '@/lib/format';
import { MessageBubble } from './MessageBubble';

const GROUP_WINDOW_MINUTES = 5;
const NEAR_BOTTOM_PX = 120;

interface MessageListProps {
  chat: Chat;
  meId: string;
  messages: Message[];
  readStates: ReadState[];
  isLoading: boolean;
  hasOlder: boolean;
  isLoadingOlder: boolean;
  onLoadOlder: () => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

const startsGroup = (previous: Message | undefined, current: Message) =>
  !previous ||
  previous.senderId !== current.senderId ||
  !isSameDay(new Date(previous.createdAt), new Date(current.createdAt)) ||
  differenceInMinutes(new Date(current.createdAt), new Date(previous.createdAt)) >=
    GROUP_WINDOW_MINUTES;

export const MessageList = ({
  chat,
  meId,
  messages,
  readStates,
  isLoading,
  hasOlder,
  isLoadingOlder,
  onLoadOlder,
  onEdit,
  onDelete,
}: MessageListProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollState = useRef({
    firstId: undefined as string | undefined,
    lastId: undefined as string | undefined,
    scrollHeight: 0,
    scrollTop: 0,
    nearBottom: true,
  });

  const names = useMemo(
    () => new Map(chat.members.map((member) => [member.userId, member.displayName])),
    [chat.members],
  );
  const nameOf = useCallback((userId: string) => names.get(userId) ?? 'Former member', [names]);
  const recipientIds = useMemo(
    () => chat.memberIds.filter((id) => id !== meId),
    [chat.memberIds, meId],
  );

  /** messageId → other members whose "last seen" pointer sits on it. */
  const seenByMessage = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const state of readStates) {
      if (state.userId === meId || !names.has(state.userId)) continue;
      map.set(state.lastSeenMessageId, [...(map.get(state.lastSeenMessageId) ?? []), state.userId]);
    }
    return map;
  }, [readStates, meId, names]);

  const rememberScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    Object.assign(scrollState.current, {
      scrollHeight: el.scrollHeight,
      scrollTop: el.scrollTop,
      nearBottom: el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX,
    });
  };

  // Keep the viewport stable: stick to the bottom for new messages, and keep
  // the reader's position when older history is prepended above them.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const previous = scrollState.current;
    const firstId = messages[0]?.id;
    const last = messages.at(-1);

    const prepended =
      previous.firstId && firstId !== previous.firstId && last?.id === previous.lastId;
    if (prepended) {
      el.scrollTop = el.scrollHeight - previous.scrollHeight + previous.scrollTop;
    } else if (last?.id !== previous.lastId) {
      if (!previous.lastId || previous.nearBottom || last?.senderId === meId) {
        el.scrollTop = el.scrollHeight;
      }
    }

    previous.firstId = firstId;
    previous.lastId = last?.id;
    rememberScroll();
  }, [messages, meId]);

  if (isLoading) {
    return (
      <div className="chat-backdrop flex flex-1 items-center justify-center text-brand-600">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={rememberScroll}
      className="chat-backdrop scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-8"
    >
      {hasOlder ? (
        <div className="flex justify-center pt-4">
          <Button variant="secondary" size="sm" loading={isLoadingOlder} onClick={onLoadOlder}>
            Load earlier messages
          </Button>
        </div>
      ) : null}

      {messages.length === 0 ? (
        <EmptyState
          className="h-full"
          icon={<MessageCircleHeart className="size-6" />}
          title="No messages yet"
          description="Send the first message to get the conversation going."
        />
      ) : (
        <div className="mx-auto max-w-3xl pt-2">
          {messages.map((message, index) => {
            const previous = messages[index - 1];
            const next = messages[index + 1];
            const newDay =
              !previous || !isSameDay(new Date(previous.createdAt), new Date(message.createdAt));

            return (
              <div key={message.id}>
                {newDay ? (
                  <div className="sticky top-2 z-10 my-4 flex justify-center">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-500 shadow-soft ring-1 ring-slate-200/60 backdrop-blur">
                      {formatDayDivider(message.createdAt)}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  message={message}
                  isMine={message.senderId === meId}
                  isGroup={chat.type === 'group'}
                  senderName={nameOf(message.senderId)}
                  firstInGroup={startsGroup(previous, message)}
                  lastInGroup={!next || startsGroup(message, next)}
                  recipientIds={recipientIds}
                  nameOf={nameOf}
                  seenBy={seenByMessage.get(message.id) ?? []}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
