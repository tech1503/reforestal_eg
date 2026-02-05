import { supabase } from '@/lib/customSupabaseClient';

export const api = {
  subscriptions: {
    create: async (userId, plan) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan_type: plan.id,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
        })
        .select()
        .single();

      if (error) return { error };

      const { error: ledgerError } = await supabase.from('reforestal_credits_ledger').insert({
        user_id: userId,
        credits_amount: plan.credits,
        source_event: `Subscription: ${plan.name}`,
        source_event_id: data.id,
        vesting_status: 'in_cliff',
        earning_timestamp: new Date().toISOString(),
        last_update_timestamp: new Date().toISOString(),
      });

      if (ledgerError) return { error: ledgerError };
      
      const { error: balanceError } = await supabase.rpc('add_to_unvested_balance', {
        user_id_input: userId,
        amount_input: plan.credits
      });

      return { data, error: balanceError };
    },
    cancel: async (subscriptionId, userId) => {
      // This is a simplified cancellation. A real implementation would need to check vesting rules.
      // For now, we just set status to 'cancelled'.
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'cancelled', end_date: new Date().toISOString() })
        .eq('id', subscriptionId)
        .eq('user_id', userId);
      
      // Here you would call a Supabase Edge Function to handle complex 'forfeited' logic
      return { data, error };
    },
  },
  referrals: {
    redeem: async (referrerId, newUserId) => {
      const { data, error } = await supabase
        .from('referrals')
        .insert({ user_id: referrerId, referred_user_id: newUserId, tier: 1 });
      return { data, error };
    },
  },
  quests: {
    complete: async (userId, quest) => {
      const { data, error } = await supabase
        .from('quest_completions')
        .insert({ user_id: userId, quest_id: quest.id });
      
      if (error) return { error };

      const { error: ledgerError } = await supabase.from('reforestal_credits_ledger').insert({
        user_id: userId,
        credits_amount: quest.credits_reward,
        source_event: `Quest: ${quest.name}`,
        source_event_id: data.id,
        vesting_status: 'in_cliff',
      });
      
      return { data, error: ledgerError };
    },
  },
  user: {
    getLedger: async (userId) => {
      const { data, error } = await supabase
        .from('reforestal_credits_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('earning_timestamp', { ascending: false });
      return { data, error };
    },
    getBalance: async (userId) => {
      const { data, error } = await supabase
        .from('reforestal_user_balances')
        .select('*')
        .eq('user_id', userId)
        .single();
      return { data, error };
    },
  },
};