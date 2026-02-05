
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Custom hook to fetch analytics data for Admin Dashboard.
 * Includes real-time subscriptions to keep data fresh.
 */
export const useAnalyticsDataFetcher = () => {
  const [financialData, setFinancialData] = useState(null);
  const [exchangeData, setExchangeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFinancialData = useCallback(async () => {
    try {
      // Fetch startnext_contributions with support_level names
      // Note: We need a left join or inner join. Assuming relation exists.
      // If relation is not straightforward, we might need to fetch separately or use view.
      // Using 'support_levels' relation if defined in Supabase, otherwise falling back to manual mapping if needed.
      // Based on provided schema, foreign key exists: new_support_level_id -> support_levels.id
      
      const { data: contributions, error: contribError } = await supabase
        .from('startnext_contributions')
        .select(`
          id, 
          contribution_amount, 
          contribution_date, 
          user_id,
          new_support_level_id, 
          support_levels ( id, slug, support_level_translations(name) )
        `)
        .order('contribution_date', { ascending: false });

      if (contribError) throw contribError;

      // Fetch impact_credits
      const { data: credits, error: creditsError } = await supabase
        .from('impact_credits')
        .select('*')
        .order('created_at', { ascending: false });

      if (creditsError) throw creditsError;

      // Process tiers for easier consumption
      const processedContributions = contributions.map(c => {
          let tierName = 'Unknown';
          if (c.support_levels) {
               // Try translation or slug
               const trans = c.support_levels.support_level_translations?.[0]; // taking first usually EN or user lang if filtered
               tierName = trans?.name || c.support_levels.slug;
          }
          return { ...c, tierName };
      });

      setFinancialData({ contributions: processedContributions, credits });
      setError(null);
    } catch (err) {
      console.error('Financial data fetch error:', err);
      setError(err.message);
    }
  }, []);

  const fetchExchangeData = useCallback(async () => {
    try {
      // Fetch user_purchases with exchange_products details
      const { data: purchases, error: purchasesError } = await supabase
        .from('user_purchases')
        .select(`
          id, 
          user_id, 
          product_id, 
          credits_spent, 
          created_at, 
          quantity,
          exchange_products ( id, name, description, price )
        `)
        .order('created_at', { ascending: false });

      if (purchasesError) throw purchasesError;

      setExchangeData({ purchases });
    } catch (err) {
      console.error('Exchange data fetch error:', err);
      setError(err.message);
    }
  }, []);

  const subscribeToChanges = useCallback(() => {
    // Subscribe to startnext_contributions changes
    const contribChannel = supabase
      .channel('startnext_contributions_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions' }, (payload) => {
        console.log('Contribution change detected, refreshing analytics...');
        fetchFinancialData();
      })
      .subscribe();

    // Subscribe to impact_credits changes
    const creditsChannel = supabase
      .channel('impact_credits_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'impact_credits' }, (payload) => {
        console.log('Credits change detected, refreshing analytics...');
        fetchFinancialData();
      })
      .subscribe();

    // Subscribe to user_purchases changes
    const purchasesChannel = supabase
      .channel('user_purchases_analytics')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_purchases' }, (payload) => {
        console.log('Purchase change detected, refreshing analytics...');
        fetchExchangeData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(contribChannel);
      supabase.removeChannel(creditsChannel);
      supabase.removeChannel(purchasesChannel);
    };
  }, [fetchFinancialData, fetchExchangeData]);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        await Promise.all([fetchFinancialData(), fetchExchangeData()]);
        setLoading(false);
    };
    load();
    
    const unsubscribe = subscribeToChanges();
    return () => unsubscribe();
  }, [fetchFinancialData, fetchExchangeData, subscribeToChanges]);

  return { financialData, exchangeData, loading, error };
};
