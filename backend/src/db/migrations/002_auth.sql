-- Email + password authentication.

ALTER TABLE users ADD COLUMN password_hash TEXT;

-- Every account signs in with an email, so it becomes mandatory.
ALTER TABLE users ALTER COLUMN email SET NOT NULL;

-- Emails are compared case-insensitively ("Ann@x.com" and "ann@x.com" are one account).
CREATE UNIQUE INDEX users_email_lower_idx ON users (lower(email));
