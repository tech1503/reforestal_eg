-- ============================================================
-- 06_drop_beneficios_and_rename_pending_ROLLBACK.sql
-- Rama: feat/strip-startnext
--
-- Revierte 100% lo ejecutado por 06_drop_beneficios_and_rename_pending.sql:
--   1. RPC admin_process_contribution -> admin_process_startnext_contribution
--   2. Vistas v_contributions_by_country / v_contributions_with_tiers
--      -> nombre original con prefijo startnext (si aplica)
--   3. pending_registrations -> pending_startnext_registrations
--   4. Funciones reescritas se RESTAURAN desde
--      public._migration_06_function_backup
--   5. beneficios_startnext: si fue eliminada y existe el respaldo
--      _migration_06_beneficios_startnext_backup, se recrea vacía
--      (DROP es irreversible en datos; el backup de datos se hizo
--      con CREATE TABLE ... AS SELECT antes del DROP, si está presente)
--
-- NOTA: beneficios_startnext se restaura SOLO la estructura si no
-- hay backup de datos. Ejecutar solo si es necesario.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Renombrar RPC de vuelta
-- ------------------------------------------------------------
DO $$
DECLARE
    fn record;
    renamed int := 0;
BEGIN
    FOR fn IN
        SELECT p.oid, n.nspname AS schema_name, p.proname AS function_name,
               pg_get_function_identity_arguments(p.oid) AS identity_args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname = 'admin_process_contribution'
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) RENAME TO admin_process_startnext_contribution',
            fn.schema_name, fn.function_name, fn.identity_args
        );
        renamed := renamed + 1;
        RAISE NOTICE 'RPC restaurado: admin_process_contribution -> admin_process_startnext_contribution';
    END LOOP;
    IF renamed = 0 THEN
        RAISE NOTICE 'RPC admin_process_contribution no encontrado.';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Restaurar vistas
-- ------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.v_contributions_by_country') IS NOT NULL THEN
        EXECUTE 'ALTER VIEW public.v_contributions_by_country RENAME TO v_startnext_contributions_by_country';
        RAISE NOTICE 'Vista restaurada: v_contributions_by_country -> v_startnext_contributions_by_country';
    END IF;
    IF to_regclass('public.v_contributions_with_tiers') IS NOT NULL THEN
        EXECUTE 'ALTER VIEW public.v_contributions_with_tiers RENAME TO v_startnext_contributions_with_tiers';
        RAISE NOTICE 'Vista restaurada: v_contributions_with_tiers -> v_startnext_contributions_with_tiers';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 3. Renombrar tabla pendiente de vuelta
-- ------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.pending_registrations') IS NOT NULL
       AND to_regclass('public.pending_startnext_registrations') IS NULL THEN
        ALTER TABLE public.pending_registrations RENAME TO pending_startnext_registrations;
        RAISE NOTICE 'Tabla restaurada: pending_registrations -> pending_startnext_registrations';
    ELSE
        RAISE NOTICE 'No se restaura la tabla pendiente (ya existe con nombre original o falta la nueva).';
    END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Restaurar funciones desde backup (cuerpos originales)
-- ------------------------------------------------------------
DO $$
DECLARE
    fn record;
    restored int := 0;
BEGIN
    FOR fn IN
        SELECT schema_name, function_name, identity_args, definition
        FROM public._migration_06_function_backup
    LOOP
        -- Solo restaurar si la función existe hoy (con el nombre actual)
        IF to_regclass(format('%I.%I', fn.schema_name, fn.function_name)) IS NOT NULL THEN
            BEGIN
                EXECUTE fn.definition;
                restored := restored + 1;
                RAISE NOTICE 'Función restaurada: %.%(%)', fn.schema_name, fn.function_name, fn.identity_args;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE '⚠️ No se pudo restaurar %.%(%): %', fn.schema_name, fn.function_name, fn.identity_args, SQLERRM;
            END;
        ELSE
            RAISE NOTICE 'Función %.%(%) no existe, se omite.', fn.schema_name, fn.function_name, fn.identity_args;
        END IF;
    END LOOP;
    RAISE NOTICE 'Total funciones restauradas: %', restored;
END $$;

-- ------------------------------------------------------------
-- 5. Recrear beneficios_startnext (solo si había respaldo de datos)
-- ------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.beneficios_startnext') IS NULL
       AND to_regclass('public._migration_06_beneficios_startnext_backup') IS NOT NULL THEN
        EXECUTE 'CREATE TABLE public.beneficios_startnext (LIKE public._migration_06_beneficios_startnext_backup INCLUDING ALL)';
        EXECUTE 'INSERT INTO public.beneficios_startnext SELECT * FROM public._migration_06_beneficios_startnext_backup';
        RAISE NOTICE 'Tabla beneficios_startnext recreada desde respaldo.';
    ELSE
        RAISE NOTICE 'No se recrea beneficios_startnext (ya existe o no hay respaldo).';
    END IF;
END $$;

COMMIT;

-- Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';

-- Verificación post-rollback
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%startnext%'
ORDER BY table_name;
