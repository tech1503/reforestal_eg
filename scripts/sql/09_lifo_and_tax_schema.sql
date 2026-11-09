-- ============================================================
-- 09_lifo_and_tax_schema.sql
-- FASE 1 - LIFO + GenG Tax Shield
-- ============================================================

-- 1. Crear tabla verification_batches para bloqueo GenG (lotes de junta cada 3 meses)
CREATE TABLE IF NOT EXISTS public.verification_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_no TEXT NOT NULL UNIQUE,
    approved_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 2. Añadir tax_origin a ic_ledger ('SELF_REBATE' o 'NETWORK_BOUNTY')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ic_ledger' AND column_name = 'tax_origin'
    ) THEN
        ALTER TABLE public.ic_ledger ADD COLUMN tax_origin TEXT NOT NULL
            CHECK (tax_origin IN ('SELF_REBATE', 'NETWORK_BOUNTY'))
            DEFAULT 'SELF_REBATE';
        RAISE NOTICE '✅ Columna tax_origin añadida a ic_ledger';
    ELSE
        RAISE NOTICE '⚠️ Columna tax_origin ya existe en ic_ledger';
    END IF;
END $$;

-- 3. Añadir verbindlichkeiten_id a ic_ledger (referencia al lote de verificación)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ic_ledger' AND column_name = 'verbindlichkeiten_id'
    ) THEN
        -- Primero verificamos que verification_batches existe (ya creado arriba)
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verification_batches') THEN
            RAISE EXCEPTION 'La tabla verification_batches debe crearse antes de añadir verbindlichkeiten_id';
        END IF;

        ALTER TABLE public.ic_ledger ADD COLUMN verbindlichkeiten_id UUID
            REFERENCES public.verification_batches(id);
        RAISE NOTICE '✅ Columna verbindlichkeiten_id añadida a ic_ledger';
    ELSE
        RAISE NOTICE '⚠️ Columna verbindlichkeiten_id ya existe en ic_ledger';
    END IF;
END $$;