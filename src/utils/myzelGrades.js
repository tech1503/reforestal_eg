/**
 * Reglas de apertura de los Grados del Micelio (REQ-06).
 * Espejo de la normativa (Modul II / Master Spec §3.8 y §6.3):
 *  - Grado 1: abierto para todo miembro registrado, también en acceso gratuito.
 *  - Grados 2-4: solo abiertos mediante suscripción activa
 *    (Guardián/a = Grado 2, Campeón/a = Grado 3, Paladín/a = Grado 4)
 *    o mediante el Skill-Level Community correspondiente + puntos de
 *    Freischaltung (senke LIFO).
 *  - Los impulsos que llegan a un nodo con su grado cerrado regresan a
 *    Topf B (Zero-Waste-Loop).
 *
 * Función pura y determinista para TDD y para el visualizador 2D.
 */

export const MYZEL_MAX_GRADE = 4;

export const SUBSCRIPTION_GRADE_MAP = {
  explorador: 1,
  guardian: 2,
  campeon: 3,
  paladin: 4,
};

/**
 * Normaliza etiquetas de plan muy variables (ES/DE/EN, "Guardián/a", "guardian",
 * "Guardian/a", etc.) a un slug estable. Devuelve null si no se reconoce.
 */
export function normalizeSubscriptionTier(raw) {
  const s = (raw ?? '').toString().toLowerCase().trim();
  if (!s) return null;
  if (s.includes('explor')) return 'explorador';
  if (s.includes('guardi')) return 'guardian';
  if (s.includes('campe')) return 'campeon';
  if (s.includes('palad')) return 'paladin';
  if (s.includes('free') || s.includes('gratis') || s.includes('basic')) return 'free';
  return null;
}

export function subscriptionGrade(subscriptionTier) {
  const tier = normalizeSubscriptionTier(subscriptionTier);
  return tier ? (SUBSCRIPTION_GRADE_MAP[tier] ?? 0) : 0;
}

/**
 * Resuelve el estado de los 4 grados para un miembro.
 * @param {{ subscriptionTier?: string|null, pointsUnlockedGrades?: number[] }} input
 * @returns {Array<{ grade: number, unlocked: boolean, via: 'open'|'subscription'|'points'|null }>}
 */
export function resolveMyzelGrades({ subscriptionTier = null, pointsUnlockedGrades = [] } = {}) {
  const subGrade = subscriptionGrade(subscriptionTier);
  const points = new Set(
    (Array.isArray(pointsUnlockedGrades) ? pointsUnlockedGrades : [])
      .map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n >= 2 && n <= MYZEL_MAX_GRADE)
  );

  return [1, 2, 3, 4].map((grade) => {
    if (grade === 1) return { grade, unlocked: true, via: 'open' };
    const viaSubscription = subGrade >= grade;
    const viaPoints = points.has(grade);
    return {
      grade,
      unlocked: viaSubscription || viaPoints,
      via: viaSubscription ? 'subscription' : viaPoints ? 'points' : null,
    };
  });
}

export function highestUnlockedGrade(grades) {
  return (grades || []).reduce((max, g) => (g?.unlocked ? Math.max(max, g.grade) : max), 1);
}

/**
 * Plan mínimo requerido para abrir un grado por suscripción.
 * Grado 2 → Guardián/a, Grado 3 → Campeón/a, Grado 4 → Paladín/a.
 */
export const GRADE_REQUIRED_PLAN = { 2: 'guardian', 3: 'campeon', 4: 'paladin' };
