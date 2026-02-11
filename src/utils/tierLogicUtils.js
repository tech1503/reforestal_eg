import { supabase } from '@/lib/customSupabaseClient';

export const TIER_LEVELS = {
  EXPLORER_LIFELINE: {
    id: 'bedb258e-9555-4a15-8677-4d6b4b0b4910',
    slug: 'explorer_lifeline', 
    name: 'Explorer Lifeline',
    minAmount: 97.99,
    description: 'Maximum impact for true pioneers.'
  },
  EXPLORER_RIVERBED: {
    id: '458b4bf6-3444-4304-84d4-b2a7c3f27a3c',
    slug: 'explorer_riverbed',
    name: 'Explorer Riverbed',
    minAmount: 49.99,
    description: 'Deepening the flow of support.'
  },
  EXPLORER_MOUNTAIN_STREAM: {
    id: 'd8c091e4-6f74-48ec-8c80-a96e1be7193e',
    slug: 'explorer_mountain_stream',
    name: 'Explorer Mountain Stream',
    minAmount: 14.99,
    description: 'Steady support for the ecosystem.'
  },
  EXPLORER_MOUNTAIN_SPRING: {
    id: 'ad69841c-4699-44f0-82d2-a281974ec418',
    slug: 'explorer_mountain_spring',
    name: 'Explorer Mountain Spring',
    minAmount: 5.00,
    description: 'The source of all growth.'
  }
};

// --- LÓGICA HÍBRIDA ---

/**
 * * @param {number|string} amount 
 * @returns {number} 
 */
export const calculateDynamicCredits = (amount) => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 0) return 0;

    
    if (val === 5) return 1000;
    if (val === 14.99) return 3000;
    if (val === 49.99) return 10000;
    if (val === 97.99) return 25000;


    const MULTIPLIER = 260; 
    
    return Math.floor(val * MULTIPLIER);
};


/**
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
      return Object.values(TIER_LEVELS).sort((a, b) => a.minAmount - b.minAmount);
    }
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('[TierLogic] Unexpected error in fetchSupportLevelsForLogic:', err);
    return Object.values(TIER_LEVELS).sort((a, b) => a.minAmount - b.minAmount);
  }
};

/**
 * @param {number|string} amount 
 * @returns {Promise<string|null>} 
 */
export const getSupportLevelByAmount = async (amount) => {
  const val = parseFloat(amount);
  if (isNaN(val) || val < 0) return null;
  
  try {
    const levels = await fetchSupportLevelsForLogic();
    if (levels.length === 0) return null;
    
    const sortedLevels = levels.sort((a, b) => (parseFloat(a.min_amount) || 0) - (parseFloat(b.min_amount) || 0));
    
    const eligibleLevels = sortedLevels.filter(level => val >= (parseFloat(level.min_amount) || 0));
    const match = eligibleLevels.length > 0 ? eligibleLevels[eligibleLevels.length - 1] : null;
    
    return match ? match.id : null;
  } catch (err) {
    console.error('[TierLogic] Error in getSupportLevelByAmount:', err);
    return null;
  }
};

/**
 * @param {string} levelId 
 * @param {string} languageCode 
 * @returns {Promise<object>}
 */
export const getVariantDetails = async (levelId, languageCode = 'en') => {
  if (!levelId) return null;

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
       const fallback = Object.values(TIER_LEVELS).find(t => t.id === levelId);
       if (fallback) {
           return {
               id: fallback.id,
               slug: fallback.slug,
               variant_title: fallback.name,
               logical_name: fallback.slug.replace(/_/g, ' '),
               min_amount: fallback.minAmount,
               land_dollars_reward: 0
           };
       }
       return null;
    }

    const safeLang = typeof languageCode === 'string' ? languageCode.split('-')[0] : 'en';
    const translations = Array.isArray(level.support_level_translations) ? level.support_level_translations : [];
    
    const translation = translations.find(t => t.language_code === safeLang) 
                     || translations.find(t => t.language_code === 'en');

    return {
      id: level.id,
      slug: level.slug || 'unknown_slug',
      variant_title: translation?.name || level.slug || 'Unknown',
      logical_name: (level.slug || '').replace(/_/g, ' ').replace(/-/g, ' ').replace('explorer', '').trim(), 
      min_amount: level.min_amount || 0,
      description: translation?.description || '',
      land_dollars_reward: level.land_dollars_reward || 0
    };
  } catch (err) {
    console.error('[TierLogic] Critical error in getVariantDetails:', err);
    return null;
  }
};

// --- FUNCIONES DE SOPORTE LEGACY / HELPERS ---

export const getVariantIconName = (slug) => {
    if (!slug) return 'mountain-spring';
    if (slug.includes('lifeline')) return 'lifeline';
    if (slug.includes('river')) return 'riverbed';
    if (slug.includes('stream')) return 'mountain-stream';
    return 'mountain-spring';
};
