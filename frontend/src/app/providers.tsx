import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '@/api/http';
import { SessionProvider } from '@/features/session/SessionProvider';

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        // Client errors (4xx) won't fix themselves on retry.
        retry: (count, error) =>
          count < 2 && !(error instanceof ApiError && error.status && error.status < 500),
      },
    },
  });

export const AppProviders = ({ children }: { children: ReactNode }) => {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>{children}</SessionProvider>
      <Toaster position="top-center" richColors closeButton />
    </QueryClientProvider>
  );
};
