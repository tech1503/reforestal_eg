-- ==========================================================
-- 15_MIZEL_CORE_UPDATE.SQL
-- FASE 1 - PHYGITAL + LIFO + VISTA CONTEXTUAL
-- Zero-Dev-Bloat: opera sobre ic_ledger existente y
-- land_dollars -> land_dollar_tokens ( ALTER NO BORRAR).
-- Fecha: 2026-11-04
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. TABLAS PHYGITAL (Módulo V)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.sponsor_pool_queue (
    batch_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_user_id UUID NOT NULL REFERENCES public.profiles(id),
    shares_total    INT NOT NULL DEFAULT 1,
    shares_remaining INT NOT NULL DEFAULT 1,
    source_type     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anastomosis_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id            UUID NOT NULL REFERENCES public.profiles(id),
    user_b_id            UUID NOT NULL REFERENCES public.profiles(id),
    last_handshake_at    TIMESTAMPTZ,
    handshake_count_total INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_pair_order CHECK (user_a_id < user_b_id),
    CONSTRAINT uq_pair_unique UNIQUE (user_a_id, user_b_id)
);

-- ==========================================================
-- 2. REFACTORIZACIÓN land_dollars -> land_dollar_tokens
-- CRÍTICO: ALTER NO BORRAR. Conversión phygital con short_code PK.
-- ==========================================================

-- 2a. Añadir nuevas columnes
ALTER TABLE public.land_dollars
    ADD COLUMN short_code TEXT,
    ADD COLUMN assigned_sponsor_id UUID REFERENCES public.sponsor_pool_queue(batch_id),
    ADD COLUMN first_claimed_by_user_id UUID REFERENCES public.profiles(id);

-- 2b. Migrar datos existentes
DO $$
BEGIN
    UPDATE public.land_dollars SET short_code = substr(md5(random()::text), 1, 5);
    UPDATE public.land_dollars SET first_claimed_by_user_id = user_id;
    UPDATE public.land_dollars
    SET status = CASE WHEN status = 'active' THEN 'ROOTED' ELSE 'POOL' END
    WHERE status IS NOT NULL AND status <> 'active';
END $$;

-- 2c. Eliminar restricción PK actual y columnas obsoletas
ALTER TABLE public.land_dollars DROP CONSTRAINT land_dollars_pkey;

ALTER TABLE public.land_dollars
    DROP COLUMN qr_code,
    DROP COLUMN land_dollar_url,
    DROP COLUMN qr_code_url,
    DROP COLUMN link_ref,
    DROP COLUMN contribution_id;

-- 2d. Convertir short_code en nueva PK
ALTER TABLE public.land_dollars ALTER COLUMN short_code SET NOT NULL;
ALTER TABLE public.land_dollars ADD CONSTRAINT land_dollars_pkey PRIMARY KEY (short_code);

-- 2e. Renombrar tabla land_dollars -> land_dollar_tokens
ALTER TABLE public.land_dollars RENAME TO land_dollar_tokens;

-- ==========================================================
-- 3. VISTA financial_context_view (cesta verde/dorada dinámica)
-- Usa profiles.role (NO saas_role inventada).
-- ==========================================================

CREATE OR REPLACE VIEW public.financial_context_view AS
SELECT
    u.id AS user_id,
    u.role AS saas_role,
    COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM public.ic_ledger
        WHERE user_id = u.id AND created_at > NOW() - INTERVAL '90 days' AND amount > 0
    ), 0) AS green_basket_points,
    COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM public.ic_ledger
        WHERE user_id = u.id AND created_at <= NOW() - INTERVAL '90 days' AND amount > 0
    ), 0) AS gold_basket_points,
    COALESCE((
        SELECT COALESCE(SUM(amount), 0)
        FROM public.ic_ledger
        WHERE user_id = u.id AND amount > 0
    ), 0) AS total_ic_ledger_balance,
    COALESCE((
        SELECT COALESCE(SUM(credits_amount), 0)
        FROM public.reforestal_credits_ledger
        WHERE user_id = u.id AND credits_amount > 0
    ), 0) AS total_reforestal_credits,
    COALESCE((
        SELECT total_impact_credits_earned
        FROM public.founding_pioneer_metrics
        WHERE user_id = u.id
    ), 0) AS lifetime_score,
    COALESCE((
        SELECT amount
        FROM public.land_dollar_tokens
        WHERE user_id = u.id
    ), 0) AS land_dollars,
    COALESCE((
        SELECT contribution_amount
        FROM public.contributions
        WHERE user_id = u.id
        ORDER BY contribution_date DESC LIMIT 1
    ), 0) AS last_contribution_amount
FROM public.profiles u;

-- ==========================================================
-- 4. FUNCION RPC spend_points_lifo (consumo LIFO ic_ledger)
-- ERROR CORREGIDO: DECLARE v_rec RECORD;
-- ==========================================================

CREATE OR REPLACE FUNCTION public.spend_points_lifo(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
    v_remaining INT := p_amount;
    v_total_active INT;
    v_rec RECORD; -- <-- FALTABA ESTO, ERROR DE SINTAXIS resuelto
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_active
    FROM public.ic_ledger
    WHERE user_id = p_user_id AND amount > 0;

    IF v_total_active < p_amount THEN
        RAISE EXCEPTION 'Saldo de puntos insuficiente. Solicitado: %, Disponible: %', p_amount, v_total_active;
    END IF;

    FOR v_rec IN
        SELECT id, amount
        FROM public.ic_ledger
        WHERE user_id = p_user_id AND amount > 0
        ORDER BY created_at DESC
    LOOP
        IF v_remaining <= 0 THEN EXIT; END IF;

        IF v_rec.amount <= v_remaining THEN
            UPDATE public.ic_ledger SET amount = 0 WHERE id = v_rec.id;
            v_remaining := v_remaining - v_rec.amount;
        ELSE
            UPDATE public.ic_ledger SET amount = amount - v_remaining WHERE id = v_rec.id;
            v_remaining := 0;
        END IF;
    END LOOP;

    RETURN p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================================
-- 5. POLÍTICAS RLS PARA NUEVAS TABLAS
-- ==========================================================

ALTER TABLE public.sponsor_pool_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anastomosis_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY sponsor_read ON public.sponsor_pool_queue
    FOR SELECT TO authenticated USING (true);

CREATE POLICY anastomosis_read ON public.anastomosis_log
    FOR SELECT TO authenticated USING (true);

COMMIT;

-- ==========================================================
-- FIN 15_MIZEL_CORE_UPDATE.SQL
-- Zero-Dev-Bloat observado: opera sobre tablas existentes
-- ==========================================================