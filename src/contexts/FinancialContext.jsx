// @refresh reset
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTierLogic } from '@/hooks/useTierLogic';
import { useRealtimeProfileUpdate } from '@/hooks/useRealtimeProfileUpdate';

const FinancialContext = createContext(undefined);

export const FinancialProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const {
    userTier,
    tierBenefits,
    loading: tierLoading,
    fetchUserTier
  } = useTierLogic();

  useRealtimeProfileUpdate();

  const [balance, setBalance] = useState(0);       
  const [lifetimeScore, setLifetimeScore] = useState(0); 
  const [landDollar, setLandDollar] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchFinancialData = useCallback(async () => {
    if (!user?.id) {
      setBalance(0);
      setLifetimeScore(0);
      setLandDollar(null);
      setContributions(null);
      setLoading(false);
      return;
    }

    try {
      const { data: realBalance, error: balanceError } = await supabase
        .rpc('get_real_balance', { p_user_id: user.id });

      if (balanceError) console.error("Error fetching balance RPC:", balanceError);
      setBalance(Number(realBalance) || 0);

      const { data: metrics } = await supabase
        .from('founding_pioneer_metrics')
        .select('total_impact_credits_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      setLifetimeScore(metrics?.total_impact_credits_earned || 0);

      const { data: ld } = await supabase.from('land_dollars').select('*').eq('user_id', user.id).maybeSingle();
      setLandDollar(ld);

      const { data: contrib } = await supabase.from('startnext_contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('contribution_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setContributions(contrib);

      await fetchUserTier();

    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, fetchUserTier]); 

  useEffect(() => {
    if (user?.id && !authLoading) {
      fetchFinancialData();

      const channel = supabase
        .channel('financial_updates_global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading, fetchFinancialData]); 

  const value = useMemo(() => ({
    balance,           
    impactCredits: balance, 
    lifetimeScore,     
    landDollar,
    contributions,
    userTier,
    tierBenefits,
    loading: loading || tierLoading,
    refreshFinancials: fetchFinancialData
  }), [balance, lifetimeScore, landDollar, contributions, userTier, tierBenefits, loading, tierLoading, fetchFinancialData]);

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};