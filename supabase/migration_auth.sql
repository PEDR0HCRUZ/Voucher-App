-- ===========================================
-- Auth Schema - Users table
-- Execute this SQL in the Supabase SQL Editor
-- ===========================================

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  login_id VARCHAR(8) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cliente', 'validador')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast login_id lookups
CREATE INDEX IF NOT EXISTS idx_users_login_id ON users(login_id);

-- Index for email uniqueness checks
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ===========================================
-- Add user_id and validated_by to vouchers
-- ===========================================

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES users(id);

-- Index for "my vouchers" queries
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers(user_id);

-- ===========================================
-- RLS Policies (permissive for MVP)
-- ===========================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
