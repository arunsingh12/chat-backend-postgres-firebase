import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { UserPicker } from '@/components/ui/UserPicker';
import { useCurrentUser } from '../../session/session-context';
import { useUsers } from '../../users/hooks';
import { useCreateDirectChat } from '../hooks';

const EMPTY = new Set<string>();

export const NewChatModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const users = useUsers();
  const createChat = useCreateDirectChat();

  const startChat = (userId: string) => {
    createChat.mutate(userId, {
      onSuccess: ({ chatId }) => {
        onClose();
        navigate(`/chats/${chatId}`);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="New message" description="Start a 1:1 conversation">
      {users.isPending || createChat.isPending ? (
        <div className="flex justify-center py-10 text-brand-600">
          <Spinner />
        </div>
      ) : (
        <UserPicker
          users={(users.data ?? []).filter((user) => user.id !== me.id)}
          selected={EMPTY}
          onToggle={startChat}
        />
      )}
    </Modal>
  );
};
