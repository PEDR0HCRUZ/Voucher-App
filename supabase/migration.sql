-- ===========================================
-- Voucher App - Database Schema
-- Execute this SQL in the Supabase SQL Editor
-- ===========================================

-- Table: voucher_types
CREATE TABLE IF NOT EXISTS voucher_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  value NUMERIC(10, 2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Table: vouchers
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  voucher_type_id UUID REFERENCES voucher_types(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used')) NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);

-- =====================
-- Insert 3 mock voucher types
-- =====================
INSERT INTO voucher_types (name, description, value, image_url) VALUES
  ('Almoço Executivo', 'Voucher válido para um almoço executivo completo no restaurante parceiro.', 45.00, null),
  ('Café & Lanche', 'Voucher para café da manhã ou lanche da tarde na cafeteria.', 25.00, null),
  ('Jantar Premium', 'Experiência gastronômica premium com entrada, prato principal e sobremesa.', 120.00, null);

-- =====================
-- RLS (Row Level Security) - disable for MVP
-- =====================
ALTER TABLE voucher_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anonymous users (MVP only - restrict in production!)
CREATE POLICY "Allow all on voucher_types" ON voucher_types FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on vouchers" ON vouchers FOR ALL USING (true) WITH CHECK (true);
