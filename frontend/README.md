# Chat Frontend: React + Vite + Tailwind

Web client for the chat API (`chat-backend` repository). Users register with their name, email and
password, log in, and chat 1:1 or in groups with anyone registered on the site.

**Stack:** React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · TanStack Query · React Router

```
src/
├── api/          Typed HTTP client (token header, error mapping), endpoints, query keys
├── app/          Providers, router, route guards (RequireAuth / GuestOnly)
├── components/   Reusable UI kit (Avatar, Button, Input, PasswordInput, Modal, …)
├── features/
│   ├── auth/     Auth layout, form error mapping
│   ├── session/  Logged-in user, login / register / logout
│   ├── users/    Registered users directory
│   ├── chats/    Chat list, new chat / group dialogs, group settings
│   └── messages/ Message list, bubbles, composer, read receipts, last-seen tracking
├── hooks/        Generic hooks
├── lib/          Formatting and storage helpers
└── pages/        Login, Register, Chat layout and conversation screens
```

## Features

- **Register** (full name, email, password with confirmation) and **log in**, with field-level
  validation that mirrors the API. The session persists across reloads, and an expired token logs
  you out automatically.
- Chat list sorted by activity, search, and new 1:1 chats or groups with any registered user.
- **Optimistic sending**: a message appears instantly and is swapped for the server copy.
- ✓ sent / ✓✓ read by some / blue ✓✓ read by everyone, plus "seen" avatars at each member's
  last-seen message. Read receipts are only sent while the tab is visible.
- Scroll back through older history without the view jumping, edit and delete your own messages,
  and manage groups (rename, add or remove members, leave).
- Responsive layout down to mobile.

Updates arrive by polling every few seconds. To make them instant, replace polling with Firestore
listeners or websockets, with no change to the API.

## Quick start

**Requirements:** Node.js ≥ 20 and the backend running (default `http://localhost:4000`).

```bash
npm install
npm run setup     # creates .env from .env.example
npm run dev       # http://localhost:5173
```

| Variable       | Default                 | Purpose             |
| -------------- | ----------------------- | ------------------- |
| `VITE_API_URL` | `http://localhost:4000` | Base URL of the API |

### Scripts

| Command             | What it does                   |
| ------------------- | ------------------------------ |
| `npm run dev`       | Dev server with hot reload     |
| `npm run typecheck` | Type-check app and Vite config |
| `npm run lint`      | ESLint                         |
| `npm run build`     | Production build to `dist/`    |
| `npm run preview`   | Serve the production build     |

## Deploy on Netlify

1. Push this repository to GitHub.
2. Netlify → **Add new site → Import an existing project** → pick the repository.
   [`netlify.toml`](netlify.toml) already sets the build command, the `dist` publish folder, SPA
   redirects and security headers.
3. **Site configuration → Environment variables**: set `VITE_API_URL` to the deployed API, e.g.
   `https://chat-api.onrender.com`, then redeploy. Vite bakes the value in at build time.
4. Add the Netlify URL to the backend's `CORS_ORIGIN`.
