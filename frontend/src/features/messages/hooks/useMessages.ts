import { useInfiniteQuery, type InfiniteData, type QueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { messagesApi } from '@/api/endpoints';
import { POLL, queryKeys } from '@/api/query-keys';
import type { Message, MessagePage } from '@/api/types';
import { useCurrentUser } from '../../session/session-context';

export const PAGE_SIZE = 50;

export type MessagesCache = InfiniteData<MessagePage, string | undefined>;

/**
 * Pages are cached newest-first (page 0 = latest window, page N = oldest
 * loaded). The hook exposes a flat oldest → newest list for rendering.
 */
export const useMessages = (chatId: string) => {
  const me = useCurrentUser();

  const query = useInfiniteQuery({
    queryKey: queryKeys.messages(chatId),
    queryFn: ({ pageParam }) =>
      messagesApi.list(chatId, { userId: me.id, limit: PAGE_SIZE, before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.hasMore ? (page.nextCursor ?? undefined) : undefined),
    refetchInterval: POLL.messages,
  });

  const messages = useMemo(() => {
    const seen = new Set<string>();
    return [...(query.data?.pages ?? [])]
      .reverse()
      .flatMap((page) => page.messages)
      .filter((message) => !seen.has(message.id) && seen.add(message.id));
  }, [query.data]);

  return { ...query, messages };
};

/** Apply an update to every cached page of a chat's messages. */
export const updateCachedMessages = (
  queryClient: QueryClient,
  chatId: string,
  update: (messages: Message[], pageIndex: number) => Message[],
) => {
  queryClient.setQueryData<MessagesCache>(queryKeys.messages(chatId), (cache) =>
    cache
      ? {
          ...cache,
          pages: cache.pages.map((page, index) => ({
            ...page,
            messages: update(page.messages, index),
          })),
        }
      : cache,
  );
};

export const replaceCachedMessage = (queryClient: QueryClient, chatId: string, message: Message) =>
  updateCachedMessages(queryClient, chatId, (messages) =>
    messages.map((existing) => (existing.id === message.id ? message : existing)),
  );
