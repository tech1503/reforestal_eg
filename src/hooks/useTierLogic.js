import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

export const useTierLogic = () => {
  const { user } = useAuth();
  const [userTier, setUserTier] = useState(null);
  const [tierBenefits, setTierBenefits] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper para limpiar el nombre
  const formatTierName = (slug) => {
      if (!slug) return 'Standard';
      return slug.replace(/explorer[-_]/i, '') 
                 .replace(/[-_]/g, ' ')        
                 .replace(/\b\w/g, l => l.toUpperCase()); 
  };

  const fetchUserTier = useCallback(async () => {
    if (!user) {
        setLoading(false);
        return;
    }

    try {
      setLoading(true);

      // 1. Buscar la asignación activa
      // NOTA: user_benefits usa 'status'='active', no 'is_active'.
      const { data: benefitData, error: benefitError } = await supabase
        .from('user_benefits')
        .select('new_support_level_id, status')
        .eq('user_id', user.id)
        .eq('status', 'active') // CORRECTO para user_benefits
        .maybeSingle();

      if (benefitError && benefitError.code !== 'PGRST116') throw benefitError;

      if (benefitData && benefitData.new_support_level_id) {
          // 2. Traer detalles del nivel Y sus beneficios
          const { data: levelData, error: levelError } = await supabase
            .from('support_levels')
            .select(`
                *,
                support_benefits (
                    id, benefit_type, icon_name, display_order,
                    support_benefit_translations (language_code, description)
                )
            `)
            .eq('id', benefitData.new_support_level_id)
            .single();

          if (levelError) throw levelError;

          if (levelData) {
              // Objeto Tier limpio
              setUserTier({
                  id: levelData.id,
                  slug: levelData.slug,
                  name: formatTierName(levelData.slug),
                  displayName: `Explorer ${formatTierName(levelData.slug)}`,
                  min_amount: levelData.min_amount,
                  impact_credits_reward: levelData.impact_credits_reward,
                  land_dollars_reward: levelData.land_dollars_reward,
                  is_active: benefitData.status === 'active'
              });
              
              // Procesar beneficios para el componente BenefitsDisplay
              const processedBenefits = (levelData.support_benefits || [])
                  .sort((a,b) => (a.display_order || 0) - (b.display_order || 0));
              
              setTierBenefits(processedBenefits); 
          }
      } else {
          setUserTier(null);
          setTierBenefits([]);
      }

    } catch (error) {
      console.error('[useTierLogic] Error:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchUserTier();
  }, [fetchUserTier]);

  const assignTierFromContribution = async () => { return true; };

  return {
    userTier,
    tierBenefits,
    loading,
    assignTierFromContribution,
    fetchUserTier
  };
};