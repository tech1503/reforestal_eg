import { supabase } from '@/lib/customSupabaseClient';

/**
 * Performs a lightweight audit of the critical data structures (Tiers & Benefits)
 * and logs warnings to the console if inconsistencies are found.
 * 
 * Ideally called once on Admin Dashboard load.
 */
export const runDataIntegrityCheck = async () => {
    console.group('🔍 Data Integrity Check');
    
    try {
        // 1. Check Support Levels Count & Slugs
        const { data: levels, error: levelError } = await supabase
            .from('support_levels')
            .select('id, slug, is_active');
            
        if (levelError) throw levelError;

        const officialSlugs = [
            'explorer_mountain_spring',
            'explorer_mountain_stream',
            'explorer_riverbed',
            'explorer_lifeline'
        ];

        const activeLevels = levels.filter(l => l.is_active);
        console.log(`Support Levels: Found ${levels.length} total, ${activeLevels.length} active.`);

        const foundSlugs = levels.map(l => l.slug);
        const duplicates = foundSlugs.filter((item, index) => foundSlugs.indexOf(item) !== index);
        
        if (duplicates.length > 0) {
            console.error('❌ DUPLICATE SLUGS DETECTED:', duplicates);
        }

        const missingOfficial = officialSlugs.filter(slug => !foundSlugs.includes(slug));
        if (missingOfficial.length > 0) {
            console.warn('⚠️ MISSING OFFICIAL VARIANTS:', missingOfficial);
        } else {
            console.log('✅ All 4 official variants present.');
        }

        // 2. Check Benefits Count
        const { count, error: countError } = await supabase
            .from('support_benefits')
            .select('*', { count: 'exact', head: true })
            .in('support_level_id', activeLevels.map(l => l.id));

        if (countError) throw countError;

        if (count === 20) {
             console.log('✅ Benefit count for active levels is exactly 20.');
        } else {
             console.warn(`⚠️ Unexpected benefit count: ${count}. Expected 20.`);
        }

        console.log('Integrity check complete.');

    } catch (err) {
        console.error('Integrity check failed to run:', err);
    } finally {
        console.groupEnd();
    }
};