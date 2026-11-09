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

  const [balance, setBalance] = useState(0);        // Total desde ic_ledger
  const [immatureBalance, setImmatureBalance] = useState(0); // Canasta Verde (<90 días) - calculada dinámicamente
  const [matureBalance, setMatureBalance] = useState(0);      // Canasta Dorada (>=90 días) - calculada dinámicamente
  const [lifetimeScore, setLifetimeScore] = useState(0);  // Total impact credits earned
  const [landDollar, setLandDollar] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [pointBalance, setPointBalance] = useState(0); // Balance total de puntos (ic_ledger amount)
  const [loading, setLoading] = useState(true);

  const fetchFinancialData = useCallback(async () => {
    if (!user?.id) {
      setBalance(0);
      setImmatureBalance(0);
      setMatureBalance(0);
      setLifetimeScore(0);
      setLandDollar(null);
      setContributions(null);
      setLoading(false);
      return;
    }

    try {
      // FUENTE ATÓMICA ABSOLUTA: ic_ledger (Fase 2) — suma de todos los movimientos
      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ic_ledger')
        .select('amount, created_at, tax_origin')
        .eq('user_id', user.id);

      // FUENTE ATÓMICA: suma total de ic_ledger.
      // Se declara AQUÍ (y no dentro del bloque else) para que siga siendo
      // visible en el fallback de financial_context_view más abajo (línea del
      // setPointBalance), que queda fuera del ámbito del if/else.
      // Si hubo error en el ledger, permanece en 0 y el fallback usa 0.
      let atomicBalance = 0;

      if (ledgerError) {
        console.error("Error fetch ic_ledger:", ledgerError);
        setBalance(0);
        setImmatureBalance(0);
        setMatureBalance(0);
      } else {
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));

        let immatureBalanceTemp = 0;  // <90 days = Verde/Inmaduro (solo uso digital)
        let matureBalanceTemp = 0;     // >=90 days = Dorado/Maduro (convertible a dm²)
        
        (ledgerData || []).forEach(row => {
          const amount = Number(row.amount) || 0;
          atomicBalance += amount;
          
          const createdAt = new Date(row.created_at);
          if (createdAt >= ninetyDaysAgo) {
            // Canasta Verde / Inmadura (<90 días) - solo uso digital
            immatureBalanceTemp += amount;
          } else {
            // Canasta Dorada / Madura (>=90 días) - convertible a dm²
            matureBalanceTemp += amount;
          }
        });
        
        console.log('Saldo calculado desde ic_ledger:', atomicBalance);
        console.log('Saldo LIFO:', {
          total: atomicBalance,
          verde_inmaduro: immatureBalanceTemp, // <90 días
          dorada_madura: matureBalanceTemp,    // >=90 días
        });
        setBalance(atomicBalance);
        setImmatureBalance(immatureBalanceTemp);
        setMatureBalance(matureBalanceTemp);
      }

      const { data: metrics } = await supabase
        .from('founding_pioneer_metrics')
        .select('total_impact_credits_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      setLifetimeScore(metrics?.total_impact_credits_earned || 0);

      const { data: ld } = await supabase.from('land_dollar_tokens').select('*').eq('first_claimed_by_user_id', user.id).maybeSingle();
      setLandDollar(ld);

      const { data: contrib } = await supabase.from('contributions')
        .select('*')
        .eq('user_id', user.id)
        .order('contribution_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      setContributions(contrib);

      // Consultar vista financial_context_view para cestas verdes/doradas
      const { data: viewData } = await supabase
        .from('financial_context_view')
        .select('green_basket_points, gold_basket_points, total_ic_ledger_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (viewData) {
        // Cestas calculadas dinámicamente en SQL (NOW() - INTERVAL '90 days')
        setImmatureBalance(viewData.green_basket_points || 0);
        setMatureBalance(viewData.gold_basket_points || 0);
        setPointBalance(matureBalance);
      } else {
        setPointBalance(matureBalance);
      }

      await fetchUserTier();

    } catch (err) {
      console.error("Error fetching financial data:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, matureBalance, fetchUserTier]); 

  useEffect(() => {
    if (user?.id && !authLoading) {
      fetchFinancialData();

      const channel = supabase
        .channel('financial_updates_global')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollar_tokens', filter: `first_claimed_by_user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'contributions', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        // Fase 2: Escuchar cambios en la economía atómica (ic_ledger y impact_credits)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ic_ledger', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'impact_credits', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        // Suscripción a share_conversions (cosechas § 15b GenG)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'share_conversions', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user?.id, authLoading, fetchFinancialData]); 

  const value = useMemo(() => ({
    balance,
    immatureBalance,
    matureBalance,
    impactCredits: balance,
    lifetimeScore,
    landDollar,
    contributions,
    pointBalance,
    userTier,
    tierBenefits,
    loading: loading || tierLoading,
    refreshFinancials: fetchFinancialData
  }), [balance, immatureBalance, matureBalance, lifetimeScore, landDollar, contributions, pointBalance, userTier, tierBenefits, loading, tierLoading, fetchFinancialData]);

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};

export default FinancialProvider;