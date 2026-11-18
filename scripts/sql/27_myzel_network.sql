-- ============================================================
-- 27_myzel_network.sql
-- PASO 5 — Red Horizontal Myzel / REQ-06 (Dispersión omnidireccional 4 grados)
--
-- A. `myzel_network(p_user_id, p_max_depth)`
--    Topología 4º grado, grafo NO DIRIGIDO y simétrico:
--      - profiles.referrer_id  → via 'referral'   (apadrinamiento)
--      - anastomosis_log COMPLETED → via 'anastomosis' (apretón de manos)
--    BFS por profundidad mínima; devuelve al cliente SOLO el identificador
--    público (referral_code) y metadatos no sensibles del peer.
--
-- B. `myzel_distribute_activity(p_user_id, p_budget, p_source, p_metadata, p_idempotency_key)`
--    Dispersión omnidireccional del presupuesto de ACTIVIDAD/MISIONES:
--      50% actor · 25% Grado 1 · 12,5% Grado 2 · 6,25% Grado 3 · 6,25% Grado 4
--    - Reparto entero por método de mayor resto (desempate: grado menor primero;
--      dentro de un grado: peer_id ASC). Suma exacta = budget.
--    - Grado 1 siempre abierto (acceso gratuito). Grados 2-4 requieren plan:
--      Guardián/a→2 · Campeón/a→3 · Paladín/a→4 (subscriptions activas).
--    - Zero-Waste-Loop: el impulso dirigido a un peer con su grado receptor
--      cerrado retorna ÍNTEGRO al fondo comunitario (no se redistribuye).
--    - Ledger append-only (tax_origin: actor SELF_REBATE / red NETWORK_BOUNTY).
--    - Idempotencia opcional vía ic_emission_idempotency + advisory lock.
--
-- Espejo funcional (TDD): src/utils/myzelTopology.js, src/utils/myzelDispersion.js
-- y src/tests/myzel*.test.js. Cualquier cambio aquí debe replicarse allí.
--
-- Orden de aplicación: DESPUÉS de 21_ledger_lifo.sql, 24_core_rpcs.sql y
-- 26_wallet_lifo_deduct.sql. No se ejecuta automáticamente: revisar y aplicar
-- manualmente en Staging.
-- ============================================================

BEGIN;

