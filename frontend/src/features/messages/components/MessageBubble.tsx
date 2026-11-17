import { Ban, Pencil, Trash2 } from 'lucide-react';
import { memo } from 'react';
import type { Message } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { formatMessageTime } from '@/lib/format';
import { ReadReceipt } from './ReadReceipt';

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  isGroup: boolean;
  senderName: string;
  firstInGroup: boolean;
  lastInGroup: boolean;
  recipientIds: string[];
  nameOf: (userId: string) => string;
  seenBy: string[];
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
}

export const MessageBubble = memo(function MessageBubble({
  message,
  isMine,
  isGroup,
  senderName,
  firstInGroup,
  lastInGroup,
  recipientIds,
  nameOf,
  seenBy,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const deleted = Boolean(message.deletedAt);
  const canModify = isMine && !deleted && !message.pending;

  return (
    <div className={cn('flex flex-col', firstInGroup ? 'mt-3' : 'mt-0.5')}>
      <div className={cn('group flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
        {/* Avatar column keeps bubbles aligned in group chats */}
        {!isMine && isGroup ? (
          <div className="w-8 shrink-0">
            {lastInGroup ? <Avatar name={senderName} seed={message.senderId} size="sm" /> : null}
          </div>
        ) : null}

        <div
          className={cn(
            'flex max-w-[78%] flex-col sm:max-w-[65%]',
            isMine ? 'items-end' : 'items-start',
          )}
        >
          {!isMine && isGroup && firstInGroup ? (
            <span className="mb-1 ml-3 text-xs font-medium text-slate-500">{senderName}</span>
          ) : null}

          <div
            className={cn(
              'relative rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed shadow-sm',
              deleted
                ? 'border border-dashed border-slate-300 bg-white/60 text-slate-400 shadow-none'
                : isMine
                  ? 'bg-gradient-to-br from-brand-600 to-violet-600 text-white'
                  : 'bg-white text-slate-800 ring-1 ring-slate-200/70',
              isMine && lastInGroup && 'rounded-br-md',
              !isMine && lastInGroup && 'rounded-bl-md',
              message.pending && 'opacity-80',
            )}
          >
            {deleted ? (
              <span className="flex items-center gap-1.5 italic">
                <Ban className="size-3.5" /> This message was deleted
              </span>
            ) : (
              <span className="whitespace-pre-wrap break-words">{message.text}</span>
            )}
            <span
              className={cn(
                'float-right ml-3 mt-1.5 inline-flex translate-y-0.5 items-center gap-1 text-[10.5px] leading-none',
                isMine && !deleted ? 'text-white/75' : 'text-slate-400',
              )}
            >
              {message.editedAt && !deleted ? <span>edited</span> : null}
              {formatMessageTime(message.createdAt)}
              {isMine && !deleted ? (
                <ReadReceipt message={message} recipientIds={recipientIds} nameOf={nameOf} />
              ) : null}
            </span>
          </div>
        </div>

        {canModify ? (
          <div className="flex items-center gap-0.5 self-center opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(message)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
              aria-label="Edit message"
              title="Edit"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(message)}
              className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-rose-600"
              aria-label="Delete message"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {seenBy.length > 0 ? (
        <div
          className={cn(
            'mt-1 flex -space-x-1',
            isMine ? 'justify-end' : isGroup ? 'pl-10' : 'pl-0',
          )}
          title={`Seen by ${seenBy.map(nameOf).join(', ')}`}
        >
          {seenBy.map((userId) => (
            <Avatar key={userId} name={nameOf(userId)} seed={userId} size="xs" className="ring-1" />
          ))}
        </div>
      ) : null}
    </div>
  );
});
