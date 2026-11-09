-- ==========================================================
-- 18_MIZEL_SPRINT0_FOUNDATIONS.SQL
-- SPRINT 0 - Cimientos de datos para los Pilares A-E
-- Masterplan: A(Enrutador/Anastomose) C(Stop-Loss/FIFO)
--             D(GenG/Cortafuegos)    E(Regalos Myzel)
--
-- Fuente de verdad: dump de produccion actualizado
--   SYSTEM MIZEL/supabase-database.sql (2026-11-09)
--
-- LIMITACION DEL DUMP (declarada en su propia linea 1):
--   "WARNING: This schema is for context only ... not meant to be run"
--   El dump NO incluye indices, policies, funciones, ni constraints
--   a nivel de tabla (solo PRIMARY KEY / FOREIGN KEY e inline).
--   Por tanto, AUSENCIA en el dump != AUSENCIA en produccion.
--   Todo lo dudoso se resuelve con IF NOT EXISTS / pg_constraint
--   para que el script sea inocuo exista o no el objeto.
--
-- REGLAS DE ESTE SCRIPT:
--   * 100% ADITIVO. Ni un solo DROP (tabla, columna o constraint).
--   * Idempotente: re-ejecutable sin error (IF NOT EXISTS + DO blocks).
--   * Validacion de constraints existentes via pg_constraint.
--   * Constraints sobre datos existentes -> NOT VALID (no valida filas
--     viejas, solo las nuevas) para no romper produccion.
--   * RLS habilitado en TODA tabla nueva. Escritura solo via RPC
--     SECURITY DEFINER (no hay policy de INSERT/UPDATE para clientes).
--
-- VERIFICADO CONTRA DUMP:
--   [x] profiles.membership_stage/prepaid_ld_credits/
--       personal_ld_points_cap ......... YA EXISTEN (migracion 16)
--   [x] sponsor_pool_queue ............. YA EXISTE (migracion 15)
--   [x] anastomosis_log ................ YA EXISTE (migracion 15);
--                                        columnas nuevas = status,
--                                        scan_initiated_at,
--                                        initiated_by_user_id
--                                        (uq/chk se comprueban al ejecutar)
--   [x] land_dollar_tokens PK short_code ... YA EXISTE
--   [x] is_admin_safe() ................ YA EXISTE
--   [x] dynamic_links lectura publica .. YA EXISTE (patron a copiar)
--   [x] xp / community_level ........... NO EXISTE  -> se crea
--   [x] campaigns_and_events ........... NO EXISTE  -> se crea
--   [x] member_verifications ........... NO EXISTE  -> se crea
-- ==========================================================

BEGIN;

-- ==========================================================
-- 1. Pilar A - ANASTOMOSIS_LOG: columnas de estado que faltan
-- ==========================================================
-- El dump de produccion solo tiene: id, user_a_id, user_b_id,
-- last_handshake_at, handshake_count_total, PK y 2 FK.
-- Faltan las columnas que exige la Master-Spezifikation 6:
--   status, scan_initiated_at, initiated_by_user_id
-- ==========================================================

-- 1a. status (ENUM de texto: PENDING_CONFIRMATION | COMPLETED)
-- Estrategia de 2 pasos por seguridad con datos existentes:
--   Paso 1: DEFAULT 'COMPLETED' -> las filas viejas (si las hay)
--           representan apretones de mano YA confirmados.
--   Paso 2: tras el backfill, el default pasa a 'PENDING_CONFIRMATION'
--           que es el comportamiento correcto para INSERTs futuros.
ALTER TABLE public.anastomosis_log
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'COMPLETED';

ALTER TABLE public.anastomosis_log
    ALTER COLUMN status SET DEFAULT 'PENDING_CONFIRMATION';

-- 1b. Ventana de 60 segundos (la RPC calcula NOW() - scan_initiated_at)
ALTER TABLE public.anastomosis_log
    ADD COLUMN IF NOT EXISTS scan_initiated_at TIMESTAMPTZ;

-- 1c. Quien escaneo (dispara la ventana de confirmacion)
ALTER TABLE public.anastomosis_log
    ADD COLUMN IF NOT EXISTS initiated_by_user_id UUID
        REFERENCES public.profiles(id);

-- 1d. Orden canonico del par (LEAST/GREATEST) y unicidad del par.
--     La migracion 15 ya los declaro dentro del CREATE TABLE de
--     anastomosis_log, y como ese CREATE se ejecuto (la tabla existe),
--     es muy probable que ya esten y este bloque sea un no-op.
--     Se re-declaran SOLO por si la tabla se llego a crear por otra via.
--     El dump no los muestra porque omite constraints a nivel tabla.
DO $$
BEGIN
    -- chk_pair_order: se anade NOT VALID para no validar filas viejas
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.anastomosis_log'::regclass
          AND conname  = 'chk_pair_order'
    ) THEN
        ALTER TABLE public.anastomosis_log
            ADD CONSTRAINT chk_pair_order
            CHECK (user_a_id < user_b_id) NOT VALID;
    END IF;

    -- uq_pair_unique: solo si NO hay pares duplicados
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.anastomosis_log'::regclass
          AND conname  = 'uq_pair_unique'
    ) THEN
        IF EXISTS (
            SELECT user_a_id, user_b_id
            FROM public.anastomosis_log
            GROUP BY user_a_id, user_b_id
            HAVING COUNT(*) > 1
            LIMIT 1
        ) THEN
            RAISE NOTICE 'AVISO: no se creo uq_pair_unique, existen pares duplicados en anastomosis_log. Depurar y re-ejecutar solo la seccion 1d.';
        ELSE
            ALTER TABLE public.anastomosis_log
                ADD CONSTRAINT uq_pair_unique UNIQUE (user_a_id, user_b_id);
        END IF;
    END IF;
END $$;

-- 1e. Estado del apretón de mano (valores del ENUM de la spec)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.anastomosis_log'::regclass
          AND conname  = 'chk_anastomosis_status'
    ) THEN
        ALTER TABLE public.anastomosis_log
            ADD CONSTRAINT chk_anastomosis_status
            CHECK (status IN ('PENDING_CONFIRMATION', 'COMPLETED')) NOT VALID;
    END IF;
END $$;

-- 1f. Índices de lectura (cooldown de 30 días + contador mensual 3+27)
-- Contador mensual del gate 3+27: cuenta pares con last_handshake_at
-- dentro del mes. Se exige por usuario, hence los dos indices compuestos
-- por lado del par (una OR user_a_id = X OR user_b_id = X no usa indice).
CREATE INDEX IF NOT EXISTS idx_anastomosis_pair_a
    ON public.anastomosis_log (user_a_id, last_handshake_at);

CREATE INDEX IF NOT EXISTS idx_anastomosis_pair_b
    ON public.anastomosis_log (user_b_id, last_handshake_at);

-- Barrido de expiracion de las ventanas de 60s (solo pendientes)
CREATE INDEX IF NOT EXISTS idx_anastomosis_pending
    ON public.anastomosis_log (scan_initiated_at)
    WHERE status = 'PENDING_CONFIRMATION';

CREATE INDEX IF NOT EXISTS idx_anastomosis_initiated_by
    ON public.anastomosis_log (initiated_by_user_id);


-- ==========================================================
-- 2. Pilar A - CAMPAIGNS_AND_EVENTS (Zielseite der Event-Scheine)
-- ==========================================================
-- spec: campaign_slug PK, custom_headline, custom_subline,
--       custom_hero_image_url, show_manual_sponsor_input,
--       default_sponsor_user_id (FK nullable -> si NULL, la
--       asignacion cae a la sponsor_pool_queue global / FIFO)
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.campaigns_and_events (
    campaign_slug            VARCHAR(32) PRIMARY KEY,
    custom_headline          VARCHAR(255),
    custom_subline           TEXT,
    custom_hero_image_url    VARCHAR(255),
    show_manual_sponsor_input BOOLEAN NOT NULL DEFAULT FALSE,
    default_sponsor_user_id  UUID REFERENCES public.profiles(id),
    is_active                BOOLEAN NOT NULL DEFAULT TRUE,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_campaign_slug_format
        CHECK (campaign_slug = lower(campaign_slug))
);

ALTER TABLE public.campaigns_and_events ENABLE ROW LEVEL SECURITY;

-- Lectura publica: el router resuelve el codigo ANTES del login,
-- por eso TO PUBLIC (anon + authenticated), igual que dynamic_links.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'campaigns_and_events'
          AND policyname = 'Campaigns public read'
    ) THEN
        CREATE POLICY "Campaigns public read"
            ON public.campaigns_and_events
            FOR SELECT TO PUBLIC
            USING (is_active = TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'campaigns_and_events'
          AND policyname = 'Campaigns admin manage'
    ) THEN
        CREATE POLICY "Campaigns admin manage"
            ON public.campaigns_and_events
            FOR ALL TO authenticated
            USING (is_admin_safe())
            WITH CHECK (is_admin_safe());
    END IF;
