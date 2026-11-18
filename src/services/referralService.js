import { supabase } from '@/lib/customSupabaseClient';

export const processReferralOnSignup = async (newUserId, manualRefCode = null) => {
  const refCode = sessionStorage.getItem('pending_referral_code') || manualRefCode;

  if (!newUserId || !refCode) {
    return;
  }

  sessionStorage.removeItem('pending_referral_code');
  localStorage.removeItem('reforestal_ref');

  try {
    const { data, error } = await supabase.rpc('claim_padrino_grade1', {
      p_referral_code: String(refCode),
      p_idempotency_key: `padrino_grade1_${newUserId}`,
    });

    if (error) {
      console.error('[ReferralService] claim_padrino_grade1 failed:', error);
      return;
    }

    if (data?.status === 'ok') {
      console.log(`[ReferralService] Padrino ${data.padrino_id} rewarded ${data.amount} points.`);
    } else if (data?.status === 'duplicate') {
      console.log(`[ReferralService] Referral already claimed for user ${newUserId}.`);
    } else {
      console.warn('[ReferralService] Unexpected referral response:', data);
    }
  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};
