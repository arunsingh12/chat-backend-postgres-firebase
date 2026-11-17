-- Users, chats and memberships live in PostgreSQL.
-- Messages, read receipts and last-seen pointers live in Firestore.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  TEXT        NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  email         TEXT        UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chats (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                    TEXT        NOT NULL CHECK (type IN ('direct', 'group')),
  name                    TEXT        CHECK (name IS NULL OR char_length(name) BETWEEN 1 AND 80),
  -- Deterministic "<smallerUserId>:<largerUserId>" key. The unique index makes
  -- create-or-get for 1:1 chats race-free without application-level locking.
  direct_key              TEXT        UNIQUE,
  created_by              UUID        NOT NULL REFERENCES users (id),
  last_message_id         TEXT,
  last_message_preview    TEXT,
  last_message_sender_id  UUID        REFERENCES users (id) ON DELETE SET NULL,
  last_message_at         TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chats_shape_check CHECK (
    (type = 'direct' AND direct_key IS NOT NULL AND name IS NULL)
    OR (type = 'group' AND direct_key IS NULL AND name IS NOT NULL)
  )
);

CREATE TABLE chat_members (
  chat_id    UUID        NOT NULL REFERENCES chats (id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role       TEXT        NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chat_id, user_id)
);

-- "List chats for user" walks memberships by user first.
CREATE INDEX chat_members_user_id_idx ON chat_members (user_id);
CREATE INDEX chats_activity_idx ON chats (COALESCE(last_message_at, created_at) DESC);
