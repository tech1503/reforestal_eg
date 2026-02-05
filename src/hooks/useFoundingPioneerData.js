
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

/**
 * Custom hook to fetch Founding Pioneer data for Admin Dashboard.
 * Includes real-time subscriptions.
 */
export const useFoundingPioneerData = () => {
  const [pioneers, setPioneers] = useState([]);
  const [topPioneers, setTopPioneers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPioneers = useCallback(async () => {
    try {
      // 1. Fetch profiles that are potentially relevant (filtering could be improved if list is huge)
      // For now fetching top 200 recent profiles for evaluation list to avoid massive payload
      // Ideally this should use pagination.
      const { data: profilesData, error: fetchError } = await supabase
        .from('profiles')
        .select(`
          id, 
          name, 
          email, 
          role,
          created_at,
          startnext_contributions ( contribution_amount, contribution_date )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // 2. Fetch metrics for Top 100 Leaderboard
      // Note: Relation from metrics to profiles is needed for names
      const { data: metricsData, error: metricsError } = await supabase
        .from('founding_pioneer_metrics')
        .select(`
          *,
          profiles:user_id ( name, email )
        `)
        .eq('founding_pioneer_access_status', 'approved') // Only approved in top list? Or all? Let's show all for ranking.
        .order('evaluation_score', { ascending: false }) // Primary sort
        .order('total_impact_credits_earned', { ascending: false }) // Secondary sort
        .limit(100);

      if (metricsError) throw metricsError;

      // Process Pioneers list for Evaluation Table
      const processedPioneers = profilesData.map(p => ({
          ...p,
          full_name: p.name,
          // Calculate total contributions on client for quick display
          contribution_count: p.startnext_contributions?.length || 0,
          total_contribution: p.startnext_contributions?.reduce((sum, c) => sum + Number(c.contribution_amount), 0) || 0
      }));

      // Process Top Pioneers
      const processedTop = metricsData.map(m => ({
          id: m.id, // metrics id
          user_id: m.user_id,
          user_name: m.profiles?.name || 'Unknown',
          total_score: m.evaluation_score || 0,
          impact_credits: m.total_impact_credits_earned || 0
      }));

      setPioneers(processedPioneers);
      setTopPioneers(processedTop);
      setError(null);
    } catch (err) {
      console.error('Founding pioneer data fetch error:', err);
      setError(err.message);
    }
  }, []);

  const subscribeToChanges = useCallback(() => {
    const profilesChannel = supabase
      .channel('profiles_pioneer_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
        console.log('Profile change:', payload);
        fetchPioneers();
      })
      .subscribe();

    const metricsChannel = supabase
      .channel('metrics_pioneer_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'founding_pioneer_metrics' }, (payload) => {
        console.log('Metrics change:', payload);
        fetchPioneers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
      supabase.removeChannel(metricsChannel);
    };
  }, [fetchPioneers]);

  useEffect(() => {
    const load = async () => {
        setLoading(true);
        await fetchPioneers();
        setLoading(false);
    };
    load();
    const unsubscribe = subscribeToChanges();
    return () => unsubscribe();
  }, [fetchPioneers, subscribeToChanges]);

  return { pioneers, topPioneers, loading, error, refetch: fetchPioneers };
};
