# Chat Backend: Node.js + PostgreSQL + Firebase Firestore

REST API for a 1:1 and group chat, written in **Node.js + TypeScript (strict)**.

- **PostgreSQL** stores users, chats and memberships (relational data with integrity constraints).
- **Firebase Firestore** stores messages, read receipts and per-user last-seen pointers (high-write, append-heavy data).
- **Email + password authentication** (scrypt + JWT). Every chat endpoint acts as the logged-in user.

The web client lives in a separate repository (`chat-frontend`).

```
.
├── src/
│   ├── config/         Env validation (zod) and fail-fast startup
│   ├── lib/            Postgres pool + transactions, Firestore admin, password hashing, logger
│   ├── common/         AppError, typed request handler, auth + error middleware
│   ├── db/             SQL migrations, migration runner, seed
│   ├── modules/
│   │   ├── auth/       register · login · me (scrypt + JWT)
│   │   ├── users/      routes → controller → service → repository (Postgres)
│   │   ├── chats/      routes → controller → service → repository (Postgres)
│   │   ├── messages/   controller → service → repository (Firestore)
│   │   └── health/     liveness + readiness probes
│   ├── container.ts    Composition root (dependency injection)
│   ├── app.ts          Express app factory
│   └── server.ts       Bootstrap + graceful shutdown
├── tests/              API tests with in-memory repositories (Vitest + Supertest)
├── docker-compose.yml  PostgreSQL + Firestore emulator for local development
├── firestore.rules     Denies direct client access (only the API writes)
└── render.yaml         Render deployment blueprint
```

---

## Quick start

**Requirements:** Node.js ≥ 20, plus Docker or your own PostgreSQL + Firebase project.
Run each command on its own line. They work the same in PowerShell, cmd and bash.

```bash
npm install
docker compose up -d      # PostgreSQL on :5432, Firestore emulator on :8080
npm run setup             # creates .env from .env.example (defaults match docker compose)
npm run db:setup          # migrations + demo users
npm run dev               # http://localhost:4000
```

Demo accounts: `aarav@example.com`, `priya@example.com`, `rohan@example.com`, `sara@example.com`,
`vikram@example.com`, all with password `Password123`.

### Without Docker

1. **PostgreSQL:** install PostgreSQL 14+, create a database and set `DATABASE_URL` in `.env`,
   e.g. `postgres://postgres:<password>@localhost:5432/chat`.
2. **Firestore:** use a real Firebase project. Remove `FIRESTORE_EMULATOR_HOST` from `.env` and
   either set `GOOGLE_APPLICATION_CREDENTIALS=./service-account.json` or provide
   `FIREBASE_CLIENT_EMAIL` and `FIREBASE_PRIVATE_KEY`. Deploy `firestore.rules`.

### Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | API with hot reload                         |
| `npm test`           | Test suite (no infrastructure needed)       |
| `npm run typecheck`  | `tsc --noEmit`                              |
| `npm run lint`       | ESLint                                      |
| `npm run build`      | Compile to `dist/`                          |
| `npm run start:prod` | Run migrations, then start the compiled API |
| `npm run db:migrate` | Apply pending SQL migrations                |
| `npm run db:seed`    | Insert demo users                           |

---

## Deploy on Render

1. Push this repository to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repository. [`render.yaml`](render.yaml)
   creates the `chat-api` web service and the `chat-db` PostgreSQL database, generates
   `JWT_SECRET` and wires `DATABASE_URL`. Every deploy runs the migrations before starting.
3. When prompted, fill in the secrets:

   | Variable                | Value                                                      |
   | ----------------------- | ---------------------------------------------------------- |
   | `FIREBASE_PROJECT_ID`   | `project_id` from the Firebase service-account JSON        |
   | `FIREBASE_CLIENT_EMAIL` | `client_email` from the JSON                               |
   | `FIREBASE_PRIVATE_KEY`  | `private_key` from the JSON, including the BEGIN/END lines |
   | `CORS_ORIGIN`           | The frontend URL, e.g. `https://your-site.netlify.app`     |

4. Open `https://<service>.onrender.com/health/ready`. It should report `postgres` and `firestore` as `up`.
5. Optional: seed demo users from the service's **Shell** tab with `node dist/db/seed.js`.

