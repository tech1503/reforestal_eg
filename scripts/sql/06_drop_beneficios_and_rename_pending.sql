-- ============================================================
-- 06_drop_beneficios_and_rename_pending.sql
-- FASE 1 / PASO 2c — Limpieza final de objetos Startnext
-- Rama: feat/strip-startnext
--
-- 1. VERIFICA que `beneficios_startnext` sea 100% huérfana
--    (sin funciones, vistas, FKs ni triggers dependientes) y
--    en ese caso la elimina (DROP). Si tiene dependencias,
--    NO la elimina y las lista.
-- 2. Renombra `pending_startnext_registrations` -> `pending_registrations`
--    (con backup + reescritura automática de cuerpos de funciones).
-- 3. Renombra RPC `admin_process_startnext_contribution`
--    -> `admin_process_contribution` (metadata-only, con rollback).
-- 4. Renombra vistas con prefijo startnext (si existen con ese nombre).
-- 5. Lista (solo informativo) misiones/gamification_actions con
--    slugs o target_role startnext para su desactivación manual.
-- 6. VERIFICACIÓN final de objetos restantes con "startnext".
--
-- Ejecutar en el SQL Editor de Supabase ANTES del deploy del
-- nuevo build (Paso 8/9). La vista admin de registros pendientes
-- y los llamados al RPC viejo dejarán de funcionar en el build
-- actual hasta el deploy — esperado y aceptado.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- PARTE 0: Backup de funciones que referencian la tabla pendiente
--          (mismo patrón que 04/05; se conserva para rollback)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public._migration_06_function_backup (
    schema_name text NOT NULL,
    function_name text NOT NULL,
    identity_args text NOT NULL,
    definition text NOT NULL,
    backed_up_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (schema_name, function_name, identity_args)
);

DELETE FROM public._migration_06_function_backup;

INSERT INTO public._migration_06_function_backup (schema_name, function_name, identity_args, definition)
SELECT n.nspname,
       p.proname,
       pg_get_function_identity_arguments(p.oid),
       pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%pending_startnext_registrations%';

DO $$
DECLARE
    cnt integer;
BEGIN
    SELECT count(*) INTO cnt FROM public._migration_06_function_backup;
    RAISE NOTICE 'Backup 06: % funciones guardadas en public._migration_06_function_backup', cnt;
END $$;

-- ------------------------------------------------------------
-- PARTE 1: beneficios_startnext — verificación de orfandad y DROP
-- ------------------------------------------------------------
DO $$
DECLARE
    dep_functions text[] := '{}';
    dep_views     text[] := '{}';
    dep_fks       text[] := '{}';
    row_count     bigint := 0;
    tbl           regclass;
BEGIN
    IF to_regclass('public.beneficios_startnext') IS NULL THEN
        RAISE NOTICE 'Tabla beneficios_startnext NO existe. Nada que hacer.';
        RETURN;
    END IF;

    tbl := 'public.beneficios_startnext'::regclass;

    -- 1a. Funciones cuyo cuerpo la referencia
    SELECT COALESCE(array_agg(DISTINCT n.nspname || '.' || p.proname), '{}')
      INTO dep_functions
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE pg_get_functiondef(p.oid) ILIKE '%beneficios_startnext%';

    -- 1b. Vistas que la referencian
    SELECT COALESCE(array_agg(DISTINCT dependent.relname), '{}')
      INTO dep_views
    FROM pg_depend d
    JOIN pg_rewrite r ON r.oid = d.objid
    JOIN pg_class dependent ON dependent.oid = r.ev_class
    WHERE d.refobjid = tbl
      AND dependent.relkind = 'v';

    -- 1c. Foreign keys desde otras tablas hacia ella
    SELECT COALESCE(array_agg(DISTINCT con.conname || ' (desde ' || src.relname || ')'), '{}')
      INTO dep_fks
    FROM pg_constraint con
    JOIN pg_class src ON src.oid = con.conrelid
    WHERE con.confrelid = tbl
      AND con.contype = 'f';

    SELECT count(*) INTO row_count FROM public.beneficios_startnext;

    IF array_length(dep_functions, 1) IS NOT NULL
       OR array_length(dep_views, 1) IS NOT NULL
       OR array_length(dep_fks, 1) IS NOT NULL THEN
        RAISE NOTICE '⚠️ beneficios_startnext NO es huérfana. NO se elimina.';
        RAISE NOTICE '  Funciones dependientes: %', array_to_string(dep_functions, ', ');
        RAISE NOTICE '  Vistas dependientes: %', array_to_string(dep_views, ', ');
        RAISE NOTICE '  FKs dependientes: %', array_to_string(dep_fks, ', ');
    ELSE
        RAISE NOTICE 'beneficios_startnext es huérfana (0 funciones, 0 vistas, 0 FKs). Filas: %. Procediendo con DROP.', row_count;
        EXECUTE 'DROP TABLE public.beneficios_startnext';
        RAISE NOTICE '✅ Tabla beneficios_startnext ELIMINADA.';
    END IF;
END $$;

-- ------------------------------------------------------------
-- PARTE 2: pending_startnext_registrations -> pending_registrations
-- ------------------------------------------------------------
DO $$
DECLARE
    tbl regclass;
