import { supabase } from '@/lib/customSupabaseClient';
import { EXPECTED_BENEFITS, OFFICIAL_SLUGS } from '@/utils/validationTestUtils';

const normalizeSlug = (slug) => slug?.replace(/-/g, '_') || '';

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

        const activeLevels = levels.filter(l => l.is_active);
        console.log(`Support Levels: Found ${levels.length} total, ${activeLevels.length} active.`);

        const foundSlugs = levels.map(l => l.slug);
        const duplicates = foundSlugs.filter((item, index) => foundSlugs.indexOf(item) !== index);
        
        if (duplicates.length > 0) {
            console.error('❌ DUPLICATE SLUGS DETECTED:', duplicates);
        }

        const missingOfficial = OFFICIAL_SLUGS.filter(slug =>
            !foundSlugs.some(fs => normalizeSlug(fs) === slug)
        );
        if (missingOfficial.length > 0) {
            console.warn('⚠️ MISSING OFFICIAL VARIANTS:', missingOfficial);
        } else {
            console.log(`✅ All ${OFFICIAL_SLUGS.length} official variants present in database.`);
        }

        // 2. Check Benefits Count (dynamic based on active official levels)
        const activeOfficial = activeLevels.filter(l =>
            OFFICIAL_SLUGS.includes(normalizeSlug(l.slug))
        );
        const expectedTotal = activeOfficial.reduce(
            (sum, l) => sum + (EXPECTED_BENEFITS[normalizeSlug(l.slug)] || 0), 0
        );

        const { count, error: countError } = await supabase
            .from('support_benefits')
            .select('*', { count: 'exact', head: true })
            .in('support_level_id', activeOfficial.map(l => l.id));

        if (countError) throw countError;

        if (count === expectedTotal) {
             console.log(`✅ Benefit count for ${activeOfficial.length} active official levels is exactly ${expectedTotal}.`);
        } else {
             console.warn(`⚠️ Unexpected benefit count: ${count}. Expected ${expectedTotal} (for ${activeOfficial.length} active official levels).`);
        }

        console.log('Integrity check complete.');

    } catch (err) {
        console.error('Integrity check failed to run:', err);
    } finally {
        console.groupEnd();
    }
};
