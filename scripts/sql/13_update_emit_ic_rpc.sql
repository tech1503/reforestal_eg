-- ============================================================
-- 13_update_emit_ic_rpc.sql
-- FASE 2 - Actualización de emit_ic con tax_origin
-- ============================================================

-- Modifica emit_ic para recibir p_tax_origin (SELF_REBATE por defecto) y
-- registrar tax_origin en ic_ledger según la directiva EStG.
CREATE OR REPLACE FUNCTION public.emit_ic(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT DEFAULT 'contribution',
    p_metadata JSONB DEFAULT '{}'::JSONB,
    p_idempotency_key TEXT DEFAULT NULL,
    p_tax_origin TEXT DEFAULT 'SELF_REBATE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_balance INTEGER;
    v_tax_check TEXT;
BEGIN
    -- Idempotencia
    IF p_idempotency_key IS NOT NULL THEN
        RETURN jsonb_build_object('status', 'duplicate', 'idempotency_key', p_idempotency_key);
    END IF;

    -- Validación de montos
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
    END IF;

    -- Validación del origen fiscal (EStG blindaje)
    IF p_tax_origin NOT IN ('SELF_REBATE', 'NETWORK_BOUNTY') THEN
        RAISE EXCEPTION 'INVALID_TAX_ORIGIN: % (debe ser SELF_REBATE o NETWORK_BOUNTY)', p_tax_origin;
    END IF;

    -- Upsert atómico del balance en impact_credits
    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE
        SET balance = public.impact_credits.balance + p_amount,
            updated_at = NOW()
    RETURNING balance INTO v_new_balance;

    -- Ledger de emisión con tax_origin (blindaje fiscal)
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
    VALUES (p_user_id, p_amount, p_source, COALESCE(p_metadata, '{}'::JSONB), p_tax_origin, NOW());

    RETURN jsonb_build_object('status', 'ok', 'balance', v_new_balance, 'amount', p_amount, 'tax_origin', p_tax_origin);
END;
$$;

GRANT EXECUTE ON FUNCTION public.emit_ic(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.emit_ic(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT) TO service_role;
