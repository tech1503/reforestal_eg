-- ============================================================
-- 12_tax_shield_rpc.sql
-- FASE 2 - Tax Shield: Cap NETWORK_BOUNTY (EStG §22 Nr. 3)
-- Límite estricto: 255,00 € / año = 25.500 puntos (100 puntos = 1 €)
-- ============================================================

-- RPC: Verifica si un usuario excede el límite anual de conversión
-- para NETWORK_BOUNTY. Se debe ejecutar ANTES de cualquier conversión.
CREATE OR REPLACE FUNCTION public.check_network_bounty_cap(p_user_id UUID)
RETURNS TABLE (
    within_cap BOOLEAN,
    current_year_total INTEGER,
    cap_limit INTEGER,
    message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total INTEGER;
    v_limit CONSTANT INTEGER := 25500; -- 255,00 € / año (100 puntos = 1 €)
BEGIN
    -- Suma los puntos NETWORK_BOUNTY emitidos en el año calendario actual
    SELECT COALESCE(SUM(ABS(amount)), 0) INTO v_total
    FROM public.ic_ledger
    WHERE tax_origin = 'NETWORK_BOUNTY'
      AND user_id = p_user_id
      AND created_at >= date_trunc('year', NOW())
      AND created_at < date_trunc('year', NOW()) + INTERVAL '1 year';

    IF v_total <= v_limit THEN
        RETURN QUERY SELECT
            TRUE,
            v_total,
            v_limit,
            '✅ Dentro del límite legal EStG §22 Nr. 3: ' || v_total || ' puntos / ' || v_limit || ' puntos máximos (255,00 €/año)';
    ELSE
        RETURN QUERY SELECT
            FALSE,
            v_total,
            v_limit,
            '⚠️ LÍMITE EXCEDIDO EStG §22 Nr. 3: ' || v_total || ' puntos / ' || v_limit || ' puntos máximos (255,00 €/año). Conversión bloqueada.';
    END IF;
END;
$$;

-- Conceder permiso de ejecución a los roles necesarios
GRANT EXECUTE ON FUNCTION public.check_network_bounty_cap(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_network_bounty_cap(UUID) TO service_role;