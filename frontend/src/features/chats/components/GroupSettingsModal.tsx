import { Crown, LogOut, UserMinus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import type { Chat } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { UserPicker } from '@/components/ui/UserPicker';
import { useToggleSet } from '@/hooks/useToggleSet';
import { useCurrentUser } from '../../session/session-context';
import { useUsers } from '../../users/hooks';
import { canManageGroup } from '../chat-utils';
import { useGroupActions } from '../hooks';

interface GroupSettingsModalProps {
  chat: Chat;
  open: boolean;
  onClose: () => void;
}

export const GroupSettingsModal = ({ chat, open, onClose }: GroupSettingsModalProps) => {
  const me = useCurrentUser();
  const navigate = useNavigate();
  const users = useUsers();
  const actions = useGroupActions(chat.id);
  const isManager = canManageGroup(chat, me.id);
  const isOwner = chat.members.some((m) => m.userId === me.id && m.role === 'owner');

  const [name, setName] = useState(chat.name ?? '');
  const [adding, setAdding] = useState(false);
  const toAdd = useToggleSet();

  const onError = (error: Error) => toast.error(error.message);

  const saveName = () => {
    if (!name.trim() || name.trim() === chat.name) return;
    actions.rename.mutate(name.trim(), {
      onSuccess: () => toast.success('Group renamed'),
      onError,
    });
  };

  const addSelected = () => {
    actions.addMembers.mutate([...toAdd.values], {
      onSuccess: () => {
        toAdd.clear();
        setAdding(false);
      },
      onError,
    });
  };

  const leave = () => {
    actions.removeMember.mutate(me.id, {
      onSuccess: () => {
        onClose();
        navigate('/chats');
        toast.success(`You left “${chat.name}”`);
      },
      onError,
    });
  };

  const candidates = (users.data ?? []).filter((user) => !chat.memberIds.includes(user.id));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={adding ? 'Add members' : 'Group settings'}
      description={adding ? undefined : `${chat.members.length} members`}
      footer={
        adding ? (
          <>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Back
            </Button>
            <Button
              onClick={addSelected}
              disabled={toAdd.values.size === 0}
              loading={actions.addMembers.isPending}
            >
              Add {toAdd.values.size || ''}
            </Button>
          </>
        ) : undefined
      }
    >
      {adding ? (
        <UserPicker
          multiple
          users={candidates}
          selected={toAdd.values}
          onToggle={toAdd.toggle}
          emptyLabel="Everyone is already in this group"
        />
      ) : (
        <div className="space-y-6 pb-3">
          {isManager ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input
                  id="rename-group"
                  label="Group name"
                  value={name}
                  maxLength={80}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && saveName()}
                />
              </div>
              <Button
                variant="secondary"
                onClick={saveName}
                loading={actions.rename.isPending}
                disabled={!name.trim() || name.trim() === chat.name}
              >
                Save
              </Button>
            </div>
          ) : null}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Members
              </h3>
              {isManager ? (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
                  <UserPlus className="size-4" /> Add
                </Button>
              ) : null}
            </div>
            <ul className="-mx-2">
              {chat.members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50"
                >
                  <Avatar name={member.displayName} seed={member.userId} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                    {member.displayName}
                    {member.userId === me.id ? (
                      <span className="text-slate-400"> (you)</span>
                    ) : null}
                  </span>
                  {member.role !== 'member' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium capitalize text-amber-700">
                      <Crown className="size-3" /> {member.role}
                    </span>
                  ) : null}
                  {isManager && member.role !== 'owner' && member.userId !== me.id ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Remove ${member.displayName}`}
                      aria-label={`Remove ${member.displayName}`}
                      onClick={() => actions.removeMember.mutate(member.userId, { onError })}
                    >
                      <UserMinus className="size-4" />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          {!isOwner ? (
            <Button
              variant="secondary"
              className="w-full justify-center text-rose-600"
              onClick={leave}
              loading={actions.removeMember.isPending}
            >
              <LogOut className="size-4" /> Leave group
            </Button>
          ) : null}
        </div>
      )}
    </Modal>
  );
};
