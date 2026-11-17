import { useQuery } from '@tanstack/react-query';
import { usersApi } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';

/** Everyone registered on the site: the people you can start a chat with. */
export const useUsers = () =>
  useQuery({ queryKey: queryKeys.users, queryFn: usersApi.list, staleTime: 30_000 });
