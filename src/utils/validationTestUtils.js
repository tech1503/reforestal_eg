import { supabase } from '@/lib/customSupabaseClient';

/**
 * Expected benefit count per official tier slug.
 * This is the single source of truth for validation.
 */
export const EXPECTED_BENEFITS = {
    'explorer_mountain_spring': 3,
    'explorer_mountain_stream': 4,
    'explorer_riverbed': 6,
    'explorer_lifeline': 7,
};

export const OFFICIAL_SLUGS = Object.keys(EXPECTED_BENEFITS);

const normalizeSlug = (slug) => slug?.replace(/-/g, '_') || '';

/**
 * Validation Script for Benefits Display
 * Simulates fetching benefits for all active official Explorer variants and verifies counts/content.
 */
export const runBenefitsValidation = async () => {
    const report = {
        timestamp: new Date().toISOString(),
        variants: [],
        overall_status: 'pending'
    };

    const AMOUNT_BY_SLUG = {
        'explorer_mountain_spring': 5.00,
        'explorer_mountain_stream': 14.99,
        'explorer_riverbed': 49.99,
        'explorer_lifeline': 97.99,
    };

    const NAME_BY_SLUG = {
        'explorer_mountain_spring': 'Mountain Spring',
        'explorer_mountain_stream': 'Mountain Stream',
        'explorer_riverbed': 'Riverbed',
        'explorer_lifeline': 'Lifeline',
    };

    const { data: activeLevels } = await supabase
        .from('support_levels')
        .select('id, slug')
        .eq('is_active', true);

    const activeOfficial = (activeLevels || []).filter(l =>
        OFFICIAL_SLUGS.includes(normalizeSlug(l.slug))
    );

    const testCases = activeOfficial.map(level => {
        const slug = normalizeSlug(level.slug);
        return {
            name: NAME_BY_SLUG[slug] || slug,
            amount: AMOUNT_BY_SLUG[slug],
            expectedCount: EXPECTED_BENEFITS[slug],
            slug: level.slug,
            levelId: level.id,
        };
    });

    let allPassed = true;

    for (const test of testCases) {
        const result = {
            name: test.name,
            input_amount: test.amount,
            status: 'pending',
            details: '',
            benefits_found: []
        };

        try {
            const levelId = test.levelId;

            const { data: benefits, error } = await supabase
                .from('support_benefits')
                .select(`
                    id, 
                    benefit_type, 
                    icon_name, 
                    support_benefit_translations(description, language_code)
                `)
                .eq('support_level_id', levelId)
                .eq('is_active', true);

            if (error) throw error;

            result.benefits_found = benefits.map(b => {
                const trans = b.support_benefit_translations?.find(t => t.language_code === 'en') || {};
                return {
                    desc: trans.description || 'No Desc',
                    type: b.benefit_type,
                    icon: b.icon_name
                };
            });

            if (benefits.length !== test.expectedCount) {
                result.status = 'fail';
                result.details = `Count mismatch. Expected ${test.expectedCount}, found ${benefits.length}.`;
                allPassed = false;
            } else {
                result.status = 'pass';
            }

            const hasLegacy = result.benefits_found.some(b => 
                b.desc.includes('IC /') || b.desc.includes('/ 5 LD') || b.desc.match(/\d+\sIC/));
            
            if (hasLegacy) {
                result.status = 'fail';
                result.details += ' Legacy "Combined IC/LD" text detected.';
                allPassed = false;
            }

        } catch (e) {
            result.status = 'error';
            result.details = e.message;
            allPassed = false;
        }

        report.variants.push(result);
    }

    report.overall_status = allPassed ? 'PASS' : 'FAIL';
    return report;
};