END $$;

-- Seed optativo: rfr.st/start (Schein Typ A, campo manual de sponsor)
INSERT INTO public.campaigns_and_events (
    campaign_slug, custom_headline, custom_subline, show_manual_sponsor_input
) VALUES (
    'start',
    'Willkommen im Myzel',
    'Steht auf deinem Schein der Name deines Einladenden?',
    TRUE
)
ON CONFLICT (campaign_slug) DO NOTHING;


-- ==========================================================
-- 3. Sistemas de niveles XP (3 Pilares) - prerequisito de
--    A (Nivel 4 abre Anastomose) y de B (Nivel 2 abre Wallet)
-- ==========================================================
-- Zero-Dev-Bloat: tabla en vez de 3 columnas en profiles.
-- Motivo de SEGURIDAD: profiles permite UPDATE al propio usuario
--   (policy "Users can update their own profile"), luego unas
--   columnas de XP en profiles serian auto-editables por el cliente.
--   En una tabla propia con RLS de SOLO SELECT, la escritura unica
--   posible es via RPC SECURITY DEFINER.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_xp (
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pillar     TEXT NOT NULL,
    xp         INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_xp_pkey PRIMARY KEY (user_id, pillar),
    CONSTRAINT chk_xp_pillar CHECK (
        pillar IN ('environment', 'data', 'community')
    )
);

CREATE INDEX IF NOT EXISTS idx_user_xp_pillar
    ON public.user_xp (pillar, xp DESC);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'user_xp'
          AND policyname = 'Users read own XP'
    ) THEN
        CREATE POLICY "Users read own XP"
            ON public.user_xp
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'user_xp'
          AND policyname = 'Admins read all XP'
    ) THEN
        CREATE POLICY "Admins read all XP"
            ON public.user_xp
            FOR SELECT TO authenticated
            USING (is_admin_safe());
    END IF;
    -- SIN policy de INSERT/UPDATE: escritura exclusiva por RPC.
END $$;


-- Umbral de niveles 1-10 (SSOT: Modul II, Kapitel 5.2)
CREATE TABLE IF NOT EXISTS public.xp_level_thresholds (
    level                INTEGER PRIMARY KEY,
    xp_required          INTEGER NOT NULL,
    level_up_bonus_points INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT chk_xp_level_range CHECK (level BETWEEN 1 AND 10)
);

ALTER TABLE public.xp_level_thresholds ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'xp_level_thresholds'
          AND policyname = 'XP thresholds public read'
    ) THEN
        CREATE POLICY "XP thresholds public read"
            ON public.xp_level_thresholds
            FOR SELECT TO PUBLIC
            USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'xp_level_thresholds'
          AND policyname = 'XP thresholds admin manage'
    ) THEN
        CREATE POLICY "XP thresholds admin manage"
            ON public.xp_level_thresholds
            FOR ALL TO authenticated
            USING (is_admin_safe())
            WITH CHECK (is_admin_safe());
    END IF;
END $$;

-- Seed: niveles exactos de la spec (0/40/120/250/450/750/1150/1700/2400/3300)
INSERT INTO public.xp_level_thresholds
    (level, xp_required, level_up_bonus_points) VALUES
    (1,     0,      0),
    (2,     40,     10),
    (3,     120,    15),
    (4,     250,    20),
    (5,     450,    25),
    (6,     750,    30),
    (7,     1150,   40),
    (8,     1700,   50),
    (9,     2400,   75),
    (10,    3300,   100)
ON CONFLICT (level) DO NOTHING;

-- Helper puro: XP -> nivel. Usado por los gates de A (Nivel 4),
-- D (Nivel 2) y B (Nivel 2). CREATE OR REPLACE = aditivo.
CREATE OR REPLACE FUNCTION public.get_xp_level(p_xp INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(
        (
            SELECT MAX(l.level)
            FROM public.xp_level_thresholds l
            WHERE l.xp_required <= GREATEST(COALESCE(p_xp, 0), 0)
        ),
        1
    );
$$;


-- ==========================================================
-- 4. Pilar C - Stop-Loss / Pool FIFO: indices de acceso
-- ==========================================================
-- La RPC claim_start_land_dollar hace:
--   ORDER BY created_at ASC LIMIT 1  WHERE shares_remaining > 0
-- ==========================================================

-- 4a. Reservado vs. liberado (spec 4.4: "entweder reserviert fuer den
--     eigenen Code oder freigegeben fuer die globale FIFO-Warteschlange").
--     Sin esta columna la RPC de cascada no puede distinguir un batch
--     privado de un batch publico, y los batches privados se consumirian
--     por el codigo de cualquiera. DEFAULT TRUE = comportamiento actual
--     (todo lo existente queda en la cola global, sin regresion).
ALTER TABLE public.sponsor_pool_queue
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT TRUE;

-- 4b. El FIFO publico solo debe barrer batches liberados.
CREATE INDEX IF NOT EXISTS idx_sponsor_pool_fifo
    ON public.sponsor_pool_queue (created_at)
    WHERE shares_remaining > 0 AND is_public;

CREATE INDEX IF NOT EXISTS idx_sponsor_pool_owner
    ON public.sponsor_pool_queue (sponsor_user_id);

-- Integridad del stock del pool (solo filas nuevas, NOT VALID)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.sponsor_pool_queue'::regclass
          AND conname  = 'chk_pool_stock_non_negative'
    ) THEN
        ALTER TABLE public.sponsor_pool_queue
            ADD CONSTRAINT chk_pool_stock_non_negative
            CHECK (shares_remaining >= 0 AND shares_total >= 0) NOT VALID;
    END IF;
END $$;

-- 4c. ENUM de origen (spec 4.4). El dump lo trae como TEXT plano.
--     NOT VALID = no valida filas viejas (pueden traer valores distintos),
--     solo las nuevas escritas por las RPC del Sprint 2.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.sponsor_pool_queue'::regclass
          AND conname  = 'chk_pool_source_type'
    ) THEN
        ALTER TABLE public.sponsor_pool_queue
            ADD CONSTRAINT chk_pool_source_type
            CHECK (
                source_type IS NULL
                OR source_type IN ('EUR_DONATION', 'LIFO_POINTS')
            ) NOT VALID;
    END IF;
END $$;

-- lookup del reclamo por codigo (el escáner consulta first_claimed)
CREATE INDEX IF NOT EXISTS idx_land_dollar_first_claimed
    ON public.land_dollar_tokens (first_claimed_by_user_id)
    WHERE first_claimed_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_land_dollar_assigned_sponsor
    ON public.land_dollar_tokens (assigned_sponsor_id)
    WHERE assigned_sponsor_id IS NOT NULL;


-- ==========================================================
-- 5. Pilar D - MEMBER_VERIFICATIONS (§15, 15b GenG)
-- ==========================================================
-- Tabla dedicada en vez de columnas en profiles:
--   * Aisla los PII legales (GDPR: exportar/borrar en un sitio).
--   * RLS estricto: solo el propio usuario ve su fila.
--   * identity_hash = hash(vorname + nachname + geburtsdatum + plz)
--     UNIQUE -> antifraude de duplicados (spec 5.2, Stufe 3).
-- Campos vacios hasta que Sprint 4 invoque el formulario de 60s.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.member_verifications (
    user_id                 UUID PRIMARY KEY
                                REFERENCES public.profiles(id) ON DELETE CASCADE,
    first_name              TEXT,
    last_name               TEXT,
    street                  TEXT,
    zip                     TEXT,
    city                    TEXT,
    birth_date              DATE,
    declaration_accepted_at TIMESTAMPTZ,
    identity_hash           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_member_identity_hash
    ON public.member_verifications (identity_hash)
    WHERE identity_hash IS NOT NULL;

ALTER TABLE public.member_verifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'member_verifications'
          AND policyname = 'Members read own verification'
    ) THEN
        CREATE POLICY "Members read own verification"
            ON public.member_verifications
            FOR SELECT TO authenticated
            USING (auth.uid() = user_id);
    END IF;

    -- SIN policy de INSERT/UPDATE para el cliente: el formulario
    -- §15 se escribe unicamente via RPC SECURITY DEFINER (Sprint 4).
    -- Motivo antifraude: si el cliente pudiera INSERTar su fila,
    -- podria precargar identity_hash ajenos y bloquear el alta de
    -- personas reales (unicidad = target de DoS).
    -- Escritura unica: RPC que calcula el hash en el servidor.

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename  = 'member_verifications'
          AND policyname = 'Admins read verifications'
    ) THEN
        CREATE POLICY "Admins read verifications"
            ON public.member_verifications
            FOR SELECT TO authenticated
            USING (is_admin_safe());
    END IF;
    -- SIN policy de DELETE: borrado solo via RPC/admin.
END $$;


