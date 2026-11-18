-- ============================================================
-- 26_wallet_lifo_deduct.sql
-- PASO 4 — Tokenomics / REQ-02 (Cartera de 3 cuentas) / REQ-08 (LIFO)
--
-- RPC `wallet_lifo_deduct`: deducción estricta LIFO para senkes digitales.
--   · Extrae EXCLUSIVAMENTE puntos inmaduros (< 90 días), del más reciente al
--     más antiguo (created_at DESC, id DESC). Criterio de Aceptación 3:
--     los puntos antiguos (>= 90 días) conservan su maduración inalterada.
--   · Ledger append-only: el gasto se registra como asiento negativo en
--     ic_ledger y se acota a sus lots de origen vía la tabla
--     public.ic_ledger_lifo_allocations (auditoría exacta por lot).
--   · Los gastos legacy sin allocations (spend_ic / spend_points_lifo) se
--     reparten newest-first sobre los lots al leer, para mantener consistencia
--     con la agregación de public.financial_context_view (21_ledger_lifo.sql),
--     que NO se modifica.
--
-- Espejo funcional (TDD): src/utils/lifoEngine.js + src/tests/lifoEngine.test.js.
-- Cualquier cambio aquí debe replicarse allí.
--
-- Orden de aplicación: DESPUÉS de 21_ledger_lifo.sql y 24_core_rpcs.sql.
-- No se ejecuta automáticamente: revisar y aplicar manualmente en Staging.
-- ============================================================

BEGIN;

-- 1. Tabla de allocations LIFO (append-only, 1 fila por porción de lot consumida)
CREATE TABLE IF NOT EXISTS public.ic_ledger_lifo_allocations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    spend_ledger_id BIGINT NOT NULL REFERENCES public.ic_ledger(id) ON DELETE CASCADE,
    source_ledger_id BIGINT NOT NULL REFERENCES public.ic_ledger(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifo_alloc_spend ON public.ic_ledger_lifo_allocations (spend_ledger_id);
CREATE INDEX IF NOT EXISTS idx_lifo_alloc_source ON public.ic_ledger_lifo_allocations (source_ledger_id);
CREATE INDEX IF NOT EXISTS idx_lifo_alloc_user ON public.ic_ledger_lifo_allocations (user_id);

ALTER TABLE public.ic_ledger_lifo_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ic_ledger_lifo_allocations_select_own_or_admin ON public.ic_ledger_lifo_allocations;
CREATE POLICY ic_ledger_lifo_allocations_select_own_or_admin
    ON public.ic_ledger_lifo_allocations
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin_safe());

REVOKE ALL ON TABLE public.ic_ledger_lifo_allocations FROM anon, authenticated;
GRANT SELECT ON TABLE public.ic_ledger_lifo_allocations TO authenticated;

-- 2. Función interna: lots positivos distribuidos newest-first.
--    rem_pre = amount - allocations explícitas del lot.
--    Sobre rem_pre se reparte, newest-first, el gasto legacy no trazado
--    (asientos negativos sin allocations) con el clamp
--    GREATEST(0, LEAST(rem_pre, unallocated_spend - newer_rem)).
--    p_exclude_spend_id permite excluir el asiento negativo recién insertado
--    por wallet_lifo_deduct para que el snapshot sea coherente con la
--    comprobación de disponibilidad previa.
CREATE OR REPLACE FUNCTION public.wallet_lifo_distributed_lots(
    p_user_id UUID,
    p_maturity_days INTEGER DEFAULT 90,
    p_exclude_spend_id BIGINT DEFAULT NULL
)
RETURNS TABLE(
    lot_id BIGINT,
    created_at TIMESTAMPTZ,
    original_amount INTEGER,
    allocated_amount INTEGER,
    unallocated_burn INTEGER,
    remaining_amount INTEGER,
    is_mature BOOLEAN,
    days_to_maturity INTEGER,
    matures_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $dist$
WITH pos AS (
    SELECT
        l.id AS lot_id,
        l.created_at,
        l.amount::INTEGER AS original_amount,
        COALESCE(a.allocated, 0)::INTEGER AS allocated_amount,
        GREATEST(0, l.amount - COALESCE(a.allocated, 0))::INTEGER AS rem_pre
    FROM public.ic_ledger l
    LEFT JOIN (
        SELECT source_ledger_id, SUM(amount) AS allocated
        FROM public.ic_ledger_lifo_allocations
        GROUP BY source_ledger_id
    ) a ON a.source_ledger_id = l.id
    WHERE l.user_id = p_user_id
      AND l.amount > 0
),
unalloc AS (
    SELECT COALESCE(SUM(-l.amount), 0)::INTEGER AS unallocated_spend
    FROM public.ic_ledger l
    WHERE l.user_id = p_user_id
      AND l.amount < 0
      AND l.id IS DISTINCT FROM p_exclude_spend_id
      AND NOT EXISTS (
          SELECT 1
          FROM public.ic_ledger_lifo_allocations al
          WHERE al.spend_ledger_id = l.id
      )
),
ranked AS (
    SELECT
        p.*,
        COALESCE(SUM(p.rem_pre) OVER (
            ORDER BY p.created_at DESC, p.lot_id DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ), 0)::INTEGER AS newer_rem
    FROM pos p
)
SELECT
    r.lot_id,
    r.created_at,
    r.original_amount,
    r.allocated_amount,
    LEAST(r.rem_pre, GREATEST(0, u.unallocated_spend - r.newer_rem))::INTEGER AS unallocated_burn,
    (r.rem_pre - LEAST(r.rem_pre, GREATEST(0, u.unallocated_spend - r.newer_rem)))::INTEGER AS remaining_amount,
    (r.created_at <= NOW() - make_interval(days => p_maturity_days)) AS is_mature,
    GREATEST(0, CEIL(EXTRACT(EPOCH FROM (r.created_at + make_interval(days => p_maturity_days) - NOW())) / 86400.0))::INTEGER AS days_to_maturity,
    (r.created_at + make_interval(days => p_maturity_days)) AS matures_at
FROM ranked r
CROSS JOIN unalloc u
ORDER BY r.created_at DESC, r.lot_id DESC;
$dist$;

ALTER FUNCTION public.wallet_lifo_distributed_lots(uuid, integer, bigint) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.wallet_lifo_distributed_lots(uuid, integer, bigint) FROM PUBLIC, anon, authenticated, service_role;

-- 3. RPC pública de deducción LIFO estricta (senkes digitales)
CREATE OR REPLACE FUNCTION public.wallet_lifo_deduct(
    p_user_id UUID,
    p_amount INTEGER,
    p_source TEXT DEFAULT 'lifo_digital_spend',
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_maturity_days INTEGER DEFAULT 90
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wallet_lifo$
DECLARE
    v_uid UUID := auth.uid();
    v_source TEXT := COALESCE(NULLIF(btrim(p_source), ''), 'lifo_digital_spend');
    v_immature_available INTEGER;
    v_mature_gross INTEGER;
    v_spend_id BIGINT;
    v_need INTEGER := p_amount;
    v_take INTEGER;
    v_alloc_count INTEGER := 0;
    v_allocations JSONB := '[]'::jsonb;
    v_lot RECORD;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF p_user_id IS DISTINCT FROM v_uid
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin_safe() THEN
        RAISE EXCEPTION 'FRAUD_BLOCKED: cannot deduct points from another user';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: p_amount must be a positive integer';
    END IF;

    IF p_maturity_days IS NULL OR p_maturity_days < 1 THEN
        RAISE EXCEPTION 'INVALID_MATURITY_DAYS';
    END IF;

    IF char_length(v_source) > 64 THEN
        RAISE EXCEPTION 'INVALID_SOURCE: p_source exceeds 64 characters';
    END IF;

    -- Serializa deducciones concurrentes por usuario (anti-overspend).
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 72613));

    -- Disponible inmaduro estricto (los maduros jamás participan).
    SELECT COALESCE(SUM(d.remaining_amount), 0)
    INTO v_immature_available
    FROM public.wallet_lifo_distributed_lots(p_user_id, p_maturity_days, NULL) d
    WHERE NOT d.is_mature;

    IF v_immature_available < p_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_IMMATURE_POINTS: requested %, immature available %. Mature points (>= % days) are never consumed by digital senkes.',
            p_amount, v_immature_available, p_maturity_days;
    END IF;

    -- Asiento negativo (senke) en el ledger inmutable.
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at, tax_origin)
    VALUES (
        p_user_id,
        -p_amount,
        v_source,
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('type', 'lifo_deduct', 'maturity_days', p_maturity_days),
        NOW(),
        'SELF_REBATE'
    )
    RETURNING id INTO v_spend_id;

    -- Allocación LIFO sobre el mismo snapshot pre-gasto (excluye v_spend_id).
    FOR v_lot IN
        SELECT d.lot_id, d.created_at, d.remaining_amount
        FROM public.wallet_lifo_distributed_lots(p_user_id, p_maturity_days, v_spend_id) d
        WHERE NOT d.is_mature
          AND d.remaining_amount > 0
        ORDER BY d.created_at DESC, d.lot_id DESC
    LOOP
        EXIT WHEN v_need <= 0;
        v_take := LEAST(v_need, v_lot.remaining_amount);

        INSERT INTO public.ic_ledger_lifo_allocations (spend_ledger_id, source_ledger_id, user_id, amount)
        VALUES (v_spend_id, v_lot.lot_id, p_user_id, v_take);

        v_alloc_count := v_alloc_count + 1;
        v_allocations := v_allocations || jsonb_build_object('lot_id', v_lot.lot_id, 'amount', v_take);
        v_need := v_need - v_take;
    END LOOP;

    -- Sincronizar caché (ic_ledger sigue siendo la fuente de verdad).
    UPDATE public.impact_credits
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Snapshot informativo de maduros (NO se consumen en este RPC).
    SELECT COALESCE(SUM(amount), 0)
    INTO v_mature_gross
    FROM public.ic_ledger
    WHERE user_id = p_user_id
      AND amount > 0
      AND created_at <= NOW() - make_interval(days => p_maturity_days);

    RETURN jsonb_build_object(
        'status', 'ok',
        'spent', p_amount,
        'spend_ledger_id', v_spend_id,
        'allocations', v_allocations,
        'allocation_count', v_alloc_count,
        'immature_available_before', v_immature_available,
        'immature_remaining_after', v_immature_available - p_amount,
        'mature_gross', v_mature_gross,
        'mature_untouched', true,
        'source', v_source
    );
