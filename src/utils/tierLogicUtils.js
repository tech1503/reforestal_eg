import { supabase } from '@/lib/customSupabaseClient';

/**
 * UTILS DE LÓGICA DE NIVELES (Tier Logic) - VERSIÓN PRODUCCIÓN
 * Prioridad: Base de Datos (support_levels)
 * Fallback: Constantes alineadas con DB (solo si falla la red)
 */

// --- FALLBACK CONSTANTS (Alineadas con tu DB actual para evitar 'Interferencias') ---
// NOTA: Se usan guiones bajos (_) en los slugs para coincidir con tu tabla 'support_levels'.
export const TIER_LEVELS = {
  EXPLORER_LIFELINE: {
    id: 'bedb258e-9555-4a15-8677-4d6b4b0b4910', // ID real aprox o placeholder
    slug: 'explorer_lifeline', // CORREGIDO: _ en lugar de -
    name: 'Explorer Lifeline',
    minAmount: 97.99,
    maxAmount: Infinity,
    currency: 'EUR',
    icReward: 100, // Valor fallback
    description: 'Maximum impact for true pioneers.'
  },
  EXPLORER_RIVERBED: {
    id: '458b4bf6-3444-4304-84d4-b2a7c3f27a3c',
    slug: 'explorer_riverbed', // CORREGIDO
    name: 'Explorer Riverbed',
    minAmount: 49.99,
    maxAmount: 97.98,
    currency: 'EUR',
    icReward: 50,
    description: 'Deepening the flow of support.'
  },
  EXPLORER_MOUNTAIN_STREAM: {
    id: 'd8c091e4-6f74-48ec-8c80-a96e1be7193e',
    slug: 'explorer_mountain_stream', // CORREGIDO
    name: 'Explorer Mountain Stream',
    minAmount: 14.99,
    maxAmount: 49.98,
    currency: 'EUR',
    icReward: 15,
    description: 'Steady support for the ecosystem.'
  },
  EXPLORER_MOUNTAIN_SPRING: {
    id: 'ad69841c-4699-44f0-82d2-a281974ec418',
    slug: 'explorer_mountain_spring', // CORREGIDO
    name: 'Explorer Mountain Spring',
    minAmount: 5.00,
    maxAmount: 14.98,
    currency: 'EUR',
    icReward: 5,
    description: 'The source of all growth.'
  }
};

// --- FUNCIONES ASÍNCRONAS (LÓGICA PRINCIPAL CON DB) ---

/**
 * Obtiene todos los niveles de soporte activos directamente desde Supabase.
 * @returns {Promise<Array>} Lista ordenada de niveles
 */
export const fetchSupportLevelsForLogic = async () => {
  try {
    const { data, error } = await supabase
      .from('support_levels')
      .select('id, slug, min_amount, max_amount, land_dollars_reward, impact_credits_reward, is_active, display_order')
      .eq('is_active', true)
      .order('min_amount', { ascending: true });

    if (error) {
      console.error('[TierLogic] Error fetching support levels:', error);
      return getAllTiers(); // Fallback a constantes si falla la DB
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[TierLogic] Unexpected error in fetchSupportLevelsForLogic:', err);
    return getAllTiers(); // Fallback
  }
};

/**
 * Encuentra el ID del nivel adecuado para un monto dado consultando la DB.
 * Es la función maestra para determinar qué nivel le toca a una contribución.
 * @param {number|string} amount 
 * @returns {Promise<string|null>} ID del nivel o null
 */
export const getSupportLevelByAmount = async (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val) || val < 0) return null;
  
  try {
    const levels = await fetchSupportLevelsForLogic();
    if (levels.length === 0) return null;
    
    // Ordenar por monto mínimo ascendente para asegurar lógica de rangos
    const sortedLevels = levels.sort((a, b) => (parseFloat(a.min_amount) || 0) - (parseFloat(b.min_amount) || 0));
    
    // Encontrar el nivel más alto que el monto satisface
    // Lógica: Si pago 50, satisfago 5, 15 y 50. El "match" es el último de la lista filtrada.
    const eligibleLevels = sortedLevels.filter(level => val >= (parseFloat(level.min_amount) || 0));
    const match = eligibleLevels.length > 0 ? eligibleLevels[eligibleLevels.length - 1] : null;
    
    return match ? match.id : null;
  } catch (err) {
    console.error('[TierLogic] Error in getSupportLevelByAmount:', err);
    return null;
  }
};

