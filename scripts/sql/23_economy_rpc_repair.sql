BEGIN;

-- 1. Real idempotency storage for emit_ic
CREATE TABLE IF NOT EXISTS public.ic_emission_idempotency (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    idempotency_key text NOT NULL,
    ledger_id bigint REFERENCES public.ic_ledger(id) ON DELETE SET NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ic_emission_idempotency_user_key_key UNIQUE (user_id, idempotency_key)
);

ALTER TABLE public.ic_emission_idempotency ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ic_emission_idempotency FROM anon, authenticated;

-- 2. Secure, idempotent emit_ic
CREATE OR REPLACE FUNCTION public.emit_ic(
    p_user_id uuid,
    p_amount integer,
    p_source text DEFAULT 'contribution',
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_idempotency_key text DEFAULT NULL,
    p_tax_origin text DEFAULT 'SELF_REBATE'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $emit$
DECLARE
    v_new_balance integer;
    v_ledger_id bigint;
    v_idem_id uuid;
    v_existing_ledger_id bigint;
    v_existing_balance integer;
    v_role text := COALESCE(auth.role(), '');
    v_year_total integer;
    v_cap constant integer := 25500;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: %', p_amount;
    END IF;

    IF p_source IS NULL OR btrim(p_source) = '' THEN
        RAISE EXCEPTION 'SOURCE_REQUIRED';
    END IF;

    IF p_tax_origin NOT IN ('SELF_REBATE', 'NETWORK_BOUNTY') THEN
        RAISE EXCEPTION 'INVALID_TAX_ORIGIN: %', p_tax_origin;
    END IF;

    IF v_role <> 'service_role' AND auth.uid() IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    IF v_role <> 'service_role'
       AND auth.uid() <> p_user_id
       AND NOT public.is_admin_safe() THEN
        RAISE EXCEPTION 'FORBIDDEN: cannot emit IC to another user';
    END IF;

    IF p_tax_origin = 'NETWORK_BOUNTY' THEN
        SELECT COALESCE(SUM(amount), 0)
        INTO v_year_total
        FROM public.ic_ledger
        WHERE user_id = p_user_id
          AND tax_origin = 'NETWORK_BOUNTY'
          AND created_at >= date_trunc('year', now())
          AND created_at < date_trunc('year', now()) + interval '1 year';

        IF v_year_total + p_amount > v_cap THEN
            RAISE EXCEPTION 'NETWORK_BOUNTY_CAP_EXCEEDED: % + % > %', v_year_total, p_amount, v_cap;
        END IF;
    END IF;

    IF p_idempotency_key IS NOT NULL THEN
        INSERT INTO public.ic_emission_idempotency (user_id, idempotency_key)
        VALUES (p_user_id, p_idempotency_key)
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
        RETURNING id INTO v_idem_id;

        IF v_idem_id IS NULL THEN
            SELECT e.ledger_id, COALESCE(ic.balance, 0)
            INTO v_existing_ledger_id, v_existing_balance
            FROM public.ic_emission_idempotency e
            LEFT JOIN public.impact_credits ic ON ic.user_id = e.user_id
            WHERE e.user_id = p_user_id
              AND e.idempotency_key = p_idempotency_key;

            RETURN jsonb_build_object(
                'status', 'duplicate',
                'idempotency_key', p_idempotency_key,
                'ledger_id', v_existing_ledger_id,
                'balance', v_existing_balance
            );
        END IF;
    END IF;

    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (p_user_id, p_amount, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.impact_credits.balance + EXCLUDED.balance,
        updated_at = now()
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
    VALUES (p_user_id, p_amount, p_source, COALESCE(p_metadata, '{}'::jsonb), p_tax_origin, now())
    RETURNING id INTO v_ledger_id;

    IF p_idempotency_key IS NOT NULL THEN
        UPDATE public.ic_emission_idempotency
        SET ledger_id = v_ledger_id
        WHERE id = v_idem_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'user_id', p_user_id,
        'amount', p_amount,
        'balance', v_new_balance,
        'tax_origin', p_tax_origin,
        'ledger_id', v_ledger_id
    );
END;
$emit$;

ALTER FUNCTION public.emit_ic(uuid, integer, text, jsonb, text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.emit_ic(uuid, integer, text, jsonb, text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.emit_ic(uuid, integer, text, jsonb, text, text) TO authenticated, service_role;

-- 3. Network bounty cap helper
CREATE OR REPLACE FUNCTION public.check_network_bounty_cap(p_user_id uuid)
RETURNS TABLE (
    within_cap boolean,
    current_year_total integer,
    cap_limit integer,
    message text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $cap$
DECLARE
    v_total integer;
    v_limit constant integer := 25500;
    v_role text := COALESCE(auth.role(), '');
BEGIN
    IF v_role <> 'service_role'
       AND NOT public.is_admin_safe()
       AND auth.uid() IS DISTINCT FROM p_user_id THEN
        RAISE EXCEPTION 'FORBIDDEN: cannot inspect another user cap';
    END IF;

    SELECT COALESCE(SUM(ABS(amount)), 0)
    INTO v_total
    FROM public.ic_ledger
    WHERE tax_origin = 'NETWORK_BOUNTY'
      AND user_id = p_user_id
      AND created_at >= date_trunc('year', now())
      AND created_at < date_trunc('year', now()) + interval '1 year';

    RETURN QUERY
    SELECT
        v_total <= v_limit,
        v_total,
        v_limit,
        CASE
            WHEN v_total <= v_limit THEN 'OK: ' || v_total || ' / ' || v_limit || ' points'
            ELSE 'CAP_EXCEEDED: ' || v_total || ' / ' || v_limit || ' points'
        END;
END;
$cap$;

ALTER FUNCTION public.check_network_bounty_cap(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.check_network_bounty_cap(uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.check_network_bounty_cap(uuid) TO authenticated, service_role;

-- 4. Missing XP helper
CREATE OR REPLACE FUNCTION public.get_xp_level(p_xp integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $xp$
    SELECT COALESCE(
        (
            SELECT MAX(l.level)
            FROM public.xp_level_thresholds l
            WHERE l.xp_required <= GREATEST(COALESCE(p_xp, 0), 0)
        ),
        1
    );
$xp$;

ALTER FUNCTION public.get_xp_level(integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.get_xp_level(integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_xp_level(integer) TO anon, authenticated, service_role;

COMMIT;
