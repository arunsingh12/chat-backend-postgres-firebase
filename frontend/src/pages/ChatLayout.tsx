import { Outlet, useParams } from 'react-router';
import { ChatSidebar } from '@/features/chats/components/ChatSidebar';
import { cn } from '@/lib/cn';

/** Two-pane layout; on mobile only one pane is visible at a time. */
export const ChatLayout = () => {
  const { chatId } = useParams();

  return (
    <div className="flex h-dvh p-0 lg:p-4">
      <div className="flex min-h-0 w-full overflow-hidden bg-white lg:rounded-3xl lg:shadow-soft lg:ring-1 lg:ring-slate-200/60">
        <div
          className={cn(
            'w-full shrink-0 border-r border-slate-200/70 md:block md:w-80 lg:w-[22rem]',
            chatId ? 'hidden' : 'block',
          )}
        >
          <ChatSidebar />
        </div>
        <main className={cn('min-w-0 flex-1 bg-slate-50', chatId ? 'block' : 'hidden md:block')}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
