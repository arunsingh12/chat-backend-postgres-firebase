import { ShieldAlert } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '@/api/http';
import type { Chat, Message } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { GroupSettingsModal } from '@/features/chats/components/GroupSettingsModal';
import { useChat } from '@/features/chats/hooks';
import { ChatHeader } from '@/features/messages/components/ChatHeader';
import { Composer } from '@/features/messages/components/Composer';
import { MessageList } from '@/features/messages/components/MessageList';
import { useMessages } from '@/features/messages/hooks/useMessages';
import {
  useDeleteMessage,
  useEditMessage,
  useSendMessage,
} from '@/features/messages/hooks/useMessageMutations';
import { useLastSeen, useReadTracking } from '@/features/messages/hooks/useReadTracking';
import { useCurrentUser } from '@/features/session/session-context';

export const ChatPage = () => {
  const { chatId = '' } = useParams();
  const chat = useChat(chatId);

  if (chat.isPending) {
    return (
      <div className="flex h-full items-center justify-center text-brand-600">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (chat.isError) {
    const forbidden = chat.error instanceof ApiError && chat.error.status === 403;
    return (
      <EmptyState
        className="h-full"
        icon={<ShieldAlert className="size-6" />}
        title={forbidden ? "You're not in this conversation" : 'Conversation unavailable'}
        description={chat.error.message}
        action={
          <Link to="/chats">
            <Button variant="secondary">Back to chats</Button>
          </Link>
        }
      />
    );
  }

  // Keyed so per-chat state (scroll, drafts, read tracking) resets on switch.
  return <Conversation key={chat.data.id} chat={chat.data} />;
};

const Conversation = ({ chat }: { chat: Chat }) => {
  const me = useCurrentUser();
  const messagesQuery = useMessages(chat.id);
  const lastSeen = useLastSeen(chat.id);
  const sendMessage = useSendMessage(chat.id);
  const editMessage = useEditMessage(chat.id);
  const deleteMessage = useDeleteMessage(chat.id);

  const [editing, setEditing] = useState<Message | null>(null);
  const [deleting, setDeleting] = useState<Message | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useReadTracking(chat.id, messagesQuery.messages);

  const onSaveEdit = useCallback(
    (message: Message, text: string) => {
      editMessage.mutate({ messageId: message.id, text });
      setEditing(null);
    },
    [editMessage],
  );

  const confirmDelete = () => {
    if (!deleting) return;
    deleteMessage.mutate(deleting.id, { onSettled: () => setDeleting(null) });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader chat={chat} meId={me.id} onOpenSettings={() => setSettingsOpen(true)} />

      <MessageList
        chat={chat}
        meId={me.id}
        messages={messagesQuery.messages}
        readStates={lastSeen.data ?? []}
        isLoading={messagesQuery.isPending}
        hasOlder={Boolean(messagesQuery.hasNextPage)}
        isLoadingOlder={messagesQuery.isFetchingNextPage}
        onLoadOlder={() => void messagesQuery.fetchNextPage()}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <Composer
        key={editing?.id ?? 'compose'}
        editing={editing}
        onSend={(text) => sendMessage.mutate(text)}
        onSaveEdit={onSaveEdit}
        onCancelEdit={() => setEditing(null)}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete message?"
        description="It will be removed for everyone in this chat."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleteMessage.isPending}>
              Delete
            </Button>
          </>
        }
      >
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{deleting?.text}</p>
      </Modal>

      {settingsOpen && chat.type === 'group' ? (
        <GroupSettingsModal chat={chat} open onClose={() => setSettingsOpen(false)} />
      ) : null}
    </div>
  );
};
