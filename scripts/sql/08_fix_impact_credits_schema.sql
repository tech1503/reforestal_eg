-- ============================================================
-- SQL MÍNIMO: Alinear impact_credits con emit_ic / spend_ic
-- Fuente: Fase 2 (07_atomic_economy.sql) opera con balance/updated_at
-- ============================================================
ALTER TABLE public.impact_credits
  ADD COLUMN IF NOT EXISTS balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Index para lectura rápida del saldo atómico
CREATE INDEX IF NOT EXISTS idx_impact_credits_balance ON public.impact_credits(user_id, updated_at);
