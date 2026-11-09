-- ============================================================
-- 11_node_brightness.sql
-- FASE 1 - Entropía Suave: tabla de luminosidad de nodos
-- ============================================================

-- Crear tabla node_brightness con luminosity default 1.0
-- La luminosidad decrece un 10% mensual por inactividad
CREATE TABLE IF NOT EXISTS public.node_brightness (
    node_id TEXT PRIMARY KEY,
    luminosity NUMERIC NOT NULL DEFAULT 1.0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para inicializar luminosity al 1.0 al insertar
CREATE OR REPLACE FUNCTION public.set_node_brightness_default()
RETURNS TRIGGER AS $$
BEGIN
    NEW.luminosity := COALESCE(NEW.luminosity, 1.0);
    NEW.updated_at := COALESCE(NEW.updated_at, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_node_brightness_default ON public.node_brightness;
CREATE TRIGGER trg_node_brightness_default
    BEFORE INSERT ON public.node_brightness
    FOR EACH ROW
    EXECUTE FUNCTION public.set_node_brightness_default();

-- Índice para búsquedas rápidas por luminosidad
CREATE INDEX IF NOT EXISTS idx_node_brightness_luminosity ON public.node_brightness (luminosity);

-- Job de penalización mensual (ejecutar como cron o pg_cron):
-- UPDATE node_brightness SET luminosity = luminosity * 0.9 WHERE updated_at < NOW() - INTERVAL '1 month';
-- UPDATE node_brightness SET updated_at = NOW() WHERE updated_at < NOW() - INTERVAL '1 month';

RAISE NOTICE '✅ Tabla node_brightness creada correctamente';