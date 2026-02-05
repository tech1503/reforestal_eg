import { supabase } from '@/lib/customSupabaseClient';
import { getSupportLevelByAmount } from '@/utils/tierLogicUtils';

/**
 * Validation Script for Benefits Display
 * Simulates fetching benefits for the 4 Explorer variants and verifies counts/content.
 */
export const runBenefitsValidation = async () => {
    const report = {
        timestamp: new Date().toISOString(),
        variants: [],
        overall_status: 'pending'
    };

    const testCases = [
        { name: 'Mountain Spring', amount: 5.00, expectedCount: 3, slug: 'explorer-mountain-spring' },
        { name: 'Mountain Stream', amount: 14.99, expectedCount: 4, slug: 'explorer-mountain-stream' },
        { name: 'Riverbed', amount: 49.99, expectedCount: 6, slug: 'explorer-riverbed' },
        { name: 'Lifeline', amount: 97.99, expectedCount: 7, slug: 'explorer-lifeline' }
    ];

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
            // 1. Get ID logic check
            const levelId = await getSupportLevelByAmount(test.amount);
            if (!levelId) throw new Error(`Logic failed to find level for €${test.amount}`);

            // 2. Fetch Benefits
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

            // 3. Count Check
            if (benefits.length !== test.expectedCount) {
                result.status = 'fail';
                result.details = `Count mismatch. Expected ${test.expectedCount}, found ${benefits.length}.`;
                allPassed = false;
            } else {
                result.status = 'pass';
            }

            // 4. Legacy Content Check
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