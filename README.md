# Chat App: Node.js + PostgreSQL + Firebase, with a React client

A 1:1 and group chat. Users register with name, email and password, then chat with anyone
registered on the site.

| Part                    | Stack                                                                     | Hosting | Docs                                     |
| ----------------------- | ------------------------------------------------------------------------- | ------- | ---------------------------------------- |
| [`backend/`](backend)   | Node.js · TypeScript (strict) · Express · PostgreSQL · Firebase Firestore | Render  | [backend/README.md](backend/README.md)   |
| [`frontend/`](frontend) | React 19 · TypeScript · Vite · Tailwind CSS · TanStack Query              | Netlify | [frontend/README.md](frontend/README.md) |

## Live demo

- **Web app:** https://chat-codefor-test.netlify.app
- **API health:** https://chat-api-vdyg.onrender.com/health/ready

> The API runs on Render's free plan and sleeps when idle. The first request can take ~30–60 s.

## What's implemented

**Required APIs**

1. `POST /chat/create`: create or get a 1:1 chat (race-free, order-independent)
2. `POST /chat/:chatId/message/send`: store a message in Firestore with a server timestamp
3. `GET /chat/:chatId/messages?limit=50`: messages ordered by timestamp, with cursor pagination
4. `POST /chat/:chatId/message/:messageId/read`: idempotent read receipt in Firestore
5. `POST /chat/:chatId/lastseen`: per-user last-seen pointer in Firestore (never moves backwards)
6. `GET /user/:userId/chats`: the user's chats with member ids, from PostgreSQL

**Bonus:** group chats (roles, rename, add/remove members, leave), message edit and soft delete,
email/password authentication (scrypt + JWT) where the token is checked against the acting user.

**Storage split:** users, chats and memberships live in PostgreSQL. Messages, read receipts and
last-seen live in Firestore.

## Run locally

```bash
# API: http://localhost:4000
cd backend
npm install
npm run setup        # creates .env (needs PostgreSQL + Firebase, see backend/README.md)
npm run db:setup     # migrations + demo users
npm run dev
```

```bash
# Web app: http://localhost:5173
cd frontend
npm install
npm run setup
npm run dev
```

Demo accounts (after `db:setup`): `aarav@example.com`, `priya@example.com`, … with password `Password123`.
