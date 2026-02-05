
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Maps readable Action Types to System Bindings
 * @param {string} actionType 
 * @returns {string} systemBinding
 */
export const detectSystemBinding = (actionType) => {
    const mapping = {
        "Genesis Quest": "genesis_quest",
        "Quest": "quest",
        "Mission Quest": "mission_quest",
        "Referral (MLM)": "referral_mlm",
        "Contribution": "contribution",
        "Profile": "profile",
        "Gamification": "gamification",
        "Custom": "custom"
    };
    return mapping[actionType] || "custom";
};

/**
 * Fetches the currently configured credit value for a specific system action.
 * Useful for displaying "Earn X credits" in UI before user acts.
 * @param {string} systemBinding 
 * @returns {Promise<number>} credits
 */
export const getActionCredits = async (systemBinding) => {
    try {
        const { data, error } = await supabase
            .from('gamification_actions')
            .select('impact_credits_value')
            .eq('system_binding', systemBinding)
            .eq('is_active', true)
            .single();
        
        if (error || !data) return 0;
        return Number(data.impact_credits_value);
    } catch (e) {
        console.error("Failed to fetch action credits:", e);
        return 0;
    }
};