> On the free plan the service sleeps after 15 minutes idle (the first request then takes
> ~30–60 s), and the free database expires after 30 days.

---

## API

All responses use one envelope: `{ "data": … }` on success and
`{ "error": { "code", "message", "details?" } }` on failure. Every input (params, query and body)
is validated with zod, and validation failures return `422 VALIDATION_ERROR` with per-field details.

### Authentication

| Method & path         | Body                        | Result                                                |
| --------------------- | --------------------------- | ----------------------------------------------------- |
| `POST /auth/register` | `{ name, email, password }` | **201** `{ user, token }` · 409 if the email is taken |
| `POST /auth/login`    | `{ email, password }`       | `{ user, token }` · 401 on bad credentials            |
| `GET /auth/me`        | (none)                      | The logged-in user                                    |

Every `/chat/*` and `/user/*` endpoint requires `Authorization: Bearer <token>` (otherwise **401**).
The required endpoints keep their exact inputs (`senderId`, `userId`, …), but the API checks them
against the token: acting as somebody else returns **403**.

### Required endpoints

| #   | Method & path                                | Body / query                    | Result                                                         |
| --- | -------------------------------------------- | ------------------------------- | -------------------------------------------------------------- |
| 1   | `POST /chat/create`                          | `{ userAId, userBId }`          | `{ chatId, created, chat }`: **201** created, **200** existing |
| 2   | `POST /chat/:chatId/message/send`            | `{ senderId, text }`            | The stored message with server timestamp                       |
| 3   | `GET /chat/:chatId/messages`                 | `?limit=50&before=<id>&userId=` | `{ messages (oldest→newest), hasMore, nextCursor }`            |
| 4   | `POST /chat/:chatId/message/:messageId/read` | `{ userId }`                    | The message with its updated `readBy` map                      |
| 5   | `POST /chat/:chatId/lastseen`                | `{ userId, messageId }`         | The user's read state for that chat                            |
| 6   | `GET /user/:userId/chats`                    | (none)                          | Chats with `memberIds`, members and a last-message summary     |

### Bonus endpoints

| Method & path                             | Body                               | Purpose                           |
| ----------------------------------------- | ---------------------------------- | --------------------------------- |
| `POST /chat/group`                        | `{ creatorId, name, memberIds[] }` | Create a group (creator = owner)  |
| `PATCH /chat/:chatId`                     | `{ requesterId, name }`            | Rename group (owner/admin)        |
| `POST /chat/:chatId/members`              | `{ requesterId, userIds[] }`       | Add members (owner/admin)         |
| `DELETE /chat/:chatId/members/:userId`    | `{ requesterId }`                  | Remove a member, or leave         |
| `PATCH /chat/:chatId/message/:messageId`  | `{ senderId, text }`               | Edit own message                  |
| `DELETE /chat/:chatId/message/:messageId` | `{ senderId }`                     | Soft-delete own message           |
| `GET /chat/:chatId/lastseen`              | (none)                             | Last-seen pointers of all members |
| `GET /chat/:chatId`                       | (none)                             | Chat details                      |
| `GET /user` · `GET /user/:userId`         | (none)                             | Registered users (to start chats) |
| `GET /health` · `GET /health/ready`       | (none)                             | Liveness / dependency readiness   |

<details>
<summary>Example requests (curl)</summary>

```bash
API=http://localhost:4000
JSON='content-type: application/json'

# Register two users and keep their ids + tokens
ALICE=$(curl -s $API/auth/register -H "$JSON" -d '{"name":"Alice","email":"alice@test.dev","password":"Secret123"}')
BOB=$(curl -s $API/auth/register -H "$JSON" -d '{"name":"Bob","email":"bob@test.dev","password":"Secret123"}')
A=$(echo $ALICE | jq -r .data.user.id); A_AUTH="Authorization: Bearer $(echo $ALICE | jq -r .data.token)"
B=$(echo $BOB   | jq -r .data.user.id); B_AUTH="Authorization: Bearer $(echo $BOB   | jq -r .data.token)"

CHAT=$(curl -s $API/chat/create -H "$JSON" -H "$A_AUTH" \
  -d "{\"userAId\":\"$A\",\"userBId\":\"$B\"}" | jq -r .data.chatId)

MSG=$(curl -s $API/chat/$CHAT/message/send -H "$JSON" -H "$A_AUTH" \
  -d "{\"senderId\":\"$A\",\"text\":\"Hello Bob!\"}" | jq -r .data.id)

curl -s "$API/chat/$CHAT/messages?limit=50" -H "$B_AUTH" | jq
curl -s $API/chat/$CHAT/message/$MSG/read -H "$JSON" -H "$B_AUTH" -d "{\"userId\":\"$B\"}" | jq
curl -s $API/chat/$CHAT/lastseen -H "$JSON" -H "$B_AUTH" -d "{\"userId\":\"$B\",\"messageId\":\"$MSG\"}" | jq
curl -s $API/user/$A/chats -H "$A_AUTH" | jq
```

