import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { messagesApi } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import type { Message } from '@/api/types';
import { useCurrentUser } from '../../session/session-context';
import { replaceCachedMessage, updateCachedMessages } from './useMessages';

/** Optimistic send: the bubble appears instantly and is swapped for the server copy. */
export const useSendMessage = (chatId: string) => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (text: string) => messagesApi.send(chatId, me.id, text),

    onMutate: async (text) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.messages(chatId) });
      const now = new Date().toISOString();
      const optimistic: Message = {
        id: `temp-${crypto.randomUUID()}`,
        chatId,
        senderId: me.id,
        text,
        createdAt: now,
        updatedAt: now,
        editedAt: null,
        deletedAt: null,
        readBy: { [me.id]: now },
        pending: true,
      };
      updateCachedMessages(queryClient, chatId, (messages, page) =>
        page === 0 ? [...messages, optimistic] : messages,
      );
      return { tempId: optimistic.id };
    },

    onSuccess: (message, _text, context) => {
      updateCachedMessages(queryClient, chatId, (messages) =>
        messages.map((existing) => (existing.id === context?.tempId ? message : existing)),
      );
    },

    onError: (error, _text, context) => {
      updateCachedMessages(queryClient, chatId, (messages) =>
        messages.filter((existing) => existing.id !== context?.tempId),
      );
      toast.error(`Message not sent: ${error.message}`);
    },

    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.userChats(me.id) }),
  });
};

export const useEditMessage = (chatId: string) => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, text }: { messageId: string; text: string }) =>
      messagesApi.edit(chatId, messageId, me.id, text),
    onSuccess: (message) => {
      replaceCachedMessage(queryClient, chatId, message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.userChats(me.id) });
    },
    onError: (error) => toast.error(error.message),
  });
};

export const useDeleteMessage = (chatId: string) => {
  const me = useCurrentUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => messagesApi.remove(chatId, messageId, me.id),
    onSuccess: (message) => {
      replaceCachedMessage(queryClient, chatId, message);
      void queryClient.invalidateQueries({ queryKey: queryKeys.userChats(me.id) });
    },
    onError: (error) => toast.error(error.message),
  });
};