END;
$wallet_lifo$;

ALTER FUNCTION public.wallet_lifo_deduct(uuid, integer, text, jsonb, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.wallet_lifo_deduct(uuid, integer, text, jsonb, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wallet_lifo_deduct(uuid, integer, text, jsonb, integer) TO authenticated, service_role;

-- 4. Helper de lectura para la Cartera (Paneles Bolsa Verde / Bolsa Dorada).
--    Devuelve los lots inmaduros y maduros con saldo restante y días para
--    completar la maduración LIFO. Solo el propio usuario o un admin.
CREATE OR REPLACE FUNCTION public.wallet_lifo_lots(
    p_user_id UUID,
    p_maturity_days INTEGER DEFAULT 90
)
RETURNS TABLE(
    lot_id BIGINT,
    created_at TIMESTAMPTZ,
    original_amount INTEGER,
    allocated_amount INTEGER,
    unallocated_burn INTEGER,
    remaining_amount INTEGER,
    is_mature BOOLEAN,
    days_to_maturity INTEGER,
    matures_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $lots$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF p_user_id IS DISTINCT FROM auth.uid()
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin_safe() THEN
        RAISE EXCEPTION 'FRAUD_BLOCKED: cannot read lots of another user';
    END IF;

    RETURN QUERY
    SELECT d.lot_id, d.created_at, d.original_amount, d.allocated_amount,
           d.unallocated_burn, d.remaining_amount, d.is_mature, d.days_to_maturity, d.matures_at
    FROM public.wallet_lifo_distributed_lots(p_user_id, p_maturity_days, NULL) d
    WHERE d.remaining_amount > 0
    ORDER BY d.created_at DESC, d.lot_id DESC;
END;
$lots$;

ALTER FUNCTION public.wallet_lifo_lots(uuid, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.wallet_lifo_lots(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wallet_lifo_lots(uuid, integer) TO authenticated, service_role;

COMMIT;