</details>

---

## Design decisions

### Data model

**PostgreSQL** ([migrations](src/db/migrations))

- `users`: id (UUID), display name, email (unique, case-insensitive) and a scrypt `password_hash`.
- `chats`: `type` is `direct` or `group`. A `CHECK` constraint enforces the shape of each type
  (direct chats have a `direct_key` and no name; groups have a name). The chat also keeps a
  denormalised **last-message summary** so the chat list renders and sorts in one query.
- `chat_members`: composite PK `(chat_id, user_id)` and a `role` (`owner` / `admin` / `member`),
  indexed by `user_id` for "list my chats".

**Firestore**

```
chats/{chatId}/messages/{messageId}
  { chatId, senderId, text, createdAt, updatedAt, editedAt, deletedAt,
    readBy: { [userId]: Timestamp } }

chats/{chatId}/readStates/{userId}
  { userId, lastSeenMessageId, lastSeenMessageAt, updatedAt }
```

### Key behaviours

- **Authentication.** Passwords are hashed with Node's built-in **scrypt** (random salt per user,
  constant-time comparison) and never returned by the API. Login issues a signed **JWT** (HS256,
  7-day expiry by default). Login answers "Invalid email or password" whether the email exists or
  not, so accounts can't be discovered, and register/login are rate-limited against brute force.
- **The token is the identity.** The task's endpoints take the acting user in the payload. That
  contract is kept, but each id is checked against the token, so nobody can send, read or mark
  messages as someone else.
- **Race-free 1:1 create-or-get.** `direct_key = sort(userA, userB).join(':')` has a unique index.
  The insert uses `ON CONFLICT DO NOTHING` inside a transaction, so concurrent requests for the same
  pair always resolve to one chat, whatever the argument order. Self-chats are rejected.
- **Ordering.** `createdAt` is a Firestore **server timestamp**, so client clock skew can't reorder
  messages. Pages are queried newest-first (`orderBy(createdAt desc).limit(n+1)`), so `limit` always
  returns the latest window. Each page is returned oldest→newest with a `nextCursor` for loading
  older history (`?before=`).
- **Read receipts** are a `readBy` map on the message, written in a transaction with a `FieldPath`
  so the first read time is kept (idempotent). The sender's own receipt is set when the message is sent.
- **Last seen is monotonic.** A transaction compares message timestamps, so a late request from an
  old tab can never move the pointer backwards.
- **Authorization by membership.** Every request checks chat membership in PostgreSQL first: unknown
  chat → 404, non-member → 403. Only the sender can edit or delete a message, and deletes are soft.
  Group management requires the owner or admin role, and the owner can't be removed.
- **Source of truth.** Firestore owns messages. The Postgres last-message summary is best-effort:
  if it fails to update, the send still succeeds and the failure is logged. Its `UPDATE` is guarded
  so an out-of-order write can't move it backwards.

### Code quality

- Layered modules (routes → controller → service → repository). Services depend on repository
  **interfaces**, wired in [`container.ts`](src/container.ts). Production uses Postgres/Firestore.
  Tests use in-memory fakes, so the suite runs without any infrastructure.
- A typed `handler()` helper validates params, query and body with zod and passes fully inferred
  types to controllers, with no `any` and no manual casting in route code.
- Fail-fast env validation, structured logging (pino), helmet, CORS allow-list, rate limiting,
  `/health/ready` probes and graceful shutdown.

### Next steps

Refresh tokens with httpOnly cookies, email verification and password reset, push notifications,
typing indicators, attachments, and integration tests against the Firestore emulator in CI.
