import { supabase } from '@/lib/customSupabaseClient';
import { createNotification } from '@/utils/notificationUtils';
import { addMonths } from 'date-fns';

/**
 * Processes the referral after a successful registration.
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
    // ==========================================
    // 1. EXECUTE ORIGINAL LOGIC (RPC MLM)
    // ==========================================
    const { data, error } = await supabase.rpc('process_referral_reward', {
        p_ref_code: refCode.toLowerCase().trim(),
        p_new_user_id: newUserId
    });

    if (error) {
        console.error('[ReferralService] RPC Error:', error);
        throw error;
    }

    let sponsorId = null;

    // If the RPC was successful, get the sponsorId and send the original notification
    if (data?.success) {
        sponsorId = data.referrer_id;
        console.log(`[ReferralService] Success. Referrer ${sponsorId} rewarded.`);
        
        await createNotification(
            sponsorId,
            'notifications.new_referral.title',
            'notifications.new_referral.message',
            { points: data.points_awarded },
            'success',
            null, 
            newUserId 
        );
    } else {
        console.warn('[ReferralService] Referral Logic Skipped:', data?.message);
        // Fallback: if the RPC did not return the ID, look for it in the profiles table
        const { data: sponsorProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('referral_code', refCode.toLowerCase().trim())
            .maybeSingle();
        if (sponsorProfile) sponsorId = sponsorProfile.id;
    }

    // ==========================================
    // 2. PREMIUM SLOTS LOGIC (NEW SYSTEM)
    // ==========================================
    if (sponsorId) {
        console.log(`[ReferralService] Evaluating premium benefits for sponsor ${sponsorId}...`);
        
        // A. Fetch the sponsor's level, exact limits, and months (from DB)
        const { data: sponsorBenefit } = await supabase
          .from('user_benefits')
          .select(`
            new_support_level_id, 
            support_levels ( premium_months_friend, max_friends_allowed ) 
          `)
          .eq('user_id', sponsorId)
          .eq('status', 'active')
          .maybeSingle();

        if (sponsorBenefit && sponsorBenefit.support_levels) {
            const monthsToGive = sponsorBenefit.support_levels.premium_months_friend || 0;
            const maxFriendsAllowed = sponsorBenefit.support_levels.max_friends_allowed || 0;

            // B. Count how many friend slots the Sponsor has already used
            const { count: friendsClaimedCount, error: countError } = await supabase
              .from('user_benefits')
              .select('*', { count: 'exact', head: true })
              .eq('granted_by', sponsorId)
              .eq('access_type', 'friend');

            if (!countError && friendsClaimedCount < maxFriendsAllowed && monthsToGive > 0) {
                
                // C. Slots available: Calculate date and grant Premium Pass
                const expirationDate = addMonths(new Date(), monthsToGive);

                await supabase.from('user_benefits').upsert({
                    user_id: newUserId,
                    new_support_level_id: sponsorBenefit.new_support_level_id,
                    status: 'active',
                    assigned_date: new Date().toISOString(),
                    expires_at: expirationDate.toISOString(),
                    granted_by: sponsorId,      // Link the friend to the main contributor
                    access_type: 'friend'       // Mark as occupying a friend slot
                }, { onConflict: 'user_id' });

                // D. SYSTEM GRANTS 1000 BONUS POINTS TO THE FRIEND (Without deducting from anyone)
                await supabase.from('impact_credits').insert({
                    user_id: newUserId,
                    amount: 1000,
                    source: 'system_premium_gift', // Clear source in your DB
                    description: '1000 Bonus Points premium gift from pioneer invitation'
                });

                // (Optional) Notify the friend that they received their premium membership
                await createNotification(
                    newUserId,
                    'notifications.premium_unlocked.title',
                    'notifications.premium_unlocked.message',
                    { months: monthsToGive, points: 1000 },
                    'success'
                );

                console.log(`[ReferralService] 🎉 Premium granted to friend. Slots used: ${friendsClaimedCount + 1}/${maxFriendsAllowed}`);
            } else {
                console.log(`[ReferralService] Sponsor does not have a premium level or has used all ${maxFriendsAllowed} slots. User remains standard.`);
            }
        }
    }

  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};