-- ===========================================
-- Payments Schema
-- Execute this SQL in the Supabase SQL Editor
-- ===========================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  voucher_type_id UUID REFERENCES voucher_types(id) NOT NULL,

  -- Asaas fields
  asaas_payment_id TEXT UNIQUE,
  asaas_customer_id TEXT,

  billing_type TEXT NOT NULL CHECK (billing_type IN ('PIX', 'CREDIT_CARD')),
  value NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'AWAITING_PAYMENT',
    'CONFIRMED',
    'RECEIVED',
    'FAILED',
    'REFUNDED'
  )),

  -- PIX specific
  pix_encoded_image TEXT,
  pix_payload TEXT,
  pix_expiration_date TIMESTAMPTZ,

  -- Credit card specific
  credit_card_token TEXT,

  -- Voucher link (populated after payment confirmed)
  voucher_id UUID REFERENCES vouchers(id),

  -- Metadata
  asaas_webhook_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_asaas_payment_id ON payments(asaas_payment_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- RLS (permissive for MVP)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on payments" ON payments FOR ALL USING (true) WITH CHECK (true);

-- Add payment_id to vouchers
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id);
