import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { UserPicker } from '@/components/ui/UserPicker';
import { useToggleSet } from '@/hooks/useToggleSet';
import { useCurrentUser } from '../../session/session-context';
import { useUsers } from '../../users/hooks';
import { useCreateGroup } from '../hooks';

export const NewGroupModal = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const users = useUsers();
  const createGroup = useCreateGroup();
  const [name, setName] = useState('');
  const members = useToggleSet();

  const close = () => {
    setName('');
    members.clear();
    onClose();
  };

  const submit = () => {
    createGroup.mutate(
      { name: name.trim(), memberIds: [...members.values] },
      {
        onSuccess: ({ chatId }) => {
          toast.success(`Group “${name.trim()}” created`);
          close();
          navigate(`/chats/${chatId}`);
        },
        onError: (error) => toast.error(error.message),
      },
    );
  };

  const canSubmit = name.trim().length > 0 && members.values.size > 0;

  return (
    <Modal
      open={open}
      onClose={close}
      title="New group"
      description="Name your group and pick its members"
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit} loading={createGroup.isPending}>
            Create group{members.values.size ? ` · ${members.values.size + 1}` : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          id="group-name"
          label="Group name"
          placeholder="e.g. Product team"
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <UserPicker
          multiple
          users={(users.data ?? []).filter((user) => user.id !== me.id)}
          selected={members.values}
          onToggle={members.toggle}
        />
      </div>
    </Modal>
  );
};
