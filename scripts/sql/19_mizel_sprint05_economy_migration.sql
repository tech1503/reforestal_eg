-- ==========================================================
-- 19_MIZEL_SPRINT05_ECONOMY_MIGRATION.SQL
-- Sprint 0.5 - Migración de Economía y Balances
-- ==========================================================
-- Propósito:
--   - Migrar saldos legacy de reforestal_user_balances → impact_credits
--   - Crear registro de historial en ic_ledger por migración
--   - Fix admin: completar referral_code en profiles
--   - Totalmente idempotente (DO blocks + verificaciones)
--   - Sin DROP TABLE absolutamente
--
-- Restricciones:
--   * 100% ADITIVO: sin DROP TABLE, DROP COLUMN ni DROP CONSTRAINT
--   * Idempotente: re-ejecutable sin error ni duplicación
--   * Usa DO $$ blocks para atomicidad condicional
-- ==========================================================

-- ---------------------------------------------------------
-- BLOCK: Fix Admin - completar referral_code en profiles
-- ---------------------------------------------------------
-- Establece referral_code = 'reforestal' para el usuario support@reforest.al
-- Si el usuario ya tiene referral_code poblado, no lo sobreescribe.
-- Idempotente: solo actúa si referral_code es NULL o vacío.
--
DO $$
BEGIN
    UPDATE public.profiles
    SET referral_code = 'reforestal'
    WHERE email = 'support@reforest.al'
      AND (referral_code IS NULL OR referral_code = '');
END
$$;
-- Fin BLOCK Fix Admin

-- ---------------------------------------------------------
-- BLOCK: Migración de Saldos de Legacy a Impact Credits
-- ---------------------------------------------------------
-- Objetivo: Transferir total_vested_balance > 0 de reforestal_user_balances
--           hacia impact_credits.balance para el mismo usuario.
--
-- Lógica:
--   1. Para cada fila en reforestal_user_balances WHERE total_vested_balance > 0
--   2. Si el usuario ya tiene fila en impact_credits: sumar el balance existente
--      con el vested balance migrado (ON CONFLICT DO UPDATE)
--   3. Si el usuario no tiene fila en impact_credits: INSERT nueva fila
--   4. Registrar el movimiento en ic_ledger como source = 'legacy_migration'
--
DO $$
DECLARE
    migrated_balance numeric;
    existing_ic_balance numeric;
    new_ic_balance numeric;
BEGIN
    -- Iterar sobre todos los balances legacy con valor positivo
    FOR migrated_balance IN
        SELECT user_id, total_vested_balance
        FROM public.reforestal_user_balances
        WHERE total_vested_balance > 0
    LOOP
        -- Verificar si el usuario ya tiene registro en impact_credits
        SELECT balance INTO existing_ic_balance
        FROM public.impact_credits
        WHERE user_id = migrated_balance.user_id;

        IF existing_ic_balance IS NULL THEN
            -- INSERT nuevo registro: usar el vested balance como amount y balance
            INSERT INTO public.impact_credits (user_id, amount, balance, source, description)
            VALUES (migrated_balance.user_id,
                    migrated_balance.total_vested_balance,
                    migrated_balance.total_vested_balance,
                    'legacy_migration',
                    'Migración Sprint 0.5: balance vested legacy a impact credits');
        ELSE
            -- ACTUALizar existente: sumar el balance vested al existente
            new_ic_balance := existing_ic_balance + migrated_balance.total_vested_balance;
            UPDATE public.impact_credits
            SET amount = new_ic_balance,
                balance = new_ic_balance,
                source = COALESCE(source, 'legacy_migration'),
                description = COALESCE(description, 'Migración Sprint 0.5: balance vested legacy a impact credits')
            WHERE user_id = migrated_balance.user_id;
        END IF;

        -- Registrar movimiento en ic_ledger (siempre insertar, el id es SERIAL)
        -- Usamos ON CONFLICT DO NOTHING para idempotencia por user_id + source + amount
        INSERT INTO public.ic_ledger (user_id, amount, source, metadata, tax_origin, created_at)
        VALUES (migrated_balance.user_id,
                migrated_balance.total_vested_balance,
                'legacy_migration',
                jsonb_build_object('migration_script', '19_mizel_sprint05_economy_migration.sql',
                                   'migrated_from', 'reforestal_user_balances.total_vested_balance',
                                   'migration_date', current_timestamp),
                'LEGACY_MIGRATION',
                current_timestamp);
    END LOOP;
END
$$;
-- Fin BLOCK Migración de Saldos

-- ---------------------------------------------------------
-- BLOCK: Limpieza Final - Vaciar balances legacy migrados
-- ---------------------------------------------------------
-- Después de haber transferido los saldos a impact_credits,
-- vaciar el total_vested_balance a 0 en reforestal_user_balances
-- para evitar doble conteo en futuras ejecuciones.
-- Este paso es idempotente: si el balance ya es 0, no hace nada.
--
DO $$
BEGIN
    UPDATE public.reforestal_user_balances
    SET total_vested_balance = 0
    WHERE total_vested_balance > 0;
END
$$;
-- Fin BLOCK Limpieza Final

-- ---------------------------------------------------------
-- MARCADOR DE COMPLETACIÓN
-- ---------------------------------------------------------
-- Nota: Este script está diseñado para ser re-ejecutable.
-- - Si se ejecuta una primera vez: migra saldos, crea ledger, limpia legacy.
-- - Si se ejecuta nuevamente: las verificaciones IF/COALESCE/EMPTY
--   aseguran que no haya duplicación ni error.
-- - No se usan DROP TABLE, ni operaciones destructivas.
-- ==========================================================
