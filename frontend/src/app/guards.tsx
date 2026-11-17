import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '@/components/ui/Spinner';
import { useSession } from '@/features/session/session-context';

const FullScreenSpinner = () => (
  <div className="flex h-dvh items-center justify-center text-brand-600">
    <Spinner className="size-6" />
  </div>
);

/** Only for logged-in users; remembers where you were going. */
export const RequireAuth = () => {
  const { user, isLoading } = useSession();
  const location = useLocation();
  if (isLoading) return <FullScreenSpinner />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: location.pathname }} />;
};

/** Login / register screens: skip them when already logged in. */
export const GuestOnly = () => {
  const { user, isLoading } = useSession();
  if (isLoading) return <FullScreenSpinner />;
  return user ? <Navigate to="/chats" replace /> : <Outlet />;
};
