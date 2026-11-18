import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { computeLuminosity } from '@/utils/myzelEntropy';
import { resolveMyzelGrades, highestUnlockedGrade } from '@/utils/myzelGrades';

/**
 * Hook del visualizador 2D del Micelio.
 *
 * Datos reales disponibles en cliente (sin RPC nueva):
 *  - XP por pilar propio (`user_xp`, SELECT own) → luminosidad y nivel Community.
 *  - Última actividad propia en `ic_ledger` → entropía (-10%/mes, suelo 20%).
 *  - `profiles.membership_stage` → insignia Semilla / Miembro verificado (§15b).
 *
 * La topología real de la red (peers por grado) llegará con REQ-06/REQ-09;
 * mientras tanto, `peers` viene de props y el grafo usa nodos ilustrativos
 * etiquetados como vista previa. NUNCA se muestran peers inventados como reales.
 */
export function useMyzelNetwork({ subscriptionTier = null, pointsUnlockedGrades = [], peers = {} } = {}) {
  const { user, profile } = useAuth();
  const [communityXp, setCommunityXp] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [lastActivityAt, setLastActivityAt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (!user?.id) {
      setLoading(false);
      return undefined;
    }

    const fetchNetworkData = async () => {
      try {
        const { data: xpRows, error: xpError } = await supabase
          .from('user_xp')
          .select('pillar, xp')
          .eq('user_id', user.id);

        if (xpError) console.warn('[Myzel] user_xp no disponible:', xpError.message);

        const rows = xpRows || [];
        const community = rows
          .filter((r) => r.pillar === 'community')
          .reduce((acc, r) => acc + (Number(r.xp) || 0), 0);
        const total = rows.reduce((acc, r) => acc + (Number(r.xp) || 0), 0);

        const { data: lastRows, error: ledgerError } = await supabase
          .from('ic_ledger')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (ledgerError) console.warn('[Myzel] ic_ledger no disponible:', ledgerError.message);

        if (mounted) {
          setCommunityXp(community);
          setTotalXp(total);
          setLastActivityAt(lastRows?.[0]?.created_at ?? null);
        }
      } catch (err) {
        console.error('[Myzel] Error cargando datos de red:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchNetworkData();

    const channel = supabase
      .channel(`myzel_network_${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ic_ledger', filter: `user_id=eq.${user.id}` }, fetchNetworkData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_xp', filter: `user_id=eq.${user.id}` }, fetchNetworkData)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const luminosity = useMemo(
    () => computeLuminosity(lastActivityAt, new Date()),
    [lastActivityAt]
  );

  const grades = useMemo(
    () => resolveMyzelGrades({ subscriptionTier, pointsUnlockedGrades }),
    [subscriptionTier, pointsUnlockedGrades]
  );

  const isVerified = profile?.membership_stage === 'VERIFIED_MEMBER_15GENG';

  return {
    loading,
    communityXp,
    totalXp,
    lastActivityAt,
    luminosity,
    grades,
    highestUnlockedGrade: highestUnlockedGrade(grades),
    isVerified,
    membershipStage: profile?.membership_stage ?? null,
    peers: {
      degree1: Number(peers?.degree1) || 0,
      degree2: Number(peers?.degree2) || 0,
      degree3: Number(peers?.degree3) || 0,
      degree4: Number(peers?.degree4) || 0,
    },
  };
}

export default useMyzelNetwork;
