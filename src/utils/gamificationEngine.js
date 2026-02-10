import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Gamification Engine - Versión Final Automatizada
 * Se eliminó la función ensureFPMRecord para evitar el error 403.
 * La Base de Datos (Trigger) se encarga de crear los registros necesarios.
 */

const GAMIFICATION_ACTION_TABLE = 'gamification_actions';
const GAMIFICATION_HISTORY_TABLE = 'gamification_history';
const IMPACT_CREDITS_TABLE = 'impact_credits';
const FOUNDING_PIONEER_METRICS_TABLE = 'founding_pioneer_metrics';

/**
 * Busca la configuración de la acción en la DB si no es dinámica.
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
 * Guarda el registro visual para que el usuario vea su historial.
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
 * EL DETONADOR: Esta inserción dispara los Triggers SQL que actualizan saldos.
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
        console.error(`[GamificationEngine] Error awarding credits:`, error.message);
        throw error; 
    }
}

/**
 * EJECUTOR PRINCIPAL
 */
export async function executeGamificationAction(userId, systemBinding, options = {}) {
    const { customCreditValue, preventNotification = false, notes, dynamicAction } = options;

    if (!userId) return { success: false, message: 'Missing User ID' };

    try {
        // NOTA: Se eliminó await ensureFPMRecord(userId); para evitar error 403.
        // El trigger SQL 'handle_new_impact_credit' creará el registro automáticamente.

        let action = null;
        let isDynamic = false;

        // 1. MODO DINÁMICO (Prioridad)
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
            return { success: true, message: '0 credits awarded (intentional).' };
        }

        const displayTitle = action.action_title || action.title || action.name || 'Reward';
        const sourceType = action.source_event || (isDynamic ? 'quest_completion' : 'gamification');

        // --- SECUENCIA DE EJECUCIÓN ---
        
        // 1. Guardar en Historial (Visual)
        await logGamificationHistory(userId, action, creditsToAward, notes, isDynamic);
        
        // 2. Insertar Crédito (ESTO ACTIVA EL TRIGGER DE SALDOS)
        await awardImpactCredits(userId, creditsToAward, sourceType, displayTitle);

        // 3. Notificar
        if (!preventNotification) {
            await createNotification(
                userId,
                '¡Bonos Recibidos! 🚀',
                `Ganaste ${creditsToAward} puntos por: ${displayTitle}.`,
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

// Utilidad auxiliar (si la necesitas para otras cosas que NO sean créditos)
export async function updateFoundingPioneerMetric(userId, metricName, value) {
    if (!userId || !metricName) return { success: false, message: 'Missing parameters.' };

    if (metricName === 'total_impact_credits_earned') {
        return { success: false, message: 'Credits cannot be updated manually. Use awardImpactCredits.' };
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