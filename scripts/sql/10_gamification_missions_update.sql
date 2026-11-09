-- ============================================================
-- 10_gamification_missions_update.sql
-- FASE 2 - Gamificación: categorías A/C/D + Pay-to-Quest
-- ============================================================

-- Añadir columnas a genesis_missions para categorías y mecánica Pay-to-Quest
DO $$
DECLARE
    v_category_col boolean;
    v_level_col boolean;
    v_grade_col boolean;
    v_points_cost_col boolean;
BEGIN
    -- category: A (Ambiente), C (Colaboración), D (Datos Sólidos)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'genesis_missions' AND column_name = 'category'
    ) INTO v_category_col;
    
    IF NOT v_category_col THEN
        ALTER TABLE public.genesis_missions ADD COLUMN category TEXT NOT NULL
            CHECK (category IN ('A','C','D'));
        RAISE NOTICE '✅ Columna category añadida a genesis_missions';
    ELSE
        RAISE NOTICE '⚠️ Columna category ya existe en genesis_missions';
    END IF;

    -- level: 0, 1, 2, 3
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'genesis_missions' AND column_name = 'level'
    ) INTO v_level_col;
    
    IF NOT v_level_col THEN
        ALTER TABLE public.genesis_missions ADD COLUMN level SMALLINT NOT NULL
            CHECK (level IN (0,1,2,3));
        RAISE NOTICE '✅ Columna level añadida a genesis_missions';
    ELSE
        RAISE NOTICE '⚠️ Columna level ya existe en genesis_missions';
    END IF;

    -- grade_unlock: 1, 2, 3, 4 (grado de desbloqueo; basic=1, premium=4)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'genesis_missions' AND column_name = 'grade_unlock'
    ) INTO v_grade_col;
    
    IF NOT v_grade_col THEN
        ALTER TABLE public.genesis_missions ADD COLUMN grade_unlock SMALLINT NOT NULL
            CHECK (grade_unlock IN (1,2,3,4));
        RAISE NOTICE '✅ Columna grade_unlock añadida a genesis_missions';
    ELSE
        RAISE NOTICE '⚠️ Columna grade_unlock ya existe en genesis_missions';
    END IF;

    -- points_cost: puntos necesarios para desbloquear la misión (consumo LIFO)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'genesis_missions' AND column_name = 'points_cost'
    ) INTO v_points_cost_col;
    
    IF NOT v_points_cost_col THEN
        ALTER TABLE public.genesis_missions ADD COLUMN points_cost INTEGER NOT NULL DEFAULT 100;
        RAISE NOTICE '✅ Columna points_cost añadida a genesis_missions';
    ELSE
        RAISE NOTICE '⚠️ Columna points_cost ya existe en genesis_missions';
    END IF;
END $$;