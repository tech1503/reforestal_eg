import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';

/**
 * Procesa el referido después de un registro exitoso.
 * @param {string} newUserId 
 * @param {string} [manualRefCode] 
 */
export const processReferralOnSignup = async (newUserId, manualRefCode = null) => {

  const refCode = sessionStorage.getItem('pending_referral_code') || manualRefCode;
  
  if (!newUserId || !refCode) {
    return;
  }

  sessionStorage.removeItem('pending_referral_code');
  localStorage.removeItem('reforestal_ref');

  console.log(`[ReferralService] Processing referral: ${refCode} for user ${newUserId}`);

  try {
    const { data, error } = await supabase.rpc('process_referral_reward', {
        p_ref_code: refCode.toLowerCase().trim(),
        p_new_user_id: newUserId
    });

    if (error) {
        console.error('[ReferralService] RPC Error:', error);
        throw error;
    }

    if (data?.success) {
        console.log(`[ReferralService] Success. Referrer ${data.referrer_id} rewarded.`);
        
        await createNotification(
            data.referrer_id,
            'notifications.new_referral.title',
            'notifications.new_referral.message',
            { points: data.points_awarded },
            'success',
            null, 
            newUserId 
        );
    } else {
        console.warn('[ReferralService] Referral Logic Skipped:', data?.message);
    }

  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};