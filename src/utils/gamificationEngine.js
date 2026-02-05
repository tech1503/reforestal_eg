
import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Gamification Engine for executing actions, validating rules, awarding credits, and logging history.
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const IMPACT_CREDITS_TABLE = 'impact_credits';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';
const USER_BALANCES_TABLE = 'reforestal_user_balances';

/**
 * Ensures a Founding Pioneer Metrics record exists for a user.
 * @param {string} userId - The UUID of the user.
 */
async function ensureFPMRecord(userId) {
    if (!userId) {
        console.warn('[GamificationEngine] Attempted to ensure FPM record for null userId.');
        return;
    }
    const { error } = await supabase
        .from(FOUNDING_PIONEER_METRICS_TABLE)
        .upsert({ user_id: userId })
        .eq('user_id', userId); // Ensure we're targeting the correct record if it exists

    if (error && error.code !== '23505') { // Ignore unique constraint violation if it already exists
        console.error(`[GamificationEngine] Error ensuring FPM record for user ${userId}:`, error.message);
    }
}

/**
 * Fetches an active gamification action by its system binding.
 * @param {string} systemBinding - The unique system binding for the action.
 * @returns {Promise<object|null>} The action object if found and active, otherwise null.
 */
async function getActiveActionBySystemBinding(systemBinding) {
    if (!systemBinding) {
        console.warn('[GamificationEngine] getActiveActionBySystemBinding called with null systemBinding.');
        return null;
    }
    const { data, error } = await supabase
        .from(GAMIFICATION_ACTION_TABLE)
        .select('*')
        .eq('system_binding', systemBinding)
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means not found, which is okay
        console.error(`[GamificationEngine] Error fetching action by system binding "${systemBinding}":`, error.message);
        return null;
    }
    return data;
}

/**
 * Records an entry in the gamification history.
 * @param {string} userId - The UUID of the user.
 * @param {object} action - The gamification action object.
 * @param {number} creditsAwarded - The number of impact credits awarded.
 * @param {string} notes - Additional notes for the history entry.
 */
async function logGamificationHistory(userId, action, creditsAwarded, notes = null) {
    if (!userId || !action || creditsAwarded === undefined) {
        console.warn('[GamificationEngine] Missing data for logging gamification history.', { userId, action, creditsAwarded });
        return;
    }
    const { error } = await supabase
        .from(GAMIFICATION_HISTORY_TABLE)
        .insert({
            user_id: userId,
            action_id: action.id,
            action_name: action.action_title || action.name,
            action_type: action.action_type,
            impact_credits_awarded: creditsAwarded,
            notes: notes,
            action_date: new Date().toISOString(),
        });

    if (error) {
        console.error(`[GamificationEngine] Error logging gamification history for user ${userId} and action ${action.id}:`, error.message);
    }
}

/**
 * Awards impact credits to a user.
 * @param {string} userId - The UUID of the user.
 * @param {number} amount - The amount of impact credits to award.
 * @param {string} source - The source of the credits (e.g., 'gamification', 'referral').
 * @param {string} description - A description for the credit entry.
 * @param {string} relatedSupportLevelId - Optional: ID of related support level.
 */
async function awardImpactCredits(userId, amount, source, description, relatedSupportLevelId = null) {
    if (!userId || amount === undefined || amount <= 0 || !source || !description) {
        console.warn('[GamificationEngine] Invalid parameters for awarding impact credits.', { userId, amount, source, description });
        return;
    }
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
        console.error(`[GamificationEngine] Error awarding impact credits to user ${userId}:`, error.message);
    }
}

/**
 * Updates the total impact credits earned for a user in their FPM record.
 * @param {string} userId - The UUID of the user.
 * @param {number} credits - The amount of credits to add.
 */
async function updateFPMTotalCredits(userId, credits) {
    if (!userId || credits === undefined) {
        console.warn('[GamificationEngine] Missing data for updating FPM total credits.', { userId, credits });
        return;
    }
    const { error } = await supabase
        .from(FOUNDING_PIONEER_METRICS_TABLE)
        .update({
            total_impact_credits_earned: supabase.raw(`total_impact_credits_earned + ${credits}`),
            last_activity_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

    if (error) {
        console.error(`[GamificationEngine] Error updating FPM total credits for user ${userId}:`, error.message);
    }
}

/**
 * Updates the user's Reforestal balance (specifically unvested balance for immediate awards).
 * @param {string} userId - The UUID of the user.
 * @param {number} amount - The amount to add to the unvested balance.
 */
async function updateUserReforestalBalance(userId, amount) {
    if (!userId || amount === undefined) {
        console.warn('[GamificationEngine] Missing data for updating Reforestal balance.', { userId, amount });
        return;
    }
    const { error } = await supabase
        .from(USER_BALANCES_TABLE)
        .upsert({
            user_id: userId,
            total_unvested_balance: amount,
            total_vested_balance: 0, // Initialize if new record, otherwise will be updated by raw expression
        }, { onConflict: 'user_id' })
        .eq('user_id', userId)
        .update({
            total_unvested_balance: supabase.raw(`total_unvested_balance + ${amount}`),
            updated_at: new Date().toISOString(),
        });

    if (error) {
        console.error(`[GamificationEngine] Error updating user Reforestal balance for user ${userId}:`, error.message);
    }
}

/**
 * Executes a gamification action for a user.
 * @param {string} userId - The UUID of the user performing the action.
 * @param {string} systemBinding - The system binding of the action to execute.
 * @param {object} [options={}] - Additional options for the action.
 * @param {number} [options.customCreditValue] - Optional custom credit value to award, overriding the action's default.
 * @param {boolean} [options.preventNotification=false] - If true, prevents notification for this action.
 * @param {string} [options.notes] - Custom notes for the gamification history entry.
 * @returns {Promise<{success: boolean, message?: string, creditsAwarded?: number}>}
 */
export async function executeGamificationAction(userId, systemBinding, options = {}) {
    const { customCreditValue, preventNotification = false, notes } = options;

    if (!userId || !systemBinding) {
        console.error('[GamificationEngine] executeGamificationAction: Missing userId or systemBinding.');
        return { success: false, message: 'Missing user ID or action binding.' };
    }

    try {
        await ensureFPMRecord(userId);

        const action = await getActiveActionBySystemBinding(systemBinding);
        if (!action) {
            console.warn(`[GamificationEngine] Action with system binding "${systemBinding}" not found or inactive.`);
            return { success: false, message: 'Gamification action not found or inactive.' };
        }

        const creditsToAward = customCreditValue !== undefined ? customCreditValue : action.impact_credits_value;
        if (creditsToAward <= 0) {
            console.log(`[GamificationEngine] Action "${action.name}" awards 0 or negative credits. Skipping award.`);
            return { success: true, message: 'Action awards 0 credits.' };
        }

        await logGamificationHistory(userId, action, creditsToAward, notes);
        await awardImpactCredits(userId, creditsToAward, action.source_event || 'gamification', action.action_title || action.name);
        await updateFPMTotalCredits(userId, creditsToAward);
        await updateUserReforestalBalance(userId, creditsToAward);

        if (!preventNotification) {
            await createNotification(
                userId,
                'Credits Earned! 🚀',
                `You just earned ${creditsToAward} Impact Credits for ${action.action_title || action.name}.`,
                'scoring_updated'
            );
        }

        return { success: true, creditsAwarded: creditsToAward, message: `Successfully executed action: ${action.action_title}` };

    } catch (err) {
        console.error(`[GamificationEngine] Error executing gamification action "${systemBinding}" for user ${userId}:`, err.message);
        return { success: false, message: err.message || 'An unexpected error occurred during gamification.' };
    }
}

/**
 * A general function to handle FPM metric updates (e.g., setting a flag to true, incrementing a counter).
 * This function handles only atomic updates. For complex logic, use specific functions or direct DB updates.
 * @param {string} userId - The UUID of the user.
 * @param {string} metricName - The name of the metric to update (e.g., 'genesis_quest_completed', 'profile_updated', 'quests_participated').
 * @param {any} value - The value to set the metric to (for boolean/string) or to increment by (for numeric).
 * @param {string} [operation='set'] - 'set' for direct assignment, 'increment' for adding to existing value.
 * @returns {Promise<{success: boolean, message?: string}>}
 */
export async function updateFoundingPioneerMetric(userId, metricName, value, operation = 'set') {
    if (!userId || !metricName) {
        console.error('[GamificationEngine] updateFoundingPioneerMetric: Missing userId or metricName.');
        return { success: false, message: 'Missing user ID or metric name.' };
    }

    await ensureFPMRecord(userId);

    let updatePayload = {
        updated_at: new Date().toISOString(),
        last_activity_date: new Date().toISOString(),
    };

    if (operation === 'increment') {
        if (typeof value !== 'number') {
            console.error('[GamificationEngine] updateFoundingPioneerMetric: Increment operation requires a numeric value.');
            return { success: false, message: 'Increment operation requires a numeric value.' };
        }
        updatePayload[metricName] = supabase.raw(`${metricName} + ${value}`);
    } else { // 'set' operation
        updatePayload[metricName] = value;
    }

    try {
        const { error } = await supabase
            .from(FOUNDING_PIONEER_METRICS_TABLE)
            .update(updatePayload)
            .eq('user_id', userId);

        if (error) {
            console.error(`[GamificationEngine] Error updating FPM metric "${metricName}" for user ${userId}:`, error.message);
            return { success: false, message: error.message };
        }
        return { success: true, message: `Successfully updated metric "${metricName}".` };
    } catch (err) {
        console.error(`[GamificationEngine] Unexpected error updating FPM metric "${metricName}" for user ${userId}:`, err.message);
        return { success: false, message: err.message || 'An unexpected error occurred.' };
    }
}
