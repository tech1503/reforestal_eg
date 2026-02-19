import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Gamification Engine 
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const IMPACT_CREDITS_TABLE = 'impact_credits';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';

/**
 * Busc en DB
 */
async function getActiveActionBySystemBinding(systemBinding) {
    if (!systemBinding) return null;
    const { data, error } = await supabase
        .from(GAMIFICATION_ACTION_TABLE)
        .select('*')
        .eq('system_binding', systemBinding)
        .eq('is_active', true)
        .maybeSingle();

    if (error) console.error(`[GamificationEngine] Error fetching action "${systemBinding}":`, error.message);
    return data;
}

/**
 * Log de historial
 */
async function logGamificationHistory(userId, action, creditsAwarded, notes = null, isDynamic = false) {
    if (!userId || !action) return;
    
    const safeActionId = isDynamic ? null : (action.id || null);
    
    const { error } = await supabase
        .from(GAMIFICATION_HISTORY_TABLE)
        .insert({
            user_id: userId,
            action_id: safeActionId, 
            action_name: action.action_name || action.title || 'Dynamic Action',
            action_type: action.action_type || 'Dynamic',
            impact_credits_awarded: creditsAwarded,
            notes: notes,
            action_date: new Date().toISOString(),
        });

    if (error) console.error(`[GamificationEngine] Error logging history:`, error.message);
}

/**
 *  (Dispara Triggers)
 */
async function awardImpactCredits(userId, amount, source, description, relatedSupportLevelId = null) {
    if (!userId || amount <= 0) return;
    
    const { error } = await supabase
        .from(IMPACT_CREDITS_TABLE)
        .insert({
            user_id: userId,
            amount: amount,
            source: source,
            description: description,
            issued_date: new Date().toISOString(),
            related_support_level_id: relatedSupportLevelId,
        });

    if (error) {
        console.error(`[GamificationEngine] Error awarding bonus points:`, error.message);
        throw error; 
    }
}

/**
 * EJECUTOR PRINCIPAL (CON SOPORTE i18n JSON)
 */
export async function executeGamificationAction(userId, systemBinding, options = {}) {
    const { 
        customCreditValue, 
        preventNotification = false, 
        notes, 
        dynamicAction
    } = options;

    if (!userId) return { success: false, message: 'Missing User ID' };

    try {
        let action = null;
        let isDynamic = false;

        // 1. MODO DINÁMICO
        if (dynamicAction) {
            action = { ...dynamicAction };
            isDynamic = true;
        } 
        // 2. MODO DB
        else if (systemBinding) {
            action = await getActiveActionBySystemBinding(systemBinding);
        }

        if (!action) {
            console.warn(`[Gamification] Action not found: ${systemBinding}`);
            return { success: false, message: 'Action not found.' };
        }

        const creditsToAward = customCreditValue !== undefined 
            ? customCreditValue 
            : (action.impact_credits_value || action.impact_credit_reward || 0);

        if (creditsToAward <= 0) {
            return { success: true, message: '0 Bonus Points awarded (intentional).' };
        }

        const displayTitle = action.action_title || action.title || action.name || 'Reward';
        const sourceType = action.source_event || (isDynamic ? 'quest_completion' : 'gamification');

        await logGamificationHistory(userId, action, creditsToAward, notes, isDynamic);
        await awardImpactCredits(userId, creditsToAward, sourceType, displayTitle);

        if (!preventNotification) {
            await createNotification(
                userId,
                'notifications.points_earned.title',   
                'notifications.points_earned.message', 
                { points: creditsToAward, action: displayTitle }, 
                'gamification'
            );
        }

        return { 
            success: true, 
            creditsAwarded: creditsToAward, 
            message: `Executed: ${displayTitle}` 
        };

    } catch (err) {
        console.error('[Gamification] Execution Error:', err);
        return { success: false, message: err.message || "Error processing reward." };
    }
}

export async function updateFoundingPioneerMetric(userId, metricName, value) {
    if (!userId || !metricName) return { success: false, message: 'Missing parameters.' };

    if (metricName === 'total_impact_credits_earned') {
        return { success: false, message: 'Bonus Points cannot be updated manually.' };
    }

    try {
        const { error } = await supabase
            .from(FOUNDING_PIONEER_METRICS_TABLE)
            .upsert({ 
                user_id: userId,
                [metricName]: value,
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

        if (error) throw error;
        return { success: true, message: `Updated ${metricName}` };
    } catch (err) {
        return { success: false, message: err.message };
    }
}