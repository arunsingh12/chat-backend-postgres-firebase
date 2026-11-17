import { MessagesSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCurrentUser } from '@/features/session/session-context';

export const ChatIndexPage = () => {
  const me = useCurrentUser();
  return (
    <EmptyState
      className="chat-backdrop h-full"
      icon={<MessagesSquare className="size-6" />}
      title={`Welcome, ${me.displayName.split(' ')[0]}`}
      description="Pick a conversation on the left, or start a new one. Messages, read receipts and last-seen update live."
    />
  );
};
