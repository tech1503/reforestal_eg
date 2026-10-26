-- ============================================================
-- 05_rename_startnext_policies.sql
-- FASE 1 / PASO 2b — Limpieza cosmética de políticas RLS
-- Rama: feat/strip-startnext
--
-- Renombra las 4 políticas RLS cuyo NOMBRE contiene "startnext":
--   1. "Admins view all pending_startnext_registrations" -> "Admins view all pending_registrations"
--   2. "Admins view all beneficios_startnext"            -> "Admins view all benefits"
--   3. "Admins view all startnext_imported_users"        -> "Admins view all imported_backers"
--   4. "Admins view all startnext_contributions"         -> "Admins view all contributions"
--
-- ⚠️ NO modifica ninguna regla de acceso: ALTER POLICY ... RENAME TO
--    solo cambia el nombre (metadatos puros). RLS sigue igual.
-- Idempotente: si se ejecuta dos veces, la segunda no renombra nada.
-- ============================================================

BEGIN;

DO $$
DECLARE
  pol      record;
  new_name text;
  attempt  int;
  suffix   text;
  renamed  int := 0;
BEGIN
  FOR pol IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN (
        'Admins view all pending_startnext_registrations',
        'Admins view all beneficios_startnext',
        'Admins view all startnext_imported_users',
        'Admins view all startnext_contributions'
      )
  LOOP
    -- Nombre nuevo: elimina cualquier variante de "startnext"
    new_name := pol.policyname;
    new_name := replace(new_name, 'pending_startnext_registrations', 'pending_registrations');
    new_name := replace(new_name, 'beneficios_startnext', 'benefits');
    new_name := replace(new_name, 'startnext_imported_users', 'imported_backers');
    new_name := replace(new_name, 'startnext_contributions', 'contributions');
    new_name := replace(new_name, 'startnext_', '');
    new_name := replace(new_name, '_startnext', '');

    -- Evita colisión de nombre en la misma tabla (3 intentos)
    FOR attempt IN 0..2 LOOP
      suffix := CASE WHEN attempt = 0 THEN '' ELSE '_v' || attempt END;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename  = pol.tablename
          AND p.policyname = new_name || suffix
      ) THEN
        EXECUTE format('ALTER POLICY %I ON public.%I RENAME TO %I',
                       pol.policyname, pol.tablename, new_name || suffix);
        renamed := renamed + 1;
        IF suffix <> '' THEN
          RAISE NOTICE 'Colisión: "%" -> "%" en tabla %.',
                       pol.policyname, new_name || suffix, pol.tablename;
        END IF;
        EXIT;
      END IF;
      IF attempt = 2 THEN
        RAISE NOTICE 'AVISO: no se renombró "%" en % (colisión persistente).',
                     pol.policyname, pol.tablename;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Total políticas renombradas: %', renamed;
END $$;

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

-- V1: ¿Queda alguna política con "startnext" en el NOMBRE? (esperado: 0 filas)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public' AND policyname ILIKE '%startnext%'
ORDER BY tablename, policyname;

-- V2: Las 9 políticas de tu informe 8e, con su tabla actual (referencia)
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname ILIKE '%startnext%' OR tablename ILIKE '%startnext%')
ORDER BY tablename, policyname;

-- V3: TABLAS que aún se llaman con "startnext" (tratadas en el Paso 3)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name ILIKE '%startnext%'
ORDER BY table_name;
-- Esperado: pending_startnext_registrations, beneficios_startnext

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- FIN
-- ============================================================
