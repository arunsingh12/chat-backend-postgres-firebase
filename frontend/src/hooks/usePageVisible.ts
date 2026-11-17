import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => {
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('focus', onChange);
  return () => {
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('focus', onChange);
  };
};

/** True while the tab is in the foreground (used to gate read receipts). */
export const usePageVisible = () =>
  useSyncExternalStore(subscribe, () => document.visibilityState === 'visible');
