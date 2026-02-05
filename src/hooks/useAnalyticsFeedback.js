
import { useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Feeds the analytics reporting table based on live events in the system.
 */
export const useAnalyticsFeedback = () => {
  useEffect(() => {
    // 1. Referrals -> Community Growth
    const referralSub = supabase
      .channel('analytics-referrals')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referrals' }, 
        async (payload) => {
           try {
             await supabase.from('analytics_reporting').insert({
               metric_name: 'community_growth',
               metric_value: 1,
               user_id: payload.new.user_id, // The referrer
               dimensions: { referred_user_id: payload.new.referred_user_id }
             });
           } catch(e) { console.error(e); }
        }
      )
      .subscribe();

    // 2. User Purchases -> Exchange Volume
    const purchasesSub = supabase
      .channel('analytics-purchases')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_purchases' },
        async (payload) => {
          try {
            await supabase.from('analytics_reporting').insert({
              metric_name: 'exchange_volume',
              metric_value: payload.new.credits_spent,
              user_id: payload.new.user_id,
              dimensions: { product_id: payload.new.product_id }
            });
          } catch(e) { console.error(e); }
        }
      )
      .subscribe();

    // 3. Gamification History -> User Activity
    const activitySub = supabase
      .channel('analytics-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gamification_history' },
        async (payload) => {
          try {
            await supabase.from('analytics_reporting').insert({
              metric_name: 'user_activity',
              metric_value: 1,
              user_id: payload.new.user_id,
              dimensions: { action_type: payload.new.action_type }
            });
          } catch(e) { console.error(e); }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(referralSub);
      supabase.removeChannel(purchasesSub);
      supabase.removeChannel(activitySub);
    };
  }, []);
};
