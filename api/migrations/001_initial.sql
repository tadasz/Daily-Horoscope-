-- Users
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  birth_date      DATE NOT NULL,
  birth_time      TIME,
  birth_city      TEXT,
  birth_lat       DECIMAL(9,6),
  birth_lng       DECIMAL(9,6),
  timezone        TEXT DEFAULT 'UTC',
  natal_chart     JSONB,
  sun_sign        TEXT,
  moon_sign       TEXT,
  rising_sign     TEXT,
  focus_area      TEXT,
  initial_context TEXT,
  profile_notes   TEXT DEFAULT '',
  raw_context     JSONB DEFAULT '[]',
  subscription    TEXT DEFAULT 'free',
  creem_customer_id TEXT,
  subscribed      BOOLEAN DEFAULT TRUE,
  unsub_token     UUID DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Sent emails
CREATE TABLE IF NOT EXISTS emails_sent (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ DEFAULT NOW(),
  email_type      TEXT DEFAULT 'daily',
  subject         TEXT,
  body_text       TEXT,
  question_asked  TEXT,
  transit_summary TEXT,
  sweego_id       TEXT
);

-- Inbound replies
CREATE TABLE IF NOT EXISTS replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  email_id        UUID REFERENCES emails_sent(id),
  reply_text      TEXT NOT NULL,
  ai_followup     TEXT,
  key_insight     TEXT,
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscribed ON users(subscribed) WHERE subscribed = TRUE;
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails_sent(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_user ON replies(user_id, received_at DESC);
