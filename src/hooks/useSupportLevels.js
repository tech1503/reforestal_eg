import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useI18n } from '@/contexts/I18nContext';

export const useSupportLevels = () => {
    const { currentLanguage } = useI18n();
    const [levels, setLevels] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLevels = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('support_levels')
                    .select(`
                        *,
                        support_level_translations(language_code, name, description),
                        support_benefits(
                            id, 
                            icon_name, 
                            benefit_type,
                            support_benefit_translations(language_code, description)
                        )
                    `)
                    .order('min_amount', { ascending: true });

                if (error) throw error;

                const processed = (data || []).map(level => {
                    // Fallback logic: Current Lang -> English -> First Available -> Empty
                    const getTrans = (arr) => arr?.find(t => t.language_code === currentLanguage) 
                                           || arr?.find(t => t.language_code === 'en')
                                           || {};

                    const tLevel = getTrans(level.support_level_translations);
                    
                    const processedBenefits = (level.support_benefits || []).map(b => {
                        const tBen = getTrans(b.support_benefit_translations);
                        return {
                            ...b,
                            translated_desc: tBen.description || 'No description'
                        };
                    });

                    return {
                        ...level,
                        name: tLevel.name || level.slug,
                        description: tLevel.description || '',
                        benefits: processedBenefits
                    };
                });

                setLevels(processed);
            } catch (err) {
                console.error("Error fetching support levels:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLevels();
    }, [currentLanguage]);

    return { levels, loading, error };
};