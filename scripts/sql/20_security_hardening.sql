BEGIN;

-- 1. ELIMINAR PERMISOS INSEGUROS DE CLIENTES
DROP POLICY IF EXISTS "Users can insert own impact credits" ON public.impact_credits;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- 2. BLINDAR ACTUALIZACIONES EN PROFILES (Evitar Escalada de Rol a Admin)
CREATE OR REPLACE FUNCTION public.check_profile_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el rol cambia y el usuario no es admin, abortar.
  IF (NEW.role IS DISTINCT FROM OLD.role) AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Escalada de privilegios bloqueada. No puedes cambiar tu propio rol.';
  END IF;
  
  -- Si intenta asignarse créditos pre-pagados fraudulentamente
  IF (NEW.prepaid_ld_credits IS DISTINCT FROM OLD.prepaid_ld_credits) AND NOT is_admin_safe() THEN
    RAISE EXCEPTION 'Operación financiera bloqueada.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_profile_escalation();

-- 3. BLINDAR FUNCIONES FINANCIERAS (Asegurar que nadie gaste dinero ajeno)
-- Actualización de spend_ic
CREATE OR REPLACE FUNCTION public.spend_ic(
    p_user_id uuid, p_amount integer, p_reason text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
    v_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Validar Identidad del que ejecuta la función
    IF p_user_id != auth.uid() AND NOT is_admin_safe() THEN
        RAISE EXCEPTION 'Fraude bloqueado: No puedes gastar créditos de otro usuario.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Monto inválido.';
    END IF;

    -- Lock concurrencia
    SELECT balance INTO v_balance FROM public.impact_credits WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Créditos no encontrados.'; END IF;
    IF v_balance < p_amount THEN RAISE EXCEPTION 'Balance insuficiente.'; END IF;

    UPDATE public.impact_credits SET balance = v_balance - p_amount, updated_at = NOW() WHERE user_id = p_user_id;
    INSERT INTO public.ic_ledger (user_id, amount, source, metadata, created_at) VALUES (p_user_id, -p_amount, 'spend', COALESCE(p_metadata, '{}'::JSONB), NOW());

    RETURN jsonb_build_object('status', 'ok', 'balance', v_balance - p_amount, 'spent', p_amount);
END;
$$;

COMMIT;