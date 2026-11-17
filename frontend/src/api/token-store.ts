import { storage } from '@/lib/storage';

const TOKEN_KEY = 'converse.token';

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/**
 * Single place that owns the access token. The HTTP client reads it for every
 * request and reports 401s here; the session provider reacts by logging out.
 */
export const tokenStore = {
  get: () => storage.get(TOKEN_KEY),
  set: (token: string) => storage.set(TOKEN_KEY, token),
  clear: () => storage.set(TOKEN_KEY, null),

  onUnauthorized(listener: Listener) {
    unauthorizedListeners.add(listener);
    return () => {
      unauthorizedListeners.delete(listener);
    };
  },
  notifyUnauthorized() {
    unauthorizedListeners.forEach((listener) => listener());
  },
};
