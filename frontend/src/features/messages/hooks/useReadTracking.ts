import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { messagesApi } from '@/api/endpoints';
import { POLL, queryKeys } from '@/api/query-keys';
import type { Message } from '@/api/types';
import { usePageVisible } from '@/hooks/usePageVisible';
import { useCurrentUser } from '../../session/session-context';
import { replaceCachedMessage } from './useMessages';

export const useLastSeen = (chatId: string) =>
  useQuery({
    queryKey: queryKeys.lastSeen(chatId),
    queryFn: () => messagesApi.lastSeen(chatId),
    refetchInterval: POLL.lastSeen,
  });

/**
 * While the conversation is on screen:
 *  1. send a read receipt for every message from someone else that I haven't read;
 *  2. move my "last seen" pointer to the newest message.
 * Refs de-duplicate requests across the polling re-renders.
 */
export const useReadTracking = (chatId: string, messages: Message[]) => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  const visible = usePageVisible();
  const requestedReads = useRef(new Set<string>());
  const reportedLastSeen = useRef<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    const unread = messages.filter(
      (message) =>
        !message.pending &&
        !message.deletedAt &&
        message.senderId !== me.id &&
        !message.readBy[me.id] &&
        !requestedReads.current.has(message.id),
    );

    for (const message of unread) {
      requestedReads.current.add(message.id);
      messagesApi
        .markRead(chatId, message.id, me.id)
        .then((updated) => replaceCachedMessage(queryClient, chatId, updated))
        .catch(() => requestedReads.current.delete(message.id));
    }

    const newest = messages.findLast((message) => !message.pending);
    if (newest && reportedLastSeen.current !== newest.id) {
      reportedLastSeen.current = newest.id;
      messagesApi
        .updateLastSeen(chatId, me.id, newest.id)
        .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.lastSeen(chatId) }))
        .catch(() => {
          reportedLastSeen.current = null;
        });
    }
  }, [chatId, me.id, messages, queryClient, visible]);
};
