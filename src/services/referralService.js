import { supabase } from '@/lib/customSupabaseClient';
import { executeGamificationAction } from '@/utils/gamificationEngine';

export const processReferralOnSignup = async (newUserId, refCode) => {
  if (!newUserId || !refCode) return;

  console.log(`[ReferralService] Processing referral code: ${refCode} for user ${newUserId}`);

  try {
    
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

    if (referrerId === newUserId) {
        console.warn('[ReferralService] Self-referral attempt blocked.');
        return;
    }


    const { error: refError } = await supabase
      .from('referrals')
      .insert({
        user_id: referrerId,         
        referred_user_id: newUserId, 
        status: 'completed',
        created_at: new Date().toISOString()
      });

    if (refError) {
  
        if (refError.code === '23505') {
            console.log('[ReferralService] Referral relationship already exists.');
            return;
        }
        throw refError;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ referrer_id: referrerId }) 
      .eq('id', newUserId);

    if (profileError) {
        console.error('[ReferralService] Failed to link referrer to profile:', profileError);
    }

    const result = await executeGamificationAction(
        referrerId, 
        'referral_mlm', 
        { 
            notes: `Referral Bonus: New user signup ${newUserId.slice(0,8)}` 
        }
    );

    if (result.success) {
        console.log(`[ReferralService] Success. Referrer rewarded with ${result.creditsAwarded} IC.`);
        
        const rewardAmount = result.creditsAwarded || 10000;
        
        await supabase.from('notifications').insert({
            user_id: referrerId,
            title: 'New Referral! 🚀',
            message: `Someone joined using your link. You earned +${rewardAmount} points.`,
            notification_type: 'referral',
            related_user_id: newUserId,
            is_read: false,
            created_at: new Date().toISOString()
        });
    }

  } catch (error) {
    console.error('[ReferralService] Critical error processing referral:', error);
  }
};