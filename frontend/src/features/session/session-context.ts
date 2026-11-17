import { createContext, useContext } from 'react';
import type { User } from '@/api/types';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface SessionValue {
  user: User | null;
  /** True while a stored token is being exchanged for the current user. */
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => void;
}

export const SessionContext = createContext<SessionValue | null>(null);

export const useSession = (): SessionValue => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
};

/** For screens that are only reachable when logged in (guarded by the router). */
export const useCurrentUser = (): User => {
  const { user } = useSession();
  if (!user) throw new Error('useCurrentUser called without an active session');
  return user;
};
