import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatsApi, usersApi } from '@/api/endpoints';
import { POLL, queryKeys } from '@/api/query-keys';
import type { Chat } from '@/api/types';
import { useCurrentUser } from '../session/session-context';

export const useUserChats = () => {
  const me = useCurrentUser();
  return useQuery({
    queryKey: queryKeys.userChats(me.id),
    queryFn: () => usersApi.chats(me.id),
    refetchInterval: POLL.chats,
  });
};

export const useChat = (chatId: string) => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.chat(chatId),
    queryFn: () => chatsApi.get(chatId, me.id),
    // Paint instantly from the sidebar list while the detail request runs.
    initialData: () =>
      queryClient
        .getQueryData<Chat[]>(queryKeys.userChats(me.id))
        ?.find((chat) => chat.id === chatId),
    refetchInterval: POLL.chats,
    retry: (count, error) => count < 2 && !('status' in error && error.status === 403),
  });
};

/** Writes a fresh chat into both the detail cache and the sidebar list. */
const useSyncChat = () => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  return (chat: Chat) => {
    queryClient.setQueryData(queryKeys.chat(chat.id), chat);
    queryClient.setQueryData<Chat[]>(queryKeys.userChats(me.id), (chats = []) => {
      const stillMember = chat.memberIds.includes(me.id);
      const rest = chats.filter((existing) => existing.id !== chat.id);
      return stillMember ? [chat, ...rest] : rest;
    });
  };
};

export const useCreateDirectChat = () => {
  const me = useCurrentUser();
  const sync = useSyncChat();
  return useMutation({
    mutationFn: (otherUserId: string) => chatsApi.createDirect(me.id, otherUserId),
    onSuccess: ({ chat }) => sync(chat),
  });
};

export const useCreateGroup = () => {
  const me = useCurrentUser();
  const sync = useSyncChat();
  return useMutation({
    mutationFn: (input: { name: string; memberIds: string[] }) =>
      chatsApi.createGroup({ creatorId: me.id, ...input }),
    onSuccess: ({ chat }) => sync(chat),
  });
};

export const useGroupActions = (chatId: string) => {
  const me = useCurrentUser();
  const sync = useSyncChat();

  return {
    rename: useMutation({
      mutationFn: (name: string) => chatsApi.rename(chatId, me.id, name),
      onSuccess: sync,
    }),
    addMembers: useMutation({
      mutationFn: (userIds: string[]) => chatsApi.addMembers(chatId, me.id, userIds),
      onSuccess: sync,
    }),
    removeMember: useMutation({
      mutationFn: (userId: string) => chatsApi.removeMember(chatId, me.id, userId),
      onSuccess: sync,
    }),
  };
};
