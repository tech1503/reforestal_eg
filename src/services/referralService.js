import { supabase } from '@/lib/customSupabaseClient';
import { executeGamificationAction } from '@/utils/gamificationEngine';

/**
 * Referral Service (Production Ready)
 * Handles the linking of new users to their referrers and executes the reward logic.
 *
 * It links to the database Gamification Action:
 * - Name: referral_completed
 * - System Binding: referral_mlm
 * - ID: a0090601-1e0e-4271-8b74-524938a1eae4
 * - Default Reward: 10000 IC (dynamic from DB)
 */

export const processReferralOnSignup = async (newUserId, refCode) => {
  if (!newUserId || !refCode) return;

  console.log(`[ReferralService] Processing referral code: ${refCode} for user ${newUserId}`);

  try {
    // 1. Identify the Referrer (Godparent) using the unique Link Reference
    // We look up who owns this specific referral code in the land_dollars table.
    const { data: landDollar, error: ldError } = await supabase
      .from('land_dollars')
      .select('user_id')
      .eq('link_ref', refCode)
      .maybeSingle();

    if (ldError || !landDollar) {
      console.warn('[ReferralService] Invalid or missing referral code.');
      return;
    }

    const referrerId = landDollar.user_id;

    // Prevent self-referral (User clicking their own link)
    if (referrerId === newUserId) {
        console.warn('[ReferralService] Self-referral attempt blocked.');
        return;
    }

    // 2. Create the Referral Record in DB
    // This establishes the hierarchy for the MLM tree and audit trail.
    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: newUserId,
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (refError) {
        // If relationship already exists (idempotency), we stop here to avoid double rewards.
        // Error 23505 is PostgreSQL unique violation.
        if (refError.code === '23505') {
            console.log('[ReferralService] Referral relationship already exists.');
            return;
        }
        throw refError;
    }

    // 3. Update the New User's Profile
    // We store the referrer_id directly on the profile for quick access in future logic.
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referrer_id: referrerId })
      .eq('id', newUserId);

    if (profileError) {
        console.error('[ReferralService] Failed to link referrer to profile:', profileError);
    }

    // 4. EXECUTE GAMIFICATION REWARD (Dynamic System)
    // We use 'referral_mlm' binding. The engine will look up the table 'gamification_actions'.
    // It will find the action ID 'a0090601-1e0e-4271-8b74-524938a1eae4' and award the configured 10000 credits.
    const result = await executeGamificationAction(
        referrerId, 
        'referral_mlm', 
        { 
            notes: `Referral Bonus: New user signup ${newUserId.slice(0,8)}` 
        }
    );

    // 5. Notify the Referrer
    if (result.success) {
        console.log(`[ReferralService] Success. Referrer rewarded with ${result.creditsAwarded} IC.`);
        
        // We attempt to use the action name from the result, or fall back to a default title.
        // This ensures the notification matches the user's language setting eventually.
        const rewardAmount = result.creditsAwarded || 10000;
        
        await supabase.from('notifications').insert({
            user_id: referrerId,
            title: 'New Referral! 🚀',
            message: `Someone joined using your link. You earned +${rewardAmount} points.`,
            notification_type: 'referral', // Maps to translation keys
            related_user_id: newUserId,
            is_read: false,
            created_at: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};