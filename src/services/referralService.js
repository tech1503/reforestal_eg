import { supabase } from '@/lib/customSupabaseClient';

export const processReferralOnSignup = async (newUserId, refCode) => {
  if (!newUserId || !refCode) return;

  console.log(`[ReferralService] Processing referral code: ${refCode} for user ${newUserId}`);

  try {
    const { data, error } = await supabase.rpc('process_referral_reward', {
        p_ref_code: refCode,
        p_new_user_id: newUserId
    });

    if (error) {
        console.error('[ReferralService] RPC Error:', error);
        throw error;
    }

    if (data?.success) {
        console.log(`[ReferralService] Success. Referrer ${data.referrer_id} rewarded with ${data.points_awarded} IC.`);
    } else {
        console.warn('[ReferralService] Referral Logic Skipped:', data?.message);
    }

  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};