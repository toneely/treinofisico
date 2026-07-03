-- =============================================================================
-- MIGRATION V8.0: MERCADO PAGO INTEGRATION (SUBSCRIPTIONS)
-- =============================================================================

-- Add subscription-related columns to the 'usuarios' table
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS status_assinatura TEXT DEFAULT 'free';
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_vencimento TIMESTAMP WITH TIME ZONE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS mp_customer_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS mp_subscription_id TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS solicitou_exclusao BOOLEAN DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS testador_pagamento BOOLEAN DEFAULT FALSE;