BEGIN
    IF to_regclass('public.pending_startnext_registrations') IS NULL THEN
        RAISE NOTICE 'Tabla pending_startnext_registrations NO existe. ¿Ya renombrada?';
    ELSE
        ALTER TABLE public.pending_startnext_registrations RENAME TO pending_registrations;
        RAISE NOTICE '✅ Tabla renombrada: pending_startnext_registrations -> pending_registrations';
    END IF;
END $$;

-- Reescritura de cuerpos de funciones (backup ya hecho en PARTE 0).
-- Patrón seguro: reemplazar el nombre de tabla sobre la DEFINICIÓN
-- COMPLETA que devuelve pg_get_functiondef(), la cual incluye
-- SECURITY DEFINER, SET search_path, idioma y todo el cuerpo.
DO $$
DECLARE
    fn record;
    changed int := 0;
BEGIN
    FOR fn IN
        SELECT p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosrc LIKE '%pending_startnext_registrations%'
    LOOP
        EXECUTE replace(
            pg_get_functiondef(fn.oid),
            'pending_startnext_registrations',
            'pending_registrations'
        );
        changed := changed + 1;
        RAISE NOTICE 'Función reescrita: %.%(%)',
            (SELECT n.nspname FROM pg_namespace n JOIN pg_proc p ON p.pronamespace=n.oid WHERE p.oid=fn.oid),
            (SELECT p.proname FROM pg_proc p WHERE p.oid=fn.oid),
            (SELECT pg_get_function_identity_arguments(fn.oid));
    END LOOP;
    RAISE NOTICE 'Total funciones reescritas: %', changed;
END $$;

-- ------------------------------------------------------------
-- PARTE 3: Renombrar RPC admin_process_startnext_contribution
--          -> admin_process_contribution (solo metadata)
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
          AND p.proname = 'admin_process_startnext_contribution'
    LOOP
        EXECUTE format(
            'ALTER FUNCTION %I.%I(%s) RENAME TO admin_process_contribution',
            fn.schema_name, fn.function_name, fn.identity_args
        );
        renamed := renamed + 1;
        RAISE NOTICE '✅ RPC renombrado: %.%(%) -> admin_process_contribution',
            fn.schema_name, fn.function_name, fn.identity_args;
    END LOOP;
    IF renamed = 0 THEN
        RAISE NOTICE 'RPC admin_process_startnext_contribution no encontrado (¿ya renombrado?).';
    END IF;
END $$;

-- ------------------------------------------------------------
-- PARTE 4: Vistas con prefijo startnext (renombres condicionales)
-- ------------------------------------------------------------
DO $$
BEGIN
    IF to_regclass('public.v_startnext_contributions_by_country') IS NOT NULL THEN
        EXECUTE 'ALTER VIEW public.v_startnext_contributions_by_country RENAME TO v_contributions_by_country';
        RAISE NOTICE '✅ Vista renombrada: v_startnext_contributions_by_country -> v_contributions_by_country';
    ELSE
        RAISE NOTICE 'Vista v_startnext_contributions_by_country no existe (¿ya renombrada?).';
    END IF;

    IF to_regclass('public.v_startnext_contributions_with_tiers') IS NOT NULL THEN
        EXECUTE 'ALTER VIEW public.v_startnext_contributions_with_tiers RENAME TO v_contributions_with_tiers';
        RAISE NOTICE '✅ Vista renombrada: v_startnext_contributions_with_tiers -> v_contributions_with_tiers';
    ELSE
        RAISE NOTICE 'Vista v_startnext_contributions_with_tiers no existe (¿ya renombrada por script 04?).';
    END IF;
END $$;

COMMIT;

-- ============================================================
-- PARTE 5: VERIFICACIÓN (ejecutar y revisar resultados)
-- ============================================================

-- V1: ¿Quedan objetos con "startnext" en el nombre? (esperado: solo lo que decida
--     mantener el usuario como dato legado, p.ej. roles/usuarios startnext_user)
SELECT table_type, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name ILIKE '%startnext%'
ORDER BY table_type, table_name;

SELECT n.nspname AS schema, p.proname AS funcion
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%startnext%'
ORDER BY 1, 2;

-- V2: Confirmar objetos nuevos
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('pending_registrations', 'contributions', 'imported_backers');

-- V3: Definición del RPC renombrado (revisar que su cuerpo ya no
--     menciona startnext ni asigna role 'startnext_user')
SELECT pg_get_functiondef(p.oid) AS funcion_renombrada
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'admin_process_contribution';

-- V4: Misiones/gamification_actions con slugs o target_role startnext
--     (informativo: desactivar o reasignar a user_premium desde el
--      panel de Gamificación o con el UPDATE opcional comentado)
DO $$
BEGIN
    IF to_regclass('public.gamification_actions') IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='gamification_actions' AND column_name='slug') THEN
            RAISE NOTICE 'Misiones con slug startnext:';
        END IF;
    END IF;
END $$;

SELECT id, slug, target_role
FROM public.gamification_actions
WHERE slug ILIKE '%startnext%' OR target_role = 'startnext_user';

-- UPDATE OPCIONAL (descomentar para desactivar en bloque):
-- UPDATE public.gamification_actions
-- SET is_active = false
-- WHERE slug ILIKE '%startnext%' OR target_role = 'startnext_user';

-- V5: Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- FIN
-- ============================================================
