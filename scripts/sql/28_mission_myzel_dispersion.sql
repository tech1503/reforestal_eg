-- ============================================================
-- 28_mission_myzel_dispersion.sql
-- PASO 6 — Dispersión de misiones vía submit_mission_response (REQ-06)
--
-- Redefine public.submit_mission_response para que, en un intento
-- auto-aprobado, el presupuesto de actividad se disperse
-- omnidireccionalmente por la red (myzel_distribute_activity) DENTRO de la
-- misma transacción plpgsql. Atomicidad contable estricta del ledger.
--
-- Cambios respecto a 25_mission_steps_engine.sql (sección 10 y RETURN):
--   - emit_ic (100% actor)  →  myzel_distribute_activity (50/25/12.5/6.25/6.25).
--   - credits_awarded sigue reportando el budget BRUTO de la misión (compat).
--     Nuevos campos: personal_credits (abono del actor), network_budget,
--     degree_pools, zero_waste, dispersion_credits, ledger_balance.
--   - gamification_history / founding_pioneer_metrics conservan el budget
--     bruto como histórico; ic_ledger refleja la dispersión real.
--
-- Orden: DESPUÉS de 25_mission_steps_engine.sql y 27_myzel_network.sql.
-- No se ejecuta automáticamente: revisión en Staging antes de aplicar.
-- ============================================================

BEGIN;
CREATE OR REPLACE FUNCTION public.submit_mission_response(
    p_mission_id uuid,
    p_responses jsonb,
    p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $mission$
DECLARE
    v_uid uuid := auth.uid();
    v_mission record;
    v_steps jsonb;
    v_n_steps integer;
    v_idx integer;
    v_step jsonb;
    v_stype text;
    v_ui text;
    v_answer jsonb;
    v_required boolean;
    v_base_reward numeric;
    v_penalty numeric := 0;
    v_wrong integer := 0;
    v_needs_review boolean := false;
    v_normalized jsonb := '{}'::jsonb;
    v_options jsonb;
    v_poles jsonb;
    v_sum integer;
    v_opt integer;
    v_chosen_text text;
    v_correct jsonb;
    v_correct_items text[];
    v_answer_items text[];
    v_is_correct boolean;
    v_step_penalty numeric;
    v_text text;
    v_phase1 text;
    v_phase2 text;
    v_attempt integer;
    v_reward_numeric numeric;
    v_reward_int integer;
    v_review_status text;
    v_idem_key text;
    v_existing record;
    v_dispersion jsonb;
    v_personal_share integer := 0;
    v_reputation numeric;
BEGIN
    -- (1) Autenticación obligatoria
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    -- (2) Respuestas deben ser un objeto {"0": ..., "1": ...}
    IF p_responses IS NULL OR jsonb_typeof(p_responses) <> 'object' THEN
        RAISE EXCEPTION 'INVALID_RESPONSES: expected a JSON object keyed by step index';
    END IF;

    -- Serializa envíos concurrentes del mismo usuario a la misma misión
    PERFORM pg_advisory_xact_lock(hashtext(v_uid::text || ':' || p_mission_id::text));

    -- (3) Cargar misión y validar estado/ventana
    SELECT *
    INTO v_mission
    FROM public.genesis_missions
    WHERE id = p_mission_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'MISSION_NOT_FOUND';
    END IF;

    IF COALESCE(v_mission.status, 'inactive') <> 'active' THEN
        RAISE EXCEPTION 'MISSION_NOT_ACTIVE';
    END IF;

    IF v_mission.start_date IS NOT NULL AND now() < v_mission.start_date THEN
        RAISE EXCEPTION 'MISSION_NOT_STARTED';
    END IF;

    IF v_mission.end_date IS NOT NULL AND now() > v_mission.end_date THEN
        RAISE EXCEPTION 'MISSION_EXPIRED';
    END IF;

    -- (4) Idempotencia de aplicación: un intento activo por usuario+misión
    SELECT r.id, r.review_status, r.credits_awarded
    INTO v_existing
    FROM public.user_quest_responses r
    WHERE r.user_id = v_uid
      AND r.mission_id = p_mission_id
      AND r.review_status IN ('auto_approved', 'approved', 'pending')
    ORDER BY r.created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'status', 'duplicate',
            'mission_id', p_mission_id,
            'review_status', v_existing.review_status,
            'credits_awarded', COALESCE(v_existing.credits_awarded, 0)
        );
    END IF;

    -- (5) Parsear steps
    v_steps := CASE
        WHEN jsonb_typeof(v_mission.steps) = 'array' THEN v_mission.steps
        ELSE '[]'::jsonb
    END;
    v_n_steps := jsonb_array_length(v_steps);
    v_base_reward := COALESCE(v_mission.impact_credit_reward, 0);

    -- (6) Validación paso a paso en el servidor
    FOR v_idx IN 0..(GREATEST(v_n_steps, 1) - 1) LOOP
        EXIT WHEN v_idx >= v_n_steps;

        v_step := v_steps -> v_idx;
        v_stype := lower(COALESCE(v_step ->> 'type', 'question'));
        v_ui := lower(COALESCE(v_step ->> 'ui_type', ''));
        v_required := COALESCE((v_step ->> 'is_required')::boolean, false);
        v_answer := p_responses -> (v_idx::text);
        v_is_correct := NULL;

        -- Pasos de contenido no se validan
        IF v_stype = 'content' THEN
            CONTINUE;
        END IF;

        -- --- OPCION MÚLTIPLE / ÚNICA --------------------------------------
        IF v_ui IN ('multiple_choice', 'single_choice') THEN
            v_options := CASE WHEN jsonb_typeof(v_step -> 'options') = 'array'
                              THEN v_step -> 'options' ELSE '[]'::jsonb END;

            IF v_answer IS NOT NULL AND jsonb_typeof(v_answer) = 'null' THEN
                v_answer := NULL; -- respuesta json 'null' se trata como ausente
            END IF;

            IF v_ui = 'multiple_choice' THEN
                IF v_answer IS NOT NULL AND jsonb_typeof(v_answer) <> 'array' THEN
                    RAISE EXCEPTION 'INVALID_OPTION: step % expects an array of option indices', v_idx;
                END IF;
                IF v_required AND (v_answer IS NULL OR jsonb_array_length(v_answer) = 0) THEN
                    RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
                END IF;

                IF v_answer IS NOT NULL THEN
                    SELECT COALESCE(array_agg(DISTINCT lower(trim(value)) ORDER BY lower(trim(value))), '{}')
                    INTO v_answer_items
                    FROM jsonb_array_elements_text(v_answer) AS t(value);

                    FOREACH v_chosen_text IN ARRAY v_answer_items LOOP
                        IF v_chosen_text !~ '^\d+$' OR v_chosen_text::integer >= jsonb_array_length(v_options) THEN
                            RAISE EXCEPTION 'INVALID_OPTION: step % option % out of range', v_idx, v_chosen_text;
                        END IF;
                    END LOOP;

                    v_normalized := v_normalized || jsonb_build_object(v_idx::text, to_jsonb(v_answer_items));
                ELSE
                    v_normalized := v_normalized || jsonb_build_object(v_idx::text, '[]'::jsonb);
                END IF;

                -- Calificación solo si el paso define correct_answer y hubo respuesta
                IF v_answer IS NOT NULL
                   AND v_step ? 'correct_answer' AND NULLIF(btrim(v_step ->> 'correct_answer'), '') IS NOT NULL THEN
                    v_correct := v_step -> 'correct_answer';
                    IF jsonb_typeof(v_correct) = 'array' THEN
                        SELECT COALESCE(array_agg(DISTINCT lower(trim(value)) ORDER BY lower(trim(value))), '{}')
                        INTO v_correct_items
                        FROM jsonb_array_elements_text(v_correct) AS t(value);
                    ELSE
                        v_correct_items := ARRAY[lower(trim(both '"' from v_correct::text))];
                    END IF;

                    v_is_correct := COALESCE(v_answer_items, '{}') = v_correct_items;
                    IF NOT v_is_correct THEN
                        v_wrong := v_wrong + 1;
                    END IF;
                END IF;

            ELSE -- single_choice
                IF v_answer IS NOT NULL AND jsonb_typeof(v_answer) NOT IN ('string', 'number') THEN
                    IF v_required THEN
                        RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
                    END IF;
                    v_answer := NULL;
                END IF;

                v_chosen_text := trim(both '"' from COALESCE(v_answer::text, ''));

                IF v_required AND v_chosen_text = '' THEN
                    RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
                END IF;

                IF v_chosen_text <> '' THEN
                    IF v_chosen_text !~ '^\d+$' OR v_chosen_text::integer >= jsonb_array_length(v_options) THEN
                        RAISE EXCEPTION 'INVALID_OPTION: step % option % out of range', v_idx, v_chosen_text;
                    END IF;
                    v_normalized := v_normalized || jsonb_build_object(v_idx::text, to_jsonb(v_chosen_text));
                END IF;

                IF v_chosen_text <> ''
                   AND v_step ? 'correct_answer' AND NULLIF(btrim(v_step ->> 'correct_answer'), '') IS NOT NULL THEN
                    v_is_correct := v_chosen_text = lower(trim(both '"' from (v_step -> 'correct_answer')::text));
                    IF NOT v_is_correct THEN
                        v_wrong := v_wrong + 1;
                    END IF;
                END IF;
            END IF;

        -- --- REGULADOR 100% (alias legacy circular_slider) -----------------
        ELSIF v_ui IN ('percent_regulator', 'circular_slider') THEN
            v_poles := CASE WHEN jsonb_typeof(v_step -> 'poles') = 'array'
                            THEN v_step -> 'poles' ELSE '[]'::jsonb END;
            v_sum := 0;

            IF v_answer IS NOT NULL AND jsonb_typeof(v_answer) = 'null' THEN
                v_answer := NULL; -- respuesta json 'null' se trata como ausente
            END IF;

            IF v_required AND v_answer IS NULL THEN
                RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
            END IF;

            IF v_answer IS NOT NULL THEN
                IF jsonb_typeof(v_answer) <> 'object' THEN
                    RAISE EXCEPTION 'INVALID_PERCENT: step % expects an object {pole: percent}', v_idx;
                END IF;

                IF EXISTS (
                    SELECT 1 FROM jsonb_object_keys(v_answer) AS t(pole_name)
                    WHERE NOT EXISTS (
                        SELECT 1 FROM jsonb_array_elements_text(v_poles) p(pole) WHERE p.pole = t.pole_name
                    )
                ) THEN
                    RAISE EXCEPTION 'INVALID_POLE: step % contains a pole outside the declared list', v_idx;
                END IF;

                FOR v_chosen_text IN SELECT jsonb_object_keys(v_answer) LOOP
                    v_text := btrim((v_answer -> v_chosen_text) #>> '{}');
                    IF v_text !~ '^\d+$' THEN
                        RAISE EXCEPTION 'INVALID_PERCENT: step % value for pole % is not an integer', v_idx, v_chosen_text;
                    END IF;
                    IF v_text::integer < 0 OR v_text::integer > 100 THEN
                        RAISE EXCEPTION 'OUT_OF_RANGE: step % pole % must be between 0 and 100', v_idx, v_chosen_text;
                    END IF;
                    v_sum := v_sum + v_text::integer;
                END LOOP;

                IF v_required AND v_sum <> 100 THEN
                    RAISE EXCEPTION 'INVALID_100_PERCENT: step % must sum exactly 100 (got %)', v_idx, v_sum;
                END IF;

                v_normalized := v_normalized || jsonb_build_object(v_idx::text, v_answer);
            END IF;

        -- --- BARÓMETRO 1..5 ESTRELLAS (alias legacy scale_5) ---------------
        ELSIF v_ui IN ('star_barometer', 'scale_5') THEN
            IF v_answer IS NULL OR jsonb_typeof(v_answer) = 'null' THEN
                IF v_required THEN
                    RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
                END IF;
                v_text := '';
            ELSE
                v_text := trim(both '"' from v_answer::text);
            END IF;

            IF v_text <> '' THEN
                IF v_text !~ '^[1-5](\.0+)?$' THEN
                    RAISE EXCEPTION 'OUT_OF_RANGE: step % must be an integer between 1 and 5', v_idx;
                END IF;
                v_normalized := v_normalized || jsonb_build_object(v_idx::text, to_jsonb(v_text::numeric::integer));
            END IF;

            IF v_text <> ''
               AND v_step ? 'correct_answer' AND NULLIF(btrim(v_step ->> 'correct_answer'), '') IS NOT NULL THEN
                v_is_correct := v_text = lower(trim(both '"' from (v_step -> 'correct_answer')::text));
                IF NOT v_is_correct THEN
                    v_wrong := v_wrong + 1;
                END IF;
            END IF;

        -- --- CAJA DE TEXTO LIBRE EN 2 FASES ---------------------------------
        ELSIF v_ui = 'two_phase_text' THEN
            v_phase1 := NULL;
            v_phase2 := NULL;

            IF v_answer IS NULL OR jsonb_typeof(v_answer) = 'null' THEN
                IF v_required THEN
                    RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
                END IF;
            ELSIF jsonb_typeof(v_answer) = 'array' THEN
                v_phase1 := btrim(COALESCE(v_answer ->> 0, ''));
                v_phase2 := btrim(COALESCE(v_answer ->> 1, ''));
            ELSIF jsonb_typeof(v_answer) = 'object' THEN
                v_phase1 := btrim(COALESCE(v_answer ->> 'phase1', ''));
                v_phase2 := btrim(COALESCE(v_answer ->> 'phase2', ''));
            ELSIF jsonb_typeof(v_answer) = 'string' THEN
                v_phase1 := btrim(v_answer #>> '{}');
                v_phase2 := '';
            ELSE
                RAISE EXCEPTION 'INVALID_TEXT: step % expects {phase1, phase2}', v_idx;
            END IF;

            IF length(COALESCE(v_phase1, '')) > 5000 OR length(COALESCE(v_phase2, '')) > 5000 THEN
                RAISE EXCEPTION 'TEXT_TOO_LONG: step % exceeds 5000 characters', v_idx;
            END IF;

            IF v_required AND (COALESCE(v_phase1, '') = '' OR COALESCE(v_phase2, '') = '') THEN
                RAISE EXCEPTION 'MISSING_ANSWER: step % requires both phases', v_idx;
            END IF;

            v_normalized := v_normalized || jsonb_build_object(
                v_idx::text,
                jsonb_build_object('phase1', COALESCE(v_phase1, ''), 'phase2', COALESCE(v_phase2, ''))
            );

            IF v_required THEN
                v_needs_review := true;
            END IF;

        -- --- TEXTO LIBRE CLÁSICO (legacy) -----------------------------------
        ELSIF v_ui = 'free_text' THEN
            v_text := btrim(COALESCE(v_answer #>> '{}', ''));

            IF v_required AND v_text = '' THEN
                RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
            END IF;
            IF length(v_text) > 5000 THEN
                RAISE EXCEPTION 'TEXT_TOO_LONG: step % exceeds 5000 characters', v_idx;
            END IF;

            v_normalized := v_normalized || jsonb_build_object(v_idx::text, to_jsonb(v_text));

            IF v_required THEN
                v_needs_review := true;
            END IF;

        -- --- Tipo desconocido: se exige al menos presencia si es required ---
        ELSE
            IF v_required AND (v_answer IS NULL OR v_answer::text IN ('', 'null')) THEN
                RAISE EXCEPTION 'MISSING_ANSWER: step %', v_idx;
            END IF;
            IF v_answer IS NOT NULL THEN
                v_normalized := v_normalized || jsonb_build_object(v_idx::text, v_answer);
            END IF;
        END IF;

        -- Penalización por respuesta calificada incorrecta
        IF v_is_correct IS FALSE THEN
            IF COALESCE((v_step ->> 'apply_penalty')::boolean, false)
               AND COALESCE((v_step ->> 'penalty_value')::numeric, 0) > 0 THEN
                IF lower(COALESCE(v_step ->> 'penalty_type', 'fixed')) = 'percentage' THEN
                    v_step_penalty := round(v_base_reward * (v_step ->> 'penalty_value')::numeric / 100);
                ELSE
                    v_step_penalty := (v_step ->> 'penalty_value')::numeric;
                END IF;
            ELSIF COALESCE(v_mission.global_penalty_percentage, 0) > 0 THEN
                v_step_penalty := round(v_base_reward * v_mission.global_penalty_percentage / 100);
            ELSE
                v_step_penalty := 0;
            END IF;
            v_penalty := v_penalty + COALESCE(v_step_penalty, 0);
        END IF;
    END LOOP;

    -- (7) La revisión manual solo aplica si hay texto libre y la misión no auto-aprueba
    IF COALESCE(v_mission.auto_approve, false) THEN
        v_needs_review := false;
    END IF;

    v_reward_numeric := GREATEST(0, v_base_reward - v_penalty);
    v_reward_int := floor(v_reward_numeric)::integer;
    v_review_status := CASE WHEN v_needs_review THEN 'pending' ELSE 'auto_approved' END;
    v_reputation := COALESCE(v_mission.reputation_reward, 0);

    -- (8) Contador de intentos (para clave idempotente tras rechazo)
    SELECT count(*) INTO v_attempt
    FROM public.user_quest_responses r
    WHERE r.user_id = v_uid AND r.mission_id = p_mission_id;

    v_idem_key := COALESCE(NULLIF(btrim(p_idempotency_key), ''),
                           'mission:' || p_mission_id::text || ':' || v_uid::text || ':' || v_attempt::text);

    -- (9) Persistir la respuesta (RLS la protege: el cliente ya no escribe)
    INSERT INTO public.user_quest_responses (
        user_id,
        mission_id,
        response_data,
        is_correct,
        credits_awarded,
        review_status,
        earned_reputation
    ) VALUES (
        v_uid,
        p_mission_id,
        v_normalized,
        (v_wrong = 0 AND NOT v_needs_review),
        v_reward_numeric,
        v_review_status,
        CASE WHEN v_needs_review THEN 0 ELSE v_reputation END
    );

    -- (10) Acreditación solo en auto-aprobado, vía contabilidad oficial
    IF NOT v_needs_review THEN
        IF v_reward_int > 0 THEN
            -- Dispersión omnidireccional (REQ-06): 50% actor / 25/12.5/6.25/6.25 por grado.
            -- Misma transacción plpgsql: ic_ledger queda contablemente íntegro.
            SELECT public.myzel_distribute_activity(
                v_uid,
                v_reward_int,
                'quest_completion',
                jsonb_build_object(
                    'mission_id', p_mission_id,
                    'title', COALESCE(v_mission.title, 'Mission'),
                    'penalties', v_penalty,
                    'wrong_answers', v_wrong,
                    'via', 'submit_mission_response'
                ),
                v_idem_key
            ) INTO v_dispersion;
            v_personal_share := COALESCE((v_dispersion ->> 'actor_share')::integer, 0);
        END IF;

        INSERT INTO public.gamification_history (
            user_id,
            action_id,
            action_name,
            action_type,
            impact_credits_awarded,
            action_date,
            notes
        ) VALUES (
            v_uid,
            NULL,
            'Mission: ' || COALESCE(v_mission.title, p_mission_id::text),
            'Mission Quest',
            v_reward_numeric,
            now(),
            'Completed via submit_mission_response. Penalties: -' || COALESCE(v_penalty, 0)::text
        );

        INSERT INTO public.founding_pioneer_metrics (
            user_id,
            reputation_score,
            total_impact_credits_earned,
            mission_quests_participated,
            last_activity_date,
            updated_at
        ) VALUES (
            v_uid,
            v_reputation,
            v_reward_numeric,
            1,
            now(),
            now()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            reputation_score = COALESCE(public.founding_pioneer_metrics.reputation_score, 0) + v_reputation,
            total_impact_credits_earned = COALESCE(public.founding_pioneer_metrics.total_impact_credits_earned, 0) + v_reward_numeric,
            mission_quests_participated = COALESCE(public.founding_pioneer_metrics.mission_quests_participated, 0) + 1,
            last_activity_date = now(),
            updated_at = now();

        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            metadata
        ) VALUES (
            v_uid,
            'Misión completada',
            'Has completado la misión y recibido ' || v_personal_share::text || ' puntos (el 50% viaja a tu micelio).',
            'success',
            jsonb_build_object(
                'mission_id', p_mission_id,
                'credits', v_reward_int,
                'penalties', v_penalty,
                'source', 'submit_mission_response'
            )
        );
    ELSE
        INSERT INTO public.notifications (
            user_id,
            title,
            message,
            notification_type,
            metadata
        ) VALUES (
            v_uid,
            'Misión enviada a revisión',
            'Tus respuestas de la misión han sido enviadas a revisión.',
            'info',
            jsonb_build_object(
                'mission_id', p_mission_id,
                'credits_pending', v_reward_numeric,
                'source', 'submit_mission_response'
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'status', CASE WHEN v_needs_review THEN 'pending' ELSE 'ok' END,
        'mission_id', p_mission_id,
        'review_status', v_review_status,
        'credits_awarded', v_reward_numeric,
        'personal_credits', v_personal_share,
        'network_budget', COALESCE((v_dispersion ->> 'network_budget')::numeric, 0),
        'degree_pools', v_dispersion -> 'degree_pools',
        'zero_waste', v_dispersion -> 'zero_waste',
        'dispersion_credits', v_dispersion -> 'credits',
        'reputation_awarded', CASE WHEN v_needs_review THEN 0 ELSE v_reputation END,
        'penalties', v_penalty,
        'wrong_answers', v_wrong,
        'ledger_balance', CASE WHEN v_dispersion IS NOT NULL THEN (v_dispersion ->> 'actor_balance')::numeric ELSE NULL END,
        'idempotency_key', v_idem_key
    );
END;
$mission$;


ALTER FUNCTION public.submit_mission_response(uuid, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.submit_mission_response(uuid, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_mission_response(uuid, jsonb, text) TO authenticated, service_role;

COMMIT;
