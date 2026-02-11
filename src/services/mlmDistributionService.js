import { supabase } from '@/lib/customSupabaseClient';

/**
 * Distributes MLM .
 */
export const distributeCreditsToUpline = async (user_id, amount, source) => {
  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('referrer_id')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;
    if (!profile?.referrer_id) return; 

    const directAmount = Math.floor(amount * 0.7);
    const indirectAmount = Math.floor(amount * 0.3);

    const { error: directError } = await supabase
      .from('gamification_history')
      .insert({
        user_id: profile.referrer_id,
        action_id: null,
        impact_credits_awarded: directAmount, 
        action_name: 'MLM Reward (Direct)',   
        action_type: 'Referral (MLM)',
        notes: `MLM Reward from direct referral ${user_id.slice(0,6)}... source: ${source}`,
        action_date: new Date().toISOString()
      });

    if (directError) {
        console.error("Error distributing direct MLM:", directError);
    } else {
        await supabase.from('impact_credits').insert({
            user_id: profile.referrer_id,
            amount: directAmount,
            source: 'mlm_reward',
            description: `Commission from direct referral activity (${source})`,
            issued_date: new Date().toISOString()
        });

        await supabase.rpc('create_notification', { p_user_id: profile.referrer_id, p_title: "MLM Reward!", p_message: `You earned ${directAmount} IC from a direct referral activity.`});
    }

    const { data: referrerProfile } = await supabase
      .from('profiles')
      .select('referrer_id')
      .eq('id', profile.referrer_id)
      .single();

    if (referrerProfile?.referrer_id && indirectAmount > 0) {
      const { error: indirectError } = await supabase
        .from('gamification_history')
        .insert({
          user_id: referrerProfile.referrer_id,
          action_id: null,
          impact_credits_awarded: indirectAmount,
          action_name: 'MLM Reward (Indirect)',
          action_type: 'Referral (MLM)',
          notes: `MLM Reward from indirect referral (Tier 2)`,
          action_date: new Date().toISOString()
        });

      if (!indirectError) {
          // Billetera
          await supabase.from('impact_credits').insert({
            user_id: referrerProfile.referrer_id,
            amount: indirectAmount,
            source: 'mlm_reward',
            description: `Commission from indirect referral activity`,
            issued_date: new Date().toISOString()
        });
          
          await supabase.rpc('create_notification', { p_user_id: referrerProfile.referrer_id, p_title: "Network Bonus!", p_message: `You earned ${indirectAmount} IC from your extended network.`});
      }
    }

  } catch (err) {
    console.error('MLM distribution error:', err);
    throw err;
  }
};
