/**
 * Entropía suave del nodo (REQ-11 / Master Spec §3.9).
 *
 * - Cuentas con > 30 días de inactividad absoluta pierden un 10% de
 *   luminosidad por mes, con suelo garantizado del 20%.
 * - Una sola misión completada o cualquier plan de suscripción contratado
 *   devuelve la luminosidad al 100%.
 *
 * Función pura y determinista para TDD.
 */

export const ENTROPY_MONTH_DAYS = 30;
export const ENTROPY_DECAY_PER_MONTH = 0.1;
export const ENTROPY_FLOOR = 0.2;

/**
 * @param {Date|string|null|undefined} lastActivityAt Marca del último asiento del ledger / misión.
 * @param {Date} now
 * @returns {number} Luminosidad ∈ [0.2, 1].
 */
export function computeLuminosity(lastActivityAt, now = new Date()) {
  if (!lastActivityAt) return ENTROPY_FLOOR;

  const last = new Date(lastActivityAt);
  if (Number.isNaN(last.getTime())) return ENTROPY_FLOOR;

  const diffMs = now.getTime() - last.getTime();
  const daysInactive = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (daysInactive < ENTROPY_MONTH_DAYS) return 1;

  const months = Math.floor(daysInactive / ENTROPY_MONTH_DAYS);
  const luminosity = 1 - months * ENTROPY_DECAY_PER_MONTH;
  return Math.max(ENTROPY_FLOOR, Math.min(1, Number(luminosity.toFixed(4))));
}
