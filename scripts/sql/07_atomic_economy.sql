-- ============================================================
-- 06_atomic_economy.sql
-- FASE 2 - Economía Atómica (Zero-Trust Frontend)
-- Rama: feat/strip-startnext
--
-- Objetivo: blindar la economía de Impact Credits (IC) con
-- operaciones atómicas en el backend (Supabase / Postgres) y
-- eliminar condiciones de carrera (TOCTOU) en emisión, gasto
-- y procesamiento de compras.
--
-- Ajustes de nombres reales de la BD Reforestal:
--   - Créditos:   public.impact_credits
--   - Historial:  public.ic_ledger
--   - Compras:    public.user_purchases
--   - Perfiles:   public.profiles
-- ============================================================

-- ------------------------------------------------------------
-- 0) Tablas de soporte (idempotentes)
--    El ledger de impact credits se centraliza aquí.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ic_ledger (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'contribution',
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ic_ledger_user_id ON public.ic_ledger (user_id);

-- ------------------------------------------------------------
-- 1) RPC: emit_ic - Emitir Impact Credit
--    Upsert atómico (single-statement) => sin race condition TOCTOU
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.emit_ic(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT DEFAULT 'contribution',
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
BEGIN
    -- Idempotencia ante reintentos
    IF p_idempotency_key IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'duplicate', 'idempotency_key', p_idempotency_key);
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
    END IF;

    -- Upsert atómico (single statement) → elimina condición de carrera TOCTOU
    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE
        SET balance = public.impact_credits.balance + p_amount,
            updated_at = NOW()
    RETURNING balance INTO v_new_balance;

    -- Ledger de emisión
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at)
    VALUES (p_user_id, p_amount, p_source, COALESCE(p_metadata, '{}'::JSONB), NOW());

    RETURN jsonb_build_object('status', 'ok', 'balance', v_new_balance, 'amount', p_amount);
END;
$$;

-- ------------------------------------------------------------
-- 2) RPC: spend_ic - Gasto Atómico de Impact Credits
--    SELECT ... FOR UPDATE + UPDATE condicional => anti-TOCTOU
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.spend_ic(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
    END IF;

    -- Lock de fila: serializa operaciones concurrentes por usuario
    -- y elimina la condición de carrera TOCTOU sobre el balance.
    SELECT balance INTO v_balance
    FROM public.impact_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'CREDITS_NOT_FOUND: %', p_user_id;
    END IF;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE: required=%, available=%', p_amount, v_balance;
    END IF;

    UPDATE public.impact_credits
    SET balance = v_balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at)
    VALUES (p_user_id, -p_amount, 'spend', COALESCE(p_metadata, '{}'::JSONB), NOW());

    v_new_balance := v_balance - p_amount;

    RETURN jsonb_build_object('status', 'ok', 'balance', v_new_balance, 'spent', p_amount);
END;
$$;

-- ------------------------------------------------------------
-- 3) RPC: process_purchase - Compra / Acreditación + Rol
--    Upsert + UPDATE en una misma transacción => atómico
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_purchase(
    p_user_id UUID,
    p_amount INTEGER,
    p_currency TEXT DEFAULT 'USD',
    p_payment_provider TEXT DEFAULT NULL,
    p_payment_id TEXT DEFAULT NULL,
    p_grant_tier TEXT DEFAULT 'user_premium'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_balance INTEGER;
    v_role TEXT;
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
    END IF;

    -- Acreditación atómica de créditos (upsert single-statement)
    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE
        SET balance = public.impact_credits.balance + p_amount,
            updated_at = NOW()
    RETURNING balance INTO v_balance;

    -- Upgrade de rol dentro de la misma transacción
    UPDATE public.profiles
    SET role = p_grant_tier
    WHERE id = p_user_id;

    v_role := p_grant_tier;

    -- Registro de compra (tabla real: user_purchases)
    -- NOTA: columnas esperadas en public.user_purchases:
    --   user_id, amount, currency, provider, payment_id, granted_tier, created_at
    INSERT INTO public.user_purchases (user_id, amount, currency, provider, payment_id, granted_tier, created_at)
    VALUES (p_user_id, p_amount, p_currency, p_payment_provider, p_payment_id, p_grant_tier, NOW());

    RETURN jsonb_build_object('status', 'ok', 'balance', v_balance, 'tier', v_role);
END;
$$;

-- ------------------------------------------------------------
-- 4) Grants (ejecutar con rol con permisos sobre las tablas)
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.emit_ic(UUID, INTEGER, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.spend_ic(UUID, INTEGER, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_purchase(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO service_role;
