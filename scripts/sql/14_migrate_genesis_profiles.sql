-- ============================================================
-- 14_migrate_genesis_profiles.sql
-- FASE DE MIGRACIÓN: Perfiles Lena/Markus/David -> Habilidades A/C/D
-- ============================================================

-- 1. Migración de profiles.genesis_profile y profile_percentages
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id, genesis_profile, profile_percentages FROM public.profiles WHERE genesis_profile IS NOT NULL LOOP
        -- Actualizar genesis_profile
        IF r.genesis_profile = 'lena' OR r.genesis_profile = 'Lena' THEN
            UPDATE public.profiles SET genesis_profile = 'ambiente' WHERE id = r.id;
        ELSIF r.genesis_profile = 'markus' OR r.genesis_profile = 'Markus' THEN
            UPDATE public.profiles SET genesis_profile = 'colaboracion' WHERE id = r.id;
        ELSIF r.genesis_profile = 'david' OR r.genesis_profile = 'David' THEN
            UPDATE public.profiles SET genesis_profile = 'datos_solidos' WHERE id = r.id;
        END IF;

        -- Actualizar profile_percentages (JSONB) reemplazando claves
        IF r.profile_percentages IS NOT NULL THEN
            UPDATE public.profiles
            SET profile_percentages = jsonb_set(
                jsonb_set(
                    jsonb_set(
                        CASE
                            WHEN r.profile_percentages ? 'lena' THEN jsonb_set(r.profile_percentages, '{ambiente}', r.profile_percentages->'lena') - 'lena'
                            WHEN r.profile_percentages ? 'Lena' THEN jsonb_set(r.profile_percentages, '{ambiente}', r.profile_percentages->'Lena') - 'Lena'
                            ELSE r.profile_percentages
                        END,
                        '{colaboracion}',
                        CASE WHEN r.profile_percentages ? 'markus' THEN r.profile_percentages->'markus'
                             WHEN r.profile_percentages ? 'Markus' THEN r.profile_percentages->'Markus'
                             ELSE r.profile_percentages->'colaboracion'
                        END
                    ) - CASE WHEN r.profile_percentages ? 'markus' THEN ARRAY['markus'] WHEN r.profile_percentages ? 'Markus' THEN ARRAY['Markus'] ELSE ARRAY[]::text[] END,
                    '{datos_solidos}',
                    CASE WHEN r.profile_percentages ? 'david' THEN r.profile_percentages->'david'
                         WHEN r.profile_percentages ? 'David' THEN r.profile_percentages->'David'
                         ELSE r.profile_percentages->'datos_solidos'
                    END
                ) - CASE WHEN r.profile_percentages ? 'david' THEN ARRAY['david'] WHEN r.profile_percentages ? 'David' THEN ARRAY['David'] ELSE ARRAY[]::text[] END
            )
            WHERE id = r.id;
        END IF;
    END LOOP;
END $$;

-- 2. Migración de user_profiles (si aplica)
UPDATE public.user_profiles SET profile = CASE
    WHEN profile IN ('lena', 'Lena') THEN 'ambiente'
    WHEN profile IN ('markus', 'Markus') THEN 'colaboracion'
    WHEN profile IN ('david', 'David') THEN 'datos_solidos'
    ELSE profile
END WHERE profile IS NOT NULL;

-- 3. Verificación final (opcional, para auditoría)
SELECT
    genesis_profile,
    COUNT(*) as user_count
FROM public.profiles
GROUP BY genesis_profile
ORDER BY genesis_profile;
