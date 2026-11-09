import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';
import { emitImpactCredits } from '@/services/impactCreditService';

/**
 * Gamification Engine - Version Final + i18n + RPG Engine
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';
const IC_LEDGER_TABLE = 'ic_ledger';
const FINANCIAL_CONTEXT_VIEW = 'financial_context_view';

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
 * Consume points from ic_ledger via LIFO RPC spend_points_lifo.
 * Quema puntos más recientes primero (created_at DESC).
 */
async function consumePointsLIFO(userId, pointsToConsume) {
    try {
        const { data, error } = await supabase.rpc('spend_points_lifo', {
            p_user_id: userId,
            p_amount: pointsToConsume
        });

        if (error) {
            console.error(`[Gamification] LIFO point consumption failed:`, error.message);
            return { success: false, error: error.message };
        }
        return { success: true, data };
    } catch (e) {
        console.error(`[Gamification] Unexpected error consuming points:`, e);
        return { success: false, error: e.message };
    }
}

/**
 * Get user points (green vs gold) via financial_context_view.
 */
async function getUserPoints(userId) {
    try {
        const { data, error } = await supabase
            .from(FINANCIAL_CONTEXT_VIEW)
            .select('green_basket_points, gold_basket_points, total_ic_ledger_balance')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[Gamification] Error fetching user points from view:', error);
            return { totalPoints: 0, greenPoints: 0, goldPoints: 0 };
        }

        const greenPoints = data?.green_basket_points || 0;
        const goldPoints = data?.gold_basket_points || 0;
        const totalPoints = data?.total_ic_ledger_balance || (greenPoints + goldPoints);

        return { totalPoints, greenPoints, goldPoints };
    } catch (e) {
        console.error('[Gamification] Unexpected error in getUserPoints:', e);
        return { totalPoints: 0, greenPoints: 0, goldPoints: 0 };
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
        const pointsCost = customCreditValue || action.points_cost || 0; // Pay-to-Unlock: consume puntos via LIFO

        if (creditsToAward <= 0 && reputationToAward <= 0 && pointsCost <= 0) {
            return { success: true, message: '0 Rewards awarded (intentional).' };
        }

        const displayTitle = action.action_title || action.title || action.name || 'Reward';
        const sourceType = action.source_event || (isDynamic ? 'quest_completion' : 'gamification');

        // Consumir puntos si hay cost (Pay-to-Unlock 50% LIFO)
        if (pointsCost > 0) {
            const consumeResult = await consumePointsLIFO(userId, pointsCost);
            if (!consumeResult.success) {
                return { success: false, message: `Failed to consume points for reward: ${consumeResult.error}` };
            }
        }

        // 1. Guardar Log
        await logGamificationHistory(userId, action, creditsToAward, notes, isDynamic);
        
        // 2. Entregar Créditos (VERIFICADO: si falla, no se otorga visualmente)
        let emitResult = null;
        if (creditsToAward > 0) {
            emitResult = await emitImpactCredits({ user_id: userId, amount: creditsToAward, source: sourceType, description: displayTitle });
            if (!emitResult || !emitResult.success) {
                console.error('[Gamification] emit_ic failed:', emitResult?.error || 'Unknown error');
                return { success: false, message: emitResult?.error || 'Failed to emit Impact Credits via RPC' };
            }
        }
        
        // 3. Entregar Reputación 
        if (reputationToAward > 0) await awardReputationScore(userId, reputationToAward);

        // 4. Notificar SOLO si todo fue exitoso
        if (!preventNotification && emitResult?.success !== false) {
            let titleKey = 'notifications.points_earned.title';
            let messageKey = reputationToAward > 0 
                ? 'notifications.points_and_rep_earned.message' 
                : 'notifications.points_earned.message';
                
            const meta = { points: creditsToAward, action: displayTitle, rep: reputationToAward };

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
            pointsConsumed: pointsCost,
            message: `Executed: ${displayTitle}` 
        };

    } catch (err) {
        console.error('[Gamification] Execution Error:', err);
        return { success: false, message: err.message || "Error processing reward." };
    }
}