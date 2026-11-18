/**
 * Dispersión omnidireccional de energía por la red Myzel (REQ-06, Modul II / §3.4):
 *
 *   Actividad / Misiones: 50% actor · 25% Grado 1 · 12,5% Grado 2 · 6,25% Grado 3 · 6,25% Grado 4
 *
 * Reglas de integridad:
 *  - Puntos enteros; reparto por método de mayor resto (determinista, desempate por índice de
 *    mayor a menor peso y, dentro de un grado, por peer_id ASC).
 *  - La suma de TODOS los abonos + zero_waste siempre es exactamente igual al budget.
 *  - Un impulso destinado a un nodo cuyo grado receptor está cerrado (sin plan habilitante
 *    ni Freischaltung de puntos) regresa íntegro al fondo comunitario (Zero-Waste-Loop);
 *    NUNCA se redistribuye entre hermanos.
 *  - Grado 1 está abierto para todo miembro registrado (incluido el acceso gratuito).
 *
 * Espejo funcional de la RPC `myzel_distribute_activity`.
 */

export const ACTIVITY_WEIGHTS = Object.freeze({
  actor: 0.5,
  degree1: 0.25,
  degree2: 0.125,
  degree3: 0.0625,
  degree4: 0.0625,
});

const DEGREE_WEIGHTS = [0.5, 0.25, 0.125, 0.125]; // proporcional dentro del pool de red

export function splitIntegerShares(amount, weights) {
  if (!Number.isInteger(amount) || amount < 0) throw new Error('INVALID_BUDGET');
  const raw = weights.map((w) => amount * w);
  const floors = raw.map((r) => Math.floor(r));
  let residual = amount - floors.reduce((acc, v) => acc + v, 0);

  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i));

  for (let k = 0; residual > 0; k += 1) {
    floors[order[k % order.length].i] += 1;
    residual -= 1;
  }
  return floors;
}

/**
 * Dispersión para MISIONES (Modul II, Cap. 6 — "Der Konkrete Punkte- & XP-Katalog"):
 * la recompensa mostrada al usuario (p. ej. "+15 P") es el Eigenverdienst del
 * actor (50%). El presupuesto total que Topf B paga es 2× ese valor; el actor
 * recibe el 100% de lo mostrado y la red otro tanto.
 *
 * Espejo de la llamada en submit_mission_response (27/28_myzel*.sql):
 *   myzel_distribute_activity(v_uid, v_reward_int * 2, ...)
 */
export function planMissionActivityDispersion({ actorId = 'mission-actor', personalReward, degrees = {}, openGradesByRecipient = {} }) {
  if (!Number.isInteger(personalReward) || personalReward < 0) {
    throw new Error('INVALID_PERSONAL_REWARD');
  }
  if (personalReward === 0) {
    return {
      missionBudget: 0,
      personal: 0,
      credits: [],
      actorShare: 0,
      networkBudget: 0,
      degreePools: { 1: 0, 2: 0, 3: 0, 4: 0 },
      zeroWaste: { 1: 0, 2: 0, 3: 0, 4: 0, total: 0 },
      totalCredited: 0,
    };
  }
  const missionBudget = personalReward * 2;
  const plan = planActivityDispersion({ actorId, budget: missionBudget, degrees, openGradesByRecipient });
  return {
    ...plan,
    missionBudget,
    personal: plan.actorShare,
  };
}

export const GRADE_REQUIRED_PLAN_GRADE = { 2: 2, 3: 3, 4: 4 };

/**
 * Nivel de grado abierto para un destinatario: 1 (siempre) a 4.
 * Sin datos del destinatario se asume el acceso gratuito (solo Grado 1).
 */
export function recipientOpenGrade(subscriptionGradeOf) {
  const grade = Number(subscriptionGradeOf);
  if (!Number.isInteger(grade)) return 1;
  return Math.max(1, Math.min(4, grade));
}

/**
 * Planifica la dispersión de un presupuesto de actividad.
 *
 * @param {object} input
 * @param {string} input.actorId
 * @param {number} input.budget Puntos enteros > 0 a dispersar (total, incluye la parte del actor).
 * @param {object} input.degrees  Resultado de buildMyzelTopology: { 1: [{id}], ... }
 * @param {object} [input.openGradesByRecipient] Mapa peerId -> grado máximo abierto (1..4).
 * @returns {{
 *   credits: Array<{ userId: string, degree: 'actor'|1|2|3|4, amount: number }>,
 *   actorShare: number,
 *   networkBudget: number,
 *   degreePools: { 1: number, 2: number, 3: number, 4: number },
 *   zeroWaste: { 1: number, 2: number, 3: number, 4: number, total: number },
 *   totalCredited: number,
 * }}
 */
export function planActivityDispersion({ actorId, budget, degrees = {}, openGradesByRecipient = {} }) {
  if (!actorId) throw new Error('ACTOR_REQUIRED');
  if (!Number.isInteger(budget) || budget <= 0) throw new Error('INVALID_BUDGET');

  const actorShare = Math.floor(budget / 2);
  const networkBudget = budget - actorShare;
  const [d1, d2, d3, d4] = splitIntegerShares(networkBudget, DEGREE_WEIGHTS);
  const degreePools = { 1: d1, 2: d2, 3: d3, 4: d4 };

  const credits = [{ userId: actorId, degree: 'actor', amount: actorShare }];
  const zeroWaste = { 1: 0, 2: 0, 3: 0, 4: 0, total: 0 };

  for (const degree of [1, 2, 3, 4]) {
    const pool = degreePools[degree];
    if (pool <= 0) continue;

    const peers = [...(degrees[degree] || [])]
      .map((p) => (typeof p === 'string' ? p : p.id))
      .filter(Boolean)
      .sort((a, b) => String(a).localeCompare(String(b)));

    if (peers.length === 0) {
      zeroWaste[degree] += pool;
      zeroWaste.total += pool;
      continue;
    }

    const base = Math.floor(pool / peers.length);
    let remainder = pool - base * peers.length;

    for (const peerId of peers) {
      const amount = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;

      const openGrade = recipientOpenGrade(openGradesByRecipient[peerId]);
      if (openGrade >= degree) {
        credits.push({ userId: peerId, degree, amount });
      } else {
        zeroWaste[degree] += amount;
        zeroWaste.total += amount;
      }
    }
  }

  const totalCredited = credits.reduce((acc, c) => acc + c.amount, 0);
  return { credits, actorShare, networkBudget, degreePools, zeroWaste, totalCredited };
}
