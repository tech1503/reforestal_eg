import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useTierLogic } from '@/hooks/useTierLogic';
import { useRealtimeProfileUpdate } from '@/hooks/useRealtimeProfileUpdate';

const FinancialContext = createContext(undefined);

export const FinancialProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  // --- 1. HOOKS DE LÓGICA DE NEGOCIO ---
  const {
    userTier,
    tierBenefits,
    loading: tierLoading,
    fetchUserTier
  } = useTierLogic();

  useRealtimeProfileUpdate();

  // --- 2. ESTADO FINANCIERO UNIFICADO ---
  const [balance, setBalance] = useState(0);       // Saldo Gastable (Real)
  const [lifetimeScore, setLifetimeScore] = useState(0); // Score Histórico (Total Ganado)
  const [landDollar, setLandDollar] = useState(null);
  const [contributions, setContributions] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- 3. FUNCIÓN DE CARGA DE DATOS ---
  const fetchFinancialData = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setLifetimeScore(0);
      setLandDollar(null);
      setContributions(null);
      setLoading(false);
      return;
    }

    try {
      // A. OBTENER SALDO REAL (RPC - Income vs Expenses)
      const { data: realBalance, error: balanceError } = await supabase
        .rpc('get_real_balance', { p_user_id: user.id });

      if (balanceError) console.error("Error fetching balance RPC:", balanceError);
      
      const safeBalance = Number(realBalance) || 0;
      setBalance(safeBalance);

      // B. OBTENER MÉTRICAS (Fuente de Ingresos)
      const { data: metrics } = await supabase
        .from('founding_pioneer_metrics')
        .select('total_impact_credits_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      setLifetimeScore(metrics?.total_impact_credits_earned || 0);

      // C. DATOS DE ACTIVOS Y CONTRIBUCIONES
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
  }, [user, fetchUserTier]);

  // --- 4. SUSCRIPCIONES REALTIME ---
  useEffect(() => {
    if (user && !authLoading) {
      fetchFinancialData();

      const channel = supabase
        .channel('financial_updates_global')
        // Escuchamos METRICS (Ingresos) y PURCHASES (Gastos)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_purchases', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        // Escuchamos otros activos
        .on('postgres_changes', { event: '*', schema: 'public', table: 'land_dollars', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'startnext_contributions', filter: `user_id=eq.${user.id}` }, () => fetchFinancialData())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchFinancialData]);

  const value = {
    balance,           // USAR ESTE para mostrar Saldo Disponible (ej. 125 o 235 si no gastó)
    impactCredits: balance, // Mapeamos impactCredits al balance para corregir el Dashboard visualmente
    lifetimeScore,     // Total ganado históricamente (ej. 235 siempre, aunque gaste)
    landDollar,
    contributions,
    userTier,
    tierBenefits,
    loading: loading || tierLoading,
    refreshFinancials: fetchFinancialData
  };

  return <FinancialContext.Provider value={value}>{children}</FinancialContext.Provider>;
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (context === undefined) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};