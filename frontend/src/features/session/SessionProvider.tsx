import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '@/api/endpoints';
import { queryKeys } from '@/api/query-keys';
import { tokenStore } from '@/api/token-store';
import type { AuthResult } from '@/api/types';
import { SessionContext, type RegisterInput, type SessionValue } from './session-context';

/**
 * Owns the logged-in user. A JWT is kept in localStorage; on load it is
 * exchanged for the user via GET /auth/me. Any 401 from the API logs out.
 */
export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStore.get());

  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: token !== null,
    staleTime: Infinity,
    retry: false,
  });

  const logout = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => tokenStore.onUnauthorized(logout), [logout]);

  const startSession = useCallback(
    ({ user, token: newToken }: AuthResult) => {
      queryClient.clear();
      tokenStore.set(newToken);
      queryClient.setQueryData(queryKeys.me, user);
      setToken(newToken);
      return user;
    },
    [queryClient],
  );

  const login = useCallback(
    async (email: string, password: string) =>
      startSession(await authApi.login({ email, password })),
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => startSession(await authApi.register(input)),
    [startSession],
  );

  const value = useMemo<SessionValue>(
    () => ({
      user: token ? (me.data ?? null) : null,
      isLoading: token !== null && me.isPending,
      login,
      register,
      logout,
    }),
    [token, me.data, me.isPending, login, register, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};