-- ==========================================================
-- 6. Permisos de tabla (los dumps NO los incluyen)
-- ==========================================================
-- Supabase aplica default privileges para tablas creadas por el rol
-- de la SQL editor, pero se declaran explicitamente para no depender
-- de eso. Defensa en profundidad:
--   * user_xp / member_verifications: el cliente solo LEE.
--     El REVOKE de escritura es coherente con el "sin policy de
--     INSERT/UPDATE" -> la escritura unica es la RPC SECURITY
--     DEFINER (ejecutada como dueño de la funcion, no afectada
--     por estos REVOKE).
--   * member_verifications = PII legal: nada de INSERT por REST.
-- ==========================================================

-- Envueltos en DO + chequeo de roles: si este script corriera fuera de
-- Supabase (sin rol anon/authenticated) los GRANT fallarian y abortarian
-- TODO el txn, incluidas las tablas ya creadas. Asi nunca rompe el commit.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        -- Lectura publica (anon) solo donde el router lo necesita pre-login
        GRANT SELECT ON public.campaigns_and_events TO anon, authenticated;
        GRANT SELECT ON public.xp_level_thresholds    TO anon, authenticated;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_xp FROM anon;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.member_verifications FROM anon;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        -- Escritura de campañas: RLS ya restringe a is_admin()
        GRANT INSERT, UPDATE, DELETE ON public.campaigns_and_events TO authenticated;
        GRANT INSERT, UPDATE, DELETE ON public.xp_level_thresholds   TO authenticated;

        -- XP: el cliente solo consulta (su fila y los umbrales)
        GRANT SELECT ON public.user_xp TO authenticated;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.user_xp FROM authenticated;

        -- PII legal: solo lectura de la propia fila por RLS
        GRANT SELECT ON public.member_verifications TO authenticated;
        REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.member_verifications FROM authenticated;
    END IF;
END $$;

COMMIT;

-- ==========================================================
-- 7. Seed optativo - Batch #1 del Pool FIFO (spec 4.4) - POST-COMMIT
-- ==========================================================
-- 5.000 Anteile de Peter. Va FUERA de la transaccion principal:
--   sponsor_pool_queue es una tabla preexistente cuyo owner/RLS no
--   controlamos desde aqui. Si este INSERT fallara (permisos, RLS o
--   porque no existe el perfil 'peter'), no debe arrastrar al rollback
--   del esquema ya creado. El EXCEPTION lo convierte en NOTICE.
--
-- Doble proteccion:
--   1) solo si existe un perfil con referral_code = 'peter'
--   2) solo si la cola esta completamente vacia (nunca reemplaza
--      un batch existente)
-- Si prefieres cargarlo manualmente, borra este bloque antes de ejecutar.
-- ==========================================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = 'peter')
       AND NOT EXISTS (SELECT 1 FROM public.sponsor_pool_queue) THEN
        INSERT INTO public.sponsor_pool_queue
            (sponsor_user_id, shares_total, shares_remaining, source_type)
        SELECT id, 5000, 5000, 'EUR_DONATION'
        FROM public.profiles
        WHERE referral_code = 'peter';
        RAISE NOTICE 'Seed: Batch #1 del Pool FIFO creado (5000 shares, sponsor = peter).';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Seed OMITIDO del Pool FIFO (no crítico): %', SQLERRM;
END $$;

-- ==========================================================
-- FIN 18_MIZEL_SPRINT0_FOUNDATIONS.SQL
-- ==========================================================


