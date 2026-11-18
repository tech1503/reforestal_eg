BEGIN;

CREATE OR REPLACE FUNCTION public.claim_padrino_grade1(
    p_referral_code text,
    p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $padrino$
DECLARE
    v_ahijado_id uuid := auth.uid();
    v_ref_code text;
    v_padrino_id uuid;
    v_current_referrer uuid;
    v_existing_ledger_id bigint;
    v_existing_padrino_id uuid;
    v_existing_balance integer;
    v_idem_id uuid;
    v_idem_key text;
    v_ledger_id bigint;
    v_new_balance integer;
    v_amount constant integer := 25;
BEGIN
    IF v_ahijado_id IS NULL THEN
        RAISE EXCEPTION 'AUTH_REQUIRED';
    END IF;

    v_ref_code := lower(btrim(COALESCE(p_referral_code, '')));
    IF v_ref_code = '' THEN
        RAISE EXCEPTION 'REFERRAL_CODE_REQUIRED';
    END IF;

    SELECT id
    INTO v_padrino_id
    FROM public.profiles
    WHERE lower(btrim(referral_code)) = v_ref_code
    LIMIT 1;

    IF v_padrino_id IS NULL THEN
        RAISE EXCEPTION 'PADRINO_NOT_FOUND';
    END IF;

    IF v_padrino_id = v_ahijado_id THEN
        RAISE EXCEPTION 'SELF_REFERRAL_FORBIDDEN';
    END IF;

    SELECT referrer_id
    INTO v_current_referrer
    FROM public.profiles
    WHERE id = v_ahijado_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PROFILE_NOT_FOUND';
    END IF;

    SELECT l.id, l.user_id
    INTO v_existing_ledger_id, v_existing_padrino_id
    FROM public.ic_ledger l
    WHERE l.source = 'padrino_grade1'
      AND l.metadata->>'ahijado_id' = v_ahijado_id::text
    ORDER BY l.id
    LIMIT 1;

    IF v_existing_ledger_id IS NOT NULL THEN
        IF v_existing_padrino_id <> v_padrino_id THEN
            RAISE EXCEPTION 'ALREADY_CLAIMED';
        END IF;

        IF v_current_referrer IS NULL THEN
            UPDATE public.profiles
            SET referrer_id = v_padrino_id, updated_at = now()
            WHERE id = v_ahijado_id;
        ELSIF v_current_referrer <> v_padrino_id THEN
            RAISE EXCEPTION 'ALREADY_CLAIMED';
        END IF;

        SELECT COALESCE(balance, 0)
        INTO v_existing_balance
        FROM public.impact_credits
        WHERE user_id = v_padrino_id;

        RETURN jsonb_build_object(
            'status', 'duplicate',
            'padrino_id', v_padrino_id,
            'ahijado_id', v_ahijado_id,
            'amount', v_amount,
            'balance', COALESCE(v_existing_balance, 0),
            'ledger_id', v_existing_ledger_id,
            'idempotency_key', p_idempotency_key
        );
    END IF;

    IF v_current_referrer IS NOT NULL AND v_current_referrer <> v_padrino_id THEN
        RAISE EXCEPTION 'ALREADY_CLAIMED';
    END IF;

    v_idem_key := COALESCE(NULLIF(btrim(p_idempotency_key), ''), 'padrino_grade1:' || v_ahijado_id::text);

    INSERT INTO public.ic_emission_idempotency (user_id, idempotency_key)
    VALUES (v_padrino_id, v_idem_key)
    ON CONFLICT (user_id, idempotency_key) DO NOTHING
    RETURNING id INTO v_idem_id;

    IF v_idem_id IS NULL THEN
        SELECT l.id, l.user_id
        INTO v_existing_ledger_id, v_existing_padrino_id
        FROM public.ic_ledger l
        WHERE l.source = 'padrino_grade1'
          AND l.metadata->>'ahijado_id' = v_ahijado_id::text
        ORDER BY l.id
        LIMIT 1;

        IF v_existing_ledger_id IS NOT NULL AND v_existing_padrino_id = v_padrino_id THEN
            SELECT COALESCE(balance, 0)
            INTO v_existing_balance
            FROM public.impact_credits
            WHERE user_id = v_padrino_id;

            RETURN jsonb_build_object(
                'status', 'duplicate',
                'padrino_id', v_padrino_id,
                'ahijado_id', v_ahijado_id,
                'amount', v_amount,
                'balance', COALESCE(v_existing_balance, 0),
                'ledger_id', v_existing_ledger_id,
                'idempotency_key', v_idem_key
            );
        END IF;

        RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY';
    END IF;

    IF v_current_referrer IS NULL THEN
        UPDATE public.profiles
        SET referrer_id = v_padrino_id, updated_at = now()
        WHERE id = v_ahijado_id;
    END IF;

    INSERT INTO public.impact_credits (user_id, balance, updated_at)
    VALUES (v_padrino_id, v_amount, now())
    ON CONFLICT (user_id) DO UPDATE
    SET balance = public.impact_credits.balance + EXCLUDED.balance,
        updated_at = now()
    RETURNING balance INTO v_new_balance;

    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
    VALUES (
        v_padrino_id,
        v_amount,
        'padrino_grade1',
        jsonb_build_object(
            'ahijado_id', v_ahijado_id,
            'padrino_id', v_padrino_id,
            'referral_code', v_ref_code,
            'grade', 1,
            'idempotency_key', v_idem_key
        ),
        'SELF_REBATE',
        now()
    )
    RETURNING id INTO v_ledger_id;

    UPDATE public.ic_emission_idempotency
    SET ledger_id = v_ledger_id
    WHERE id = v_idem_id;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        metadata,
        related_user_id
    ) VALUES (
        v_padrino_id,
        'Nuevo ahijado en tu red',
        'Has recibido 25 puntos por acompañar a un nuevo miembro en su primer paso.',
        'success',
        jsonb_build_object(
            'ahijado_id', v_ahijado_id,
            'source', 'padrino_grade1',
            'points', v_amount
        ),
        v_ahijado_id
    );

    RETURN jsonb_build_object(
        'status', 'ok',
        'padrino_id', v_padrino_id,
        'ahijado_id', v_ahijado_id,
        'amount', v_amount,
        'balance', v_new_balance,
        'ledger_id', v_ledger_id,
        'idempotency_key', v_idem_key
    );
END;
$padrino$;

ALTER FUNCTION public.claim_padrino_grade1(text, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.claim_padrino_grade1(text, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_padrino_grade1(text, text) TO authenticated, service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ic_ledger_padrino_grade1_ahijado
ON public.ic_ledger ((metadata->>'ahijado_id'))
WHERE source = 'padrino_grade1';

CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id uuid,
    p_title text,
    p_message text,
    p_metadata jsonb DEFAULT '{}'::jsonb,
    p_type text DEFAULT 'system'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $notif$
DECLARE
    v_id uuid;
    v_uid uuid := auth.uid();
    v_role text := COALESCE(auth.role(), '');
    v_type text := COALESCE(NULLIF(btrim(p_type), ''), 'system');
    v_related_action_id uuid;
    v_related_user_id uuid;
BEGIN
    IF p_title IS NULL OR btrim(p_title) = '' THEN
        RAISE EXCEPTION 'TITLE_REQUIRED';
    END IF;

    IF p_message IS NULL OR btrim(p_message) = '' THEN
        RAISE EXCEPTION 'MESSAGE_REQUIRED';
    END IF;

    IF p_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'USER_NOT_FOUND';
    END IF;

    IF v_role <> 'service_role' AND NOT public.is_admin_safe() THEN
        IF v_uid IS NULL THEN
            IF v_type <> 'admin_alert' OR p_user_id IS NOT NULL THEN
                RAISE EXCEPTION 'FORBIDDEN: anonymous notifications are limited to admin alerts';
            END IF;
        ELSIF p_user_id IS NOT NULL AND p_user_id <> v_uid THEN
            RAISE EXCEPTION 'FORBIDDEN: cannot send notifications to other users';
        ELSIF p_user_id IS NULL AND v_type <> 'admin_alert' THEN
            RAISE EXCEPTION 'USER_ID_REQUIRED';
        END IF;
    END IF;

    IF p_metadata IS NOT NULL AND jsonb_typeof(p_metadata) = 'object' THEN
        v_related_action_id := NULLIF(p_metadata->>'related_action_id', '')::uuid;
        v_related_user_id := NULLIF(p_metadata->>'related_user_id', '')::uuid;
    END IF;

    IF v_related_action_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.gamification_actions WHERE id = v_related_action_id) THEN
        v_related_action_id := NULL;
    END IF;

    IF v_related_user_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_related_user_id) THEN
        v_related_user_id := NULL;
    END IF;

    INSERT INTO public.notifications (
        user_id,
        title,
        message,
        notification_type,
        metadata,
        related_action_id,
        related_user_id
    ) VALUES (
        p_user_id,
        p_title,
        p_message,
        v_type,
        COALESCE(p_metadata, '{}'::jsonb),
        v_related_action_id,
        v_related_user_id
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'status', 'ok',
        'id', v_id,
        'user_id', p_user_id,
        'type', v_type
    );
END;
$notif$;

ALTER FUNCTION public.create_notification(uuid, text, text, jsonb, text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.create_notification(uuid, text, text, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, text, text, jsonb, text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.increment_link_visits(link_slug text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $visits$
BEGIN
    IF link_slug IS NULL OR btrim(link_slug) = '' THEN
        RAISE EXCEPTION 'SLUG_REQUIRED';
    END IF;

    UPDATE public.dynamic_links
    SET visits = COALESCE(visits, 0) + 1
    WHERE slug = lower(btrim(link_slug))
      AND is_active = true;
END;
$visits$;

ALTER FUNCTION public.increment_link_visits(text) OWNER TO postgres;
REVOKE ALL ON FUNCTION public.increment_link_visits(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_link_visits(text) TO anon, authenticated, service_role;

COMMIT;