-- ============================================================
-- A. RPC DE TOPOLOGÍA: los 4 grados de vecindad relacional
-- ============================================================
CREATE OR REPLACE FUNCTION public.myzel_network(
    p_user_id UUID DEFAULT auth.uid(),
    p_max_depth INTEGER DEFAULT 4
)
RETURNS TABLE(
    degree INTEGER,
    peer_id UUID,
    public_handle TEXT,
    via TEXT,
    luminosity NUMERIC,
    membership_stage TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $network$
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF p_user_id IS DISTINCT FROM auth.uid()
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin_safe() THEN
        RAISE EXCEPTION 'FRAUD_BLOCKED: cannot read the network of another user';
    END IF;

    IF p_max_depth IS NULL OR p_max_depth < 1 OR p_max_depth > 4 THEN
        RAISE EXCEPTION 'INVALID_DEPTH: p_max_depth must be between 1 and 4';
    END IF;

    RETURN QUERY
    WITH RECURSIVE edges AS (
        SELECT p.referrer_id AS a, p.id AS b, 'referral'::TEXT AS via
        FROM public.profiles p
        WHERE p.referrer_id IS NOT NULL
        UNION
        SELECT al.user_a_id, al.user_b_id, 'anastomosis'::TEXT
        FROM public.anastomosis_log al
        WHERE al.status = 'COMPLETED'
    ),
    norm AS (
        SELECT e.a AS src, e.b AS dst, e.via FROM edges e
        UNION ALL
        SELECT e.b AS src, e.a AS dst, e.via FROM edges e
    ),
    reach(peer_id, depth, via, path) AS (
        SELECT n.dst, 1, n.via, ARRAY[p_user_id, n.dst]
        FROM norm n
        WHERE n.src = p_user_id
        UNION ALL
        SELECT n.dst, r.depth + 1, n.via, r.path || n.dst
        FROM reach r
        JOIN norm n ON n.src = r.peer_id
        WHERE r.depth < p_max_depth
          AND NOT (n.dst = ANY(r.path))
    ),
    dedup AS (
        SELECT DISTINCT ON (r.peer_id)
            r.peer_id, r.depth, r.via
        FROM reach r
        ORDER BY r.peer_id, r.depth ASC
    )
    SELECT
        d.depth AS degree,
        d.peer_id,
        p.referral_code AS public_handle,
        d.via,
        COALESCE(nb.luminosity, 1.0)::NUMERIC AS luminosity,
        p.membership_stage
    FROM dedup d
    JOIN public.profiles p ON p.id = d.peer_id
    LEFT JOIN public.node_brightness nb ON nb.node_id = d.peer_id::TEXT
    ORDER BY d.depth, p.referral_code NULLS LAST;
END;
$network$;

ALTER FUNCTION public.myzel_network(uuid, integer) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.myzel_network(uuid, integer) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.myzel_network(uuid, integer) TO authenticated, service_role;

-- ============================================================
-- B. RPC DE DISPERSIÓN: matriz en 4 grados (Actividad/Misiones)
-- ============================================================
CREATE OR REPLACE FUNCTION public.myzel_distribute_activity(
    p_user_id UUID,
    p_budget INTEGER,
    p_source TEXT DEFAULT 'myzel_activity',
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $dispersion$
DECLARE
    v_uid UUID := auth.uid();
    v_source TEXT := COALESCE(NULLIF(btrim(p_source), ''), 'myzel_activity');
    v_idem TEXT := NULLIF(btrim(COALESCE(p_idempotency_key, '')), '');
    v_idem_id UUID;
    v_actor_ledger_id BIGINT;
    v_new_balance INTEGER;

    v_actor_share INTEGER;
    v_network_budget INTEGER;
    v_d1 INTEGER; v_d2 INTEGER; v_d3 INTEGER; v_d4 INTEGER;
    v_residual INTEGER;
    v_s1 INTEGER; v_s2 INTEGER; v_s3 INTEGER; v_s4 INTEGER;
    v_pool INTEGER;

    v_deg INTEGER;
    v_count INTEGER;
    v_base INTEGER;
    v_rem INTEGER;
    v_alloc INTEGER;
    v_open_grade INTEGER;
    v_plan TEXT;
    v_peer RECORD;

    v_credits JSONB := '[]'::jsonb;
    v_zero_1 INTEGER := 0;
    v_zero_2 INTEGER := 0;
    v_zero_3 INTEGER := 0;
    v_zero_4 INTEGER := 0;
    v_zero_total INTEGER := 0;
    v_credited_total INTEGER := 0;
BEGIN
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'USER_ID_REQUIRED';
    END IF;

    IF p_user_id IS DISTINCT FROM v_uid
       AND COALESCE(auth.role(), '') <> 'service_role'
       AND NOT public.is_admin_safe() THEN
        RAISE EXCEPTION 'FRAUD_BLOCKED: cannot distribute activity points for another user';
    END IF;

    IF p_budget IS NULL OR p_budget <= 0 THEN
        RAISE EXCEPTION 'INVALID_BUDGET: p_budget must be a positive integer';
    END IF;

    IF char_length(v_source) > 64 THEN
        RAISE EXCEPTION 'INVALID_SOURCE: p_source exceeds 64 characters';
    END IF;

    IF v_idem IS NOT NULL AND char_length(v_idem) > 128 THEN
        RAISE EXCEPTION 'INVALID_IDEMPOTENCY_KEY: exceeds 128 characters';
    END IF;

    -- Serializa emisiones por actor (anti doble abono concurrente).
    PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 72614));

    -- Idempotencia (misma tabla que emit_ic, namespace por actor).
    IF v_idem IS NOT NULL THEN
        INSERT INTO public.ic_emission_idempotency (user_id, idempotency_key)
        VALUES (p_user_id, v_idem)
        ON CONFLICT (user_id, idempotency_key) DO NOTHING
        RETURNING id INTO v_idem_id;

        IF v_idem_id IS NULL THEN
            RETURN jsonb_build_object('status', 'duplicate', 'idempotency_key', v_idem);
        END IF;
    END IF;

    -- Materializar la vecindad 4 grados una sola vez (transaccional).
    CREATE TEMP TABLE IF NOT EXISTS _myzel_reach (
        peer_id UUID PRIMARY KEY,
        depth INTEGER NOT NULL,
        via TEXT NOT NULL
    ) ON COMMIT DROP;
    DELETE FROM _myzel_reach;

    INSERT INTO _myzel_reach (peer_id, depth, via)
    WITH RECURSIVE edges AS (
        SELECT p.referrer_id AS a, p.id AS b, 'referral'::TEXT AS via
        FROM public.profiles p
        WHERE p.referrer_id IS NOT NULL
        UNION
        SELECT al.user_a_id, al.user_b_id, 'anastomosis'::TEXT
        FROM public.anastomosis_log al
        WHERE al.status = 'COMPLETED'
    ),
    norm AS (
        SELECT e.a AS src, e.b AS dst, e.via FROM edges e
        UNION ALL
        SELECT e.b AS src, e.a AS dst, e.via FROM edges e
    ),
    reach(peer_id, depth, via, path) AS (
        SELECT n.dst, 1, n.via, ARRAY[p_user_id, n.dst]
        FROM norm n
        WHERE n.src = p_user_id
        UNION ALL
        SELECT n.dst, r.depth + 1, n.via, r.path || n.dst
        FROM reach r
        JOIN norm n ON n.src = r.peer_id
        WHERE r.depth < 4
          AND NOT (n.dst = ANY(r.path))
    )
    SELECT DISTINCT ON (peer_id) peer_id, depth, via
    FROM reach
    ORDER BY peer_id, depth ASC;

    -- Budget: 50% actor / 50% red (reparte 50/25/12.5/12.5 dentro del pool de red).
    v_actor_share := p_budget / 2;
    v_network_budget := p_budget - v_actor_share;

    v_d1 := v_network_budget / 2;
    v_d2 := v_network_budget / 4;
    v_d3 := v_network_budget / 8;
    v_d4 := v_network_budget / 8;
    v_residual := v_network_budget - (v_d1 + v_d2 + v_d3 + v_d4);

    -- Mayor resto (desempate: grado menor primero), igual que splitIntegerShares() en JS.
    v_s1 := (v_network_budget % 2) * 4;
    v_s2 := (v_network_budget % 4) * 2;
    v_s3 := (v_network_budget % 8);
    v_s4 := (v_network_budget % 8);

    FOR i IN 1..3 LOOP
        EXIT WHEN v_residual <= 0;
        IF v_s1 >= v_s2 AND v_s1 >= v_s3 AND v_s1 >= v_s4 THEN
            v_d1 := v_d1 + 1; v_s1 := v_s1 - 8; v_residual := v_residual - 1;
        ELSIF v_s2 >= v_s3 AND v_s2 >= v_s4 THEN
            v_d2 := v_d2 + 1; v_s2 := v_s2 - 8; v_residual := v_residual - 1;
        ELSIF v_s3 >= v_s4 THEN
            v_d3 := v_d3 + 1; v_s3 := v_s3 - 8; v_residual := v_residual - 1;
        ELSE
            v_d4 := v_d4 + 1; v_s4 := v_s4 - 8; v_residual := v_residual - 1;
        END IF;
    END LOOP;

    -- Abono al actor (SELF_REBATE).
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
    VALUES (
        p_user_id,
        v_actor_share,
        v_source,
        COALESCE(p_metadata, '{}'::jsonb)
            || jsonb_build_object('role', 'actor', 'actor_id', p_user_id, 'budget', p_budget)
            || CASE WHEN v_idem IS NOT NULL THEN jsonb_build_object('idempotency_key', v_idem) ELSE '{}'::jsonb END,
        'SELF_REBATE',
        NOW()
    )
    RETURNING id INTO v_actor_ledger_id;

    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (p_user_id, v_actor_share, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET balance = impact_credits.balance + EXCLUDED.balance, updated_at = NOW()
    RETURNING balance INTO v_new_balance;

    v_credited_total := v_actor_share;
    v_credits := v_credits || jsonb_build_object('user_id', p_user_id, 'degree', 'actor', 'amount', v_actor_share);

    -- Abono a la red, grado a grado.
    FOR v_deg IN 1..4 LOOP
        v_pool := CASE v_deg WHEN 1 THEN v_d1 WHEN 2 THEN v_d2 WHEN 3 THEN v_d3 ELSE v_d4 END;
        CONTINUE WHEN v_pool <= 0;

        SELECT COUNT(*) INTO v_count FROM _myzel_reach WHERE depth = v_deg;

        IF v_count = 0 THEN
            CASE v_deg WHEN 1 THEN v_zero_1 := v_zero_1 + v_pool;
                            WHEN 2 THEN v_zero_2 := v_zero_2 + v_pool;
                            WHEN 3 THEN v_zero_3 := v_zero_3 + v_pool;
                            ELSE v_zero_4 := v_zero_4 + v_pool; END CASE;
            v_zero_total := v_zero_total + v_pool;
            CONTINUE;
        END IF;

        v_base := v_pool / v_count;
        v_rem := v_pool % v_count;

        FOR v_peer IN SELECT peer_id FROM _myzel_reach WHERE depth = v_deg ORDER BY peer_id ASC LOOP
            v_alloc := v_base + CASE WHEN v_rem > 0 THEN 1 ELSE 0 END;
            IF v_rem > 0 THEN v_rem := v_rem - 1; END IF;

            -- Grado 1 siempre abierto; grados 2-4 requieren suscripción activa con plan
            -- (Guardián/a→2 · Campeón/a→3 · Paladín/a→4). La Freischaltung por puntos
            -- se incorporará cuando exista la tabla de desbloqueos (REQ-13 Fase 2).
            IF v_deg = 1 THEN
                v_open_grade := 1;
            ELSE
                SELECT lower(s.plan_type::text) INTO v_plan
                FROM public.subscriptions s
                WHERE s.user_id = v_peer.peer_id
                  AND s.status = 'active'
                  AND (s.end_date IS NULL OR s.end_date > NOW())
                ORDER BY s.start_date DESC NULLS LAST
                LIMIT 1;

                v_open_grade := CASE
                    WHEN v_plan ILIKE 'palad%' THEN 4
                    WHEN v_plan ILIKE 'campe%' THEN 3
                    WHEN v_plan ILIKE 'guardi%' THEN 2
                    ELSE 1
                END;
            END IF;

            IF v_open_grade >= v_deg THEN
                INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
                VALUES (
                    v_peer.peer_id,
                    v_alloc,
                    v_source,
                    COALESCE(p_metadata, '{}'::jsonb)
                        || jsonb_build_object('role', 'network', 'actor_id', p_user_id, 'degree', v_deg, 'budget', p_budget)
                        || CASE WHEN v_idem IS NOT NULL THEN jsonb_build_object('idempotency_key', v_idem) ELSE '{}'::jsonb END,
                    'NETWORK_BOUNTY',
                    NOW()
                );

                INSERT INTO public.impact_credits (user_id, balance, updated_at)
                VALUES (v_peer.peer_id, v_alloc, NOW())
                ON CONFLICT (user_id)
                DO UPDATE SET balance = impact_credits.balance + EXCLUDED.balance, updated_at = NOW();

                v_credited_total := v_credited_total + v_alloc;
                v_credits := v_credits || jsonb_build_object('user_id', v_peer.peer_id, 'degree', v_deg, 'amount', v_alloc);
            ELSE
                CASE v_deg WHEN 2 THEN v_zero_2 := v_zero_2 + v_alloc;
                            WHEN 3 THEN v_zero_3 := v_zero_3 + v_alloc;
                            ELSE v_zero_4 := v_zero_4 + v_alloc; END CASE;
                v_zero_total := v_zero_total + v_alloc;
            END IF;
        END LOOP;
    END LOOP;

    -- Enlazar el asiento de idempotencia con el ledger del actor.
    IF v_idem_id IS NOT NULL THEN
        UPDATE public.ic_emission_idempotency
        SET ledger_id = v_actor_ledger_id
        WHERE id = v_idem_id;
    END IF;

    RETURN jsonb_build_object(
        'status', 'ok',
        'budget', p_budget,
        'actor_share', v_actor_share,
        'network_budget', v_network_budget,
        'degree_pools', jsonb_build_object('1', v_d1, '2', v_d2, '3', v_d3, '4', v_d4),
        'credits', v_credits,
        'credited_total', v_credited_total,
        'zero_waste', jsonb_build_object('1', v_zero_1, '2', v_zero_2, '3', v_zero_3, '4', v_zero_4, 'total', v_zero_total),
        'idempotency_key', v_idem,
        'actor_balance', v_new_balance,
        'actor_ledger_id', v_actor_ledger_id
    );
END;
$dispersion$;

ALTER FUNCTION public.myzel_distribute_activity(uuid, integer, text, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.myzel_distribute_activity(uuid, integer, text, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.myzel_distribute_activity(uuid, integer, text, jsonb, text) TO service_role;
-- Solo el backend (service_role) emite actividad; la emisión por cliente se vetó deliberadamente
-- para que ningún cliente se autoabone la red. Los clientes llaman RPCs de dominio (misión, apretón…).

COMMIT;