/**
 * Obtiene detalles completos de un nivel para mostrar en el frontend (Simulador/Dashboard).
 * Incluye traducciones y recompensas dinámicas.
 * @param {string} levelId 
 * @param {string} languageCode 
 * @returns {Promise<object>}
 */
export const getVariantDetails = async (levelId, languageCode = 'en') => {
  if (!levelId) return { variant_title: 'Unknown', logical_name: 'Unknown', min_amount: 0 };

  try {
    const { data: level, error } = await supabase
      .from('support_levels')
      .select(`
        *,
        support_level_translations(name, description, language_code)
      `)
      .eq('id', levelId)
      .single();

    if (error) {
       // Si no se encuentra (ID inválido o error de red), usamos un objeto seguro
       if (error.code !== 'PGRST116') {
         console.warn('[TierLogic] DB Error in getVariantDetails:', error.message);
       }
       // Intentar fallback si el ID coincide con alguna constante (raro pero posible)
       const fallback = Object.values(TIER_LEVELS).find(t => t.id === levelId);
       if (fallback) {
           return {
               id: fallback.id,
               slug: fallback.slug,
               variant_title: fallback.name,
               logical_name: fallback.slug.replace(/_/g, ' '),
               min_amount: fallback.minAmount,
               impact_credits_reward: fallback.icReward,
               land_dollars_reward: 0
           };
       }
       return { variant_title: 'Unknown Tier', logical_name: 'Unknown', min_amount: 0 };
    }

    // Procesar Traducciones
    const safeLang = typeof languageCode === 'string' ? languageCode.split('-')[0] : 'en';
    const translations = Array.isArray(level.support_level_translations) ? level.support_level_translations : [];
    
    const translation = translations.find(t => t.language_code === safeLang) 
                     || translations.find(t => t.language_code === 'en');

    // Retorno limpio y seguro
    return {
      id: level.id,
      slug: level.slug || 'unknown_slug',
      variant_title: translation?.name || level.slug || 'Unknown',
      logical_name: (level.slug || '').replace(/_/g, ' ').replace(/-/g, ' '), // Maneja ambos casos visualmente
      min_amount: level.min_amount || 0,
      description: translation?.description || '',
      impact_credits_reward: level.impact_credits_reward || 0,
      land_dollars_reward: level.land_dollars_reward || 0
    };
  } catch (err) {
    console.error('[TierLogic] Critical error in getVariantDetails:', err);
    return { variant_title: 'Error', logical_name: 'Error', min_amount: 0 };
  }
};

// --- FUNCIONES DE SOPORTE (SYNC / LEGACY COMPATIBILITY) ---
// Estas funciones se mantienen para no romper componentes viejos, pero usan las constantes corregidas.

export const getDefaultTier = () => TIER_LEVELS.EXPLORER_MOUNTAIN_SPRING;

export const isTierValid = (tier) => {
  return tier && typeof tier === 'object' && typeof tier.slug === 'string';
};

export const getAllTiers = () => {
  // Convertir el objeto de constantes a array y ordenar
  return Object.values(TIER_LEVELS).sort((a, b) => a.minAmount - b.minAmount);
};

export const getTierByAmount = (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val) || val < 5.00) return null;

  // Lógica sincrónica usando constantes (Solo para UI instantánea si es necesario)
  if (val >= TIER_LEVELS.EXPLORER_LIFELINE.minAmount) return TIER_LEVELS.EXPLORER_LIFELINE;
  if (val >= TIER_LEVELS.EXPLORER_RIVERBED.minAmount) return TIER_LEVELS.EXPLORER_RIVERBED;
  if (val >= TIER_LEVELS.EXPLORER_MOUNTAIN_STREAM.minAmount) return TIER_LEVELS.EXPLORER_MOUNTAIN_STREAM;
  if (val >= TIER_LEVELS.EXPLORER_MOUNTAIN_SPRING.minAmount) return TIER_LEVELS.EXPLORER_MOUNTAIN_SPRING;
  
  return null;
};

export const getTierBySlug = (slug) => {
  if (!slug) return null;
  // Normalizamos entrada para manejar confusion -/_
  const normalizedSlug = slug.replace(/-/g, '_').toLowerCase(); 
  return Object.values(TIER_LEVELS).find(t => t.slug === normalizedSlug) || null;
};

// Utilidad para limpiar nombres de slug
export const formatTierName = (slug) => {
    if (!slug) return 'Standard';
    return slug.replace(/explorer[-_]/i, '') 
               .replace(/[-_]/g, ' ')        
               .replace(/\b\w/g, l => l.toUpperCase()); 
};
