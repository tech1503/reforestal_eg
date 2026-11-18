import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { computeLuminosity } from '@/utils/myzelEntropy';
import { resolveMyzelGrades, highestUnlockedGrade } from '@/utils/myzelGrades';

/**
 * Hook del visualizador 2D del Micelio.
 *
 * Datos reales disponibles en cliente:
 *  - XP por pilar propio (`user_xp`, SELECT own).
 *  - Última actividad propia en `ic_ledger` → entropía propia (-10%/mes, suelo 20%).
 *  - `profiles.membership_stage` → insignia Semilla / Miembro verificado (§15b).
 *  - RPC `myzel_network` (27_myzel_network.sql): vecindad reticular de 4 grados
 *    por BFS sobre referral + anastomosis. Si la RPC no existe (migración 27 sin
 *    aplicar) o devuelve error, el grafo cae en modo "vista previa".
 */
export function useMyzelNetwork({ subscriptionTier = null, pointsUnlockedGrades = [], peerNodes: peerNodesOverride = null } = {}) {
  const { user, profile } = useAuth();
  const [communityXp, setCommunityXp] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [lastActivityAt, setLastActivityAt] = useState(null);
  const [rpcPeerNodes, setRpcPeerNodes] = useState([]);
  const [networkReady, setNetworkReady] = useState(false);
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

        const { data: netRows, error: netError } = await supabase.rpc('myzel_network', { p_user_id: user.id });
        if (netError) {
          console.warn('[Myzel] myzel_network no disponible (¿migración 27 aplicada?), modo vista previa:', netError.message);
        }

        if (mounted) {
          setCommunityXp(community);
          setTotalXp(total);
          setLastActivityAt(lastRows?.[0]?.created_at ?? null);
          setRpcPeerNodes(
            netError
              ? []
              : (netRows || []).map((r) => ({
                  degree: Number(r.degree),
                  peerId: r.peer_id,
                  publicHandle: r.public_handle || 'miembro',
                  via: r.via,
                  luminosity: Number(r.luminosity) || 1,
                }))
          );
          setNetworkReady(!netError);
        }
      } catch (err) {
        console.error('[Myzel] Error cargando datos de red:', err);
        if (mounted) setNetworkReady(false);
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

  const peerNodes = peerNodesOverride ?? rpcPeerNodes;

  const peerCounts = useMemo(() => {
    const counts = { degree1: 0, degree2: 0, degree3: 0, degree4: 0 };
    for (const node of peerNodes) {
      if (node.degree >= 1 && node.degree <= 4) counts[`degree${node.degree}`] += 1;
    }
    return counts;
  }, [peerNodes]);

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
    peerNodes,
    peerCounts,
    networkReady,
  };
}

export default useMyzelNetwork;