-- ==========================================================
-- VERIFICACION POST-EJECUCION (ejecutar a mano, SELECTs)
-- ==========================================================
/*
-- 1. Columnas nuevas de anastomosis_log
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'anastomosis_log'
ORDER BY ordinal_position;
-- Esperado: status (default 'PENDING_CONFIRMATION'),
--           scan_initiated_at, initiated_by_user_id

-- 2. Restricciones del par (verificar si ya existian de migracion 15)
--    Si ya existian, el script 18 las dejo intactas (no-op).
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.anastomosis_log'::regclass;
-- Esperado: chk_pair_order, uq_pair_unique, chk_anastomosis_status

-- 3. Tablas nuevas + RLS activo
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('campaigns_and_events', 'user_xp',
                    'xp_level_thresholds', 'member_verifications');
-- Esperado: relrowsecurity = t en las 4

-- 4. Policies creadas
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('campaigns_and_events', 'user_xp',
                    'xp_level_thresholds', 'member_verifications')
ORDER BY tablename, policyname;

-- 5. Semillas
SELECT * FROM public.xp_level_thresholds ORDER BY level;  -- 10 filas
SELECT campaign_slug, show_manual_sponsor_input
FROM public.campaigns_and_events;                        -- 'start'
SELECT batch_id, shares_total, shares_remaining, source_type, is_public
FROM public.sponsor_pool_queue;                          -- Batch #1 o vacio

-- 6. Niveles XP calculados
SELECT public.get_xp_level(0)   AS lvl_0,   -- 1
       public.get_xp_level(40)  AS lvl_40,  -- 2
       public.get_xp_level(249) AS lvl_249, -- 3
       public.get_xp_level(250) AS lvl_250; -- 4

-- 7. Columna reservado/liberado del pool (Sprint 2)
SELECT column_name, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'sponsor_pool_queue'
  AND column_name  = 'is_public';
-- Esperado: is_public | true | NO   (los batches existentes quedan publicos)

-- =========================================================
-- 8. DIAGNOSTICO PRE-SPRINT 1 (ejecutar ANTES de empezar Sprint 1)
-- =========================================================
-- 8a. ¿profiles.referral_code esta poblado?
--     El trigger del repo (01_auth_trigger.sql) NO escribe referral_code;
--     signUp() lo guarda en auth metadata. Si en produccion no hay otro
--     mecanismo, los nicknames nunca llegan a profiles y el Enrutador
--     Universal no podra resolver rfr.st/[nickname] para esos usuarios.
SELECT count(*)                              AS total_perfiles,
       count(referral_code)                  AS con_nickname,
       count(*) - count(referral_code)       AS sin_nickname
FROM public.profiles;
-- Si sin_nickname > 0 -> resolver ANTES del Sprint 1 (ver nota final).

-- 8b. land_dollar_tokens.user_id sigue NOT NULL (contradice el dump reportado)
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'land_dollar_tokens'
  AND column_name  = 'user_id';
-- Si is_nullable = 'NO' -> los INSERT sin user_id siguen fallando en logs.

-- 8c. Sanidad del pool
SELECT count(*) FILTER (WHERE shares_remaining > shares_total) AS filas_invalidas,
       count(*) FILTER (WHERE NOT is_public)                   AS batches_reservados
FROM public.sponsor_pool_queue;
*/


-- ==========================================================
-- ROLLBACK (SOLO EMERGENCIA - deshace este script)
-- Los DROP eliminan columnas/tables; ejecutar con cuidado.
-- ==========================================================
/*
BEGIN;

ALTER TABLE public.anastomosis_log DROP COLUMN IF EXISTS status;
ALTER TABLE public.anastomosis_log DROP COLUMN IF EXISTS scan_initiated_at;
ALTER TABLE public.anastomosis_log DROP COLUMN IF EXISTS initiated_by_user_id;
ALTER TABLE public.anastomosis_log DROP CONSTRAINT IF EXISTS chk_pair_order;
ALTER TABLE public.anastomosis_log DROP CONSTRAINT IF EXISTS uq_pair_unique;
ALTER TABLE public.anastomosis_log DROP CONSTRAINT IF EXISTS chk_anastomosis_status;
DROP INDEX IF EXISTS public.idx_anastomosis_pair_a;
DROP INDEX IF EXISTS public.idx_anastomosis_pair_b;
DROP INDEX IF EXISTS public.idx_anastomosis_pending;
DROP INDEX IF EXISTS public.idx_anastomosis_initiated_by;

DROP TABLE IF EXISTS public.campaigns_and_events;

DROP FUNCTION IF EXISTS public.get_xp_level(INTEGER);
DROP TABLE IF EXISTS public.xp_level_thresholds;
DROP TABLE IF EXISTS public.user_xp;

DROP INDEX IF EXISTS public.idx_sponsor_pool_fifo;
DROP INDEX IF EXISTS public.idx_sponsor_pool_owner;
ALTER TABLE public.sponsor_pool_queue
    DROP CONSTRAINT IF EXISTS chk_pool_stock_non_negative;
ALTER TABLE public.sponsor_pool_queue
    DROP CONSTRAINT IF EXISTS chk_pool_source_type;
-- OJO: si ya existen batches con is_public = FALSE, esta linea los pierde.
ALTER TABLE public.sponsor_pool_queue DROP COLUMN IF EXISTS is_public;
DROP INDEX IF EXISTS public.idx_land_dollar_first_claimed;
DROP INDEX IF EXISTS public.idx_land_dollar_assigned_sponsor;

DROP TABLE IF EXISTS public.member_verifications;

COMMIT;
*/
