import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Gamification Engine - Version Final + i18n + RPG Engine
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const IMPACT_CREDITS_TABLE = 'impact_credits';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';

/**
 * Busca el mensaje de éxito traducido en la base de datos.
 */
async function getTranslatedSuccessMessage(actionId, isDynamic, languageCode) {
    if (!actionId) return null;
    const lang = languageCode ? languageCode.split('-')[0] : 'en';
    const tableName = isDynamic ? 'genesis_mission_translations' : 'gamification_action_translations';
    const idField = isDynamic ? 'genesis_mission_id' : 'gamification_action_id';

    try {
        const { data } = await supabase.from(tableName).select('success_message').eq(idField, actionId).eq('language_code', lang).maybeSingle();
        return data?.success_message || null;
    } catch (e) {
        console.warn("Translation fetch failed", e);
        return null;
    }
}

async function getActiveActionBySystemBinding(systemBinding) {
    if (!systemBinding) return null;
    const { data, error } = await supabase.from(GAMIFICATION_ACTION_TABLE).select('*').eq('system_binding', systemBinding).eq('is_active', true).maybeSingle();
    if (error) console.error(`[GamificationEngine] Error fetching action "${systemBinding}":`, error.message);
    return data;
}

async function logGamificationHistory(userId, action, creditsAwarded, notes = null, isDynamic = false) {
    if (!userId || !action) return;
    const safeActionId = isDynamic ? null : (action.id || null);
    
    await supabase.from(GAMIFICATION_HISTORY_TABLE).insert({
        user_id: userId,
        action_id: safeActionId, 
        action_name: action.action_name || action.title || 'Dynamic Action',
        action_type: action.action_type || 'Dynamic',
        impact_credits_awarded: creditsAwarded,
        notes: notes,
        action_date: new Date().toISOString(),
    });
}

async function awardImpactCredits(userId, amount, source, description, relatedSupportLevelId = null) {
    if (!userId || amount <= 0) return;
    const { error } = await supabase.from(IMPACT_CREDITS_TABLE).insert({
        user_id: userId, amount: amount, source: source, description: description,
        issued_date: new Date().toISOString(), related_support_level_id: relatedSupportLevelId,
    });
    if (error) throw error; 
}

/**
 * Función nueva: Añade Reputación a las métricas del usuario (RPG Element)
 */
async function awardReputationScore(userId, amount) {
    if (!userId || amount <= 0) return;
    try {
        const { data: metrics } = await supabase.from(FOUNDING_PIONEER_METRICS_TABLE).select('reputation_score').eq('user_id', userId).maybeSingle();
        const currentRep = metrics?.reputation_score || 0;
        
        await supabase.from(FOUNDING_PIONEER_METRICS_TABLE).upsert({
            user_id: userId,
            reputation_score: currentRep + amount,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
    } catch (e) {
        console.error("Failed to award reputation score:", e);
    }
}

/**
 * EJECUTOR PRINCIPAL 
 */
export async function executeGamificationAction(userId, systemBinding, options = {}) {
    const { 
        customCreditValue, 
        customReputationValue = 0, 
        preventNotification = false, 
        notes, 
        dynamicAction,
        languageCode = 'en' 
    } = options;

    if (!userId) return { success: false, message: 'Missing User ID' };

    try {
        let action = null;
        let isDynamic = false;

        if (dynamicAction) {
            action = { ...dynamicAction };
            isDynamic = true;
        } else if (systemBinding) {
            action = await getActiveActionBySystemBinding(systemBinding);
        }

        if (!action) return { success: false, message: 'Action not found.' };

        const creditsToAward = customCreditValue !== undefined ? customCreditValue : (action.impact_credits_value || action.impact_credit_reward || 0);
        const reputationToAward = customReputationValue || action.reputation_reward || 0;

        if (creditsToAward <= 0 && reputationToAward <= 0) {
            return { success: true, message: '0 Rewards awarded (intentional).' };
        }

        const displayTitle = action.action_title || action.title || action.name || 'Reward';
        const sourceType = action.source_event || (isDynamic ? 'quest_completion' : 'gamification');

        // 1. Guardar Log
        await logGamificationHistory(userId, action, creditsToAward, notes, isDynamic);
        
        // 2. Entregar Créditos
        if (creditsToAward > 0) await awardImpactCredits(userId, creditsToAward, sourceType, displayTitle);
        
        // 3. Entregar Reputación 
        if (reputationToAward > 0) await awardReputationScore(userId, reputationToAward);

        // 4. Notificar (INTEGRACIÓN I18N CORRECTA)
        if (!preventNotification) {
            let titleKey = 'notifications.points_earned.title';
            let messageKey = reputationToAward > 0 
                ? 'notifications.points_and_rep_earned.message' // Usaremos una nueva clave si hay reputación
                : 'notifications.points_earned.message';
                
            const meta = { points: creditsToAward, action: displayTitle, rep: reputationToAward };

            // Si el admin configuró un mensaje personalizado en la DB, lo usamos.
            // Al pasar la `meta` como objeto, i18next simplemente devolverá este texto intacto.
            let customMessage = await getTranslatedSuccessMessage(action.id, isDynamic, languageCode);
            if (customMessage) {
                messageKey = customMessage;
            }

            await createNotification(userId, titleKey, messageKey, meta, 'gamification');
        }

        return { 
            success: true, 
            creditsAwarded: creditsToAward, 
            reputationAwarded: reputationToAward,
            message: `Executed: ${displayTitle}` 
        };

    } catch (err) {
        console.error('[Gamification] Execution Error:', err);
        return { success: false, message: err.message || "Error processing reward." };
    }
}