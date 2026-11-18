/**
 * Topología de la red Myzel (REQ-06): grafo NO DIRIGIDO y simétrico construido
 * a partir de:
 *   - profiles.referrer_id  (vínculos de apadrinamiento)  via = 'referral'
 *   - anastomosis_log       (apretones de manos digitales) via = 'anastomosis'
 *
 * BFS desde el nodo origen hasta p_max_depth (máx. 4) asignando a cada nodo su
 * grado mínimo de vecindad. Espejo funcional de la RPC `myzel_network`.
 *
 * Función pura y determinista para TDD.
 */

export const MAX_MYZEL_DEPTH = 4;

/**
 * @param {string} originId Nodo origen (auth.uid()).
 * @param {Array<{a?: string, b?: string, user_a_id?: string, user_b_id?: string, via?: string, type?: string}>} edges
 * @param {number} maxDepth Profundidad máxima (1..4).
 * @returns {{ 1: Array<Peer>, 2: Array<Peer>, 3: Array<Peer>, 4: Array<Peer> }}
 *   Peer = { id, degree, via }
 */
export function buildMyzelTopology(originId, edges = [], maxDepth = MAX_MYZEL_DEPTH) {
  if (!originId) throw new Error('ORIGIN_REQUIRED');
  const depthCap = Math.max(1, Math.min(MAX_MYZEL_DEPTH, Number(maxDepth) || MAX_MYZEL_DEPTH));

  const adjacency = new Map();
  const push = (from, to, via) => {
    if (!from || !to || from === to) return;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, via });
  };

  for (const edge of edges || []) {
    const a = edge.a ?? edge.user_a_id ?? null;
    const b = edge.b ?? edge.user_b_id ?? null;
    const via = edge.via ?? edge.type ?? 'unknown';
    push(a, b, via);
    push(b, a, via);
  }

  const byDegree = { 1: [], 2: [], 3: [], 4: [] };
  const visited = new Map(); // nodeId -> { degree, via }
  const queue = [{ id: originId, degree: 0 }];

  while (queue.length > 0) {
    const { id, degree } = queue.shift();
    if (degree >= depthCap) continue;

    for (const neighbor of adjacency.get(id) ?? []) {
      if (neighbor.to === originId) continue;
      if (visited.has(neighbor.to)) continue; // BFS: la primera visita es la de menor grado
      const nextDegree = degree + 1;
      visited.set(neighbor.to, { degree: nextDegree, via: neighbor.via });
      queue.push({ id: neighbor.to, degree: nextDegree });
    }
  }

  for (const [id, { degree, via }] of visited) {
    if (degree <= depthCap) byDegree[degree].push({ id, degree, via });
  }
  for (const list of Object.values(byDegree)) {
    list.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  return byDegree;
}

export function flattenTopology(byDegree) {
  return Object.values(byDegree).flat();
}

export function peersByDegree(byDegree) {
  return {
    degree1: byDegree[1]?.length ?? 0,
    degree2: byDegree[2]?.length ?? 0,
    degree3: byDegree[3]?.length ?? 0,
    degree4: byDegree[4]?.length ?? 0,
  };
}
