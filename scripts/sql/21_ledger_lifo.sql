BEGIN;

-- 1. REESCRIBIR EL MOTOR LIFO A UN MODELO INMUTABLE (APPEND-ONLY)
CREATE OR REPLACE FUNCTION public.spend_points_lifo(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
    v_total_balance INT;
BEGIN
    -- Validar Identidad del que ejecuta
    IF p_user_id != auth.uid() AND NOT is_admin_safe() THEN
        RAISE EXCEPTION 'Fraude bloqueado: No puedes gastar puntos de otro usuario.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Monto inválido.';
    END IF;

    -- Calcular saldo real disponible en el Ledger
    SELECT COALESCE(SUM(amount), 0) INTO v_total_balance
    FROM public.ic_ledger
    WHERE user_id = p_user_id;

    IF v_total_balance < p_amount THEN
        RAISE EXCEPTION 'Saldo de puntos insuficiente. Solicitado: %, Disponible: %', p_amount, v_total_balance;
    END IF;

    -- Registrar el gasto como un asiento negativo (Senke) - NUNCA HACER UPDATE A FILAS ANTERIORES
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at, tax_origin)
    VALUES (p_user_id, -p_amount, 'lifo_digital_spend', '{"type": "cooldown_skip"}'::jsonb, NOW(), 'SELF_REBATE');

    -- Sincronizar la tabla caché impact_credits para mantener consistencia
    UPDATE public.impact_credits 
    SET balance = balance - p_amount, updated_at = NOW() 
    WHERE user_id = p_user_id;

    RETURN p_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. REPARAR LA VISTA FINANCIERA PARA QUE CALCULE LIFO MATEMÁTICAMENTE
-- Restamos los gastos (asientos negativos) primero de los puntos inmaduros (< 90 días).
CREATE OR REPLACE VIEW public.financial_context_view AS
WITH ledger_stats AS (
    SELECT 
        user_id,
        COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND created_at > NOW() - INTERVAL '90 days'), 0) AS gross_immature,
        COALESCE(SUM(amount) FILTER (WHERE amount > 0 AND created_at <= NOW() - INTERVAL '90 days'), 0) AS gross_mature,
        COALESCE(SUM(amount) FILTER (WHERE amount < 0), 0) * -1 AS total_spent,
        COALESCE(SUM(amount), 0) AS net_total
    FROM public.ic_ledger
    GROUP BY user_id
)
SELECT
    u.id AS user_id,
    u.role AS saas_role,
    COALESCE(ls.net_total, 0) AS total_ic_ledger_balance,
    -- LIFO: El gasto se come primero la canasta verde (inmadura)
    GREATEST(0, COALESCE(ls.gross_immature, 0) - COALESCE(ls.total_spent, 0)) AS green_basket_points,
    -- Lo que queda del total después de la canasta verde, es la canasta dorada (madura)
    GREATEST(0, COALESCE(ls.net_total, 0) - GREATEST(0, COALESCE(ls.gross_immature, 0) - COALESCE(ls.total_spent, 0))) AS gold_basket_points,
    COALESCE((SELECT SUM(credits_amount) FROM public.reforestal_credits_ledger WHERE user_id = u.id AND credits_amount > 0), 0) AS total_reforestal_credits,
    COALESCE((SELECT total_impact_credits_earned FROM public.founding_pioneer_metrics WHERE user_id = u.id), 0) AS lifetime_score,
    COALESCE((SELECT amount FROM public.land_dollar_tokens WHERE user_id = u.id), 0) AS land_dollars,
    COALESCE((SELECT contribution_amount FROM public.contributions WHERE user_id = u.id ORDER BY contribution_date DESC LIMIT 1), 0) AS last_contribution_amount
FROM public.profiles u
LEFT JOIN ledger_stats ls ON ls.user_id = u.id;

COMMIT;