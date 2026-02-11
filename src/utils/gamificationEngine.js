import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Gamification Engine - Version Final + i18n
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const IMPACT_CREDITS_TABLE = 'impact_credits';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';

// --- DICCIONARIO DE FALLBACKS (Si no hay traducción en DB) ---
const FALLBACK_MESSAGES = {
    en: "You just earned {credits} Bonus Points for {action}.",
    es: "¡Acabas de ganar {credits} Bonos por: {action}!",
    de: "Du hast gerade {credits} Bonuspunkte für {action} erhalten.",
    fr: "Vous venez de gagner {credits} Bonus Points pour {action}."
};

/**
 * Busca el mensaje de éxito traducido en la base de datos.
 */
async function getTranslatedSuccessMessage(actionId, isDynamic, languageCode) {
    if (!actionId) return null;
    
    // Normalizamos el código de idioma (ej: 'es-ES' -> 'es')
    const lang = languageCode ? languageCode.split('-')[0] : 'en';
    const tableName = isDynamic ? 'genesis_mission_translations' : 'gamification_action_translations';
    const idField = isDynamic ? 'genesis_mission_id' : 'gamification_action_id';

    try {
        const { data } = await supabase
            .from(tableName)
            .select('success_message')
            .eq(idField, actionId)
            .eq('language_code', lang)
            .maybeSingle();
            
        return data?.success_message || null;
    } catch (e) {
        console.warn("Translation fetch failed", e);
        return null;
    }
}

/**
 * Busca acción en DB
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
 * Transacción de Créditos (Dispara Triggers)
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
 * EJECUTOR PRINCIPAL (CON SOPORTE i18n)
 */
export async function executeGamificationAction(userId, systemBinding, options = {}) {
    const { 
        customCreditValue, 
        preventNotification = false, 
        notes, 
        dynamicAction,
        languageCode = 'en' // Nuevo parámetro
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

        // Ejecución Secuencial
        await logGamificationHistory(userId, action, creditsToAward, notes, isDynamic);
        await awardImpactCredits(userId, creditsToAward, sourceType, displayTitle);

        // NOTIFICACIÓN INTELIGENTE CON TRADUCCIÓN
        if (!preventNotification) {
            // 1. Buscar mensaje personalizado en DB
            let userMessage = await getTranslatedSuccessMessage(action.id, isDynamic, languageCode);
            
            // 2. Si no hay custom, usar fallback
            if (!userMessage) {
                const lang = languageCode.split('-')[0];
                const template = FALLBACK_MESSAGES[lang] || FALLBACK_MESSAGES['en'];
                userMessage = template
                    .replace('{credits}', creditsToAward)
                    .replace('{action}', displayTitle);
            }

            await createNotification(
                userId,
                'Bonus Earned! 🚀', // Título genérico (o podrías traducirlo también)
                userMessage,
                'bonus'
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