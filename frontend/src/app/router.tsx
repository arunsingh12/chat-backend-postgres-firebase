import { Navigate, createBrowserRouter } from 'react-router';
import { GuestOnly, RequireAuth } from './guards';

/**
 * Pages are code-split with React Router's `lazy`, so the login screen does
 * not download the chat UI (and vice versa).
 */
export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [
      {
        path: '/login',
        lazy: async () => ({ Component: (await import('@/pages/LoginPage')).LoginPage }),
      },
      {
        path: '/register',
        lazy: async () => ({ Component: (await import('@/pages/RegisterPage')).RegisterPage }),
      },
    ],
  },
  {
    path: '/chats',
    element: <RequireAuth />,
    children: [
      {
        lazy: async () => ({ Component: (await import('@/pages/ChatLayout')).ChatLayout }),
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/pages/ChatIndexPage')).ChatIndexPage,
            }),
          },
          {
            path: ':chatId',
            lazy: async () => ({ Component: (await import('@/pages/ChatPage')).ChatPage }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/chats" replace /> },
]);
