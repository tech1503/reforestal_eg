/**
 * LIFO Engine — espejo funcional de la RPC PostgreSQL `wallet_lifo_deduct`
 * (scripts/sql/26_wallet_lifo_deduct.sql).
 *
 * Reglas normativas (REFORESTAL_MASTER_PRODUCT_SPECIFICATION, §3.4):
 *  - El consumo digital extrae EXCLUSIVAMENTE puntos inmaduros (< 90 días),
 *    empezando por los más recientes (Last-In, First-Out).
 *  - Los puntos antiguos (>= 90 días) mantienen su periodo de maduración
 *    inalterado y NUNCA son consumidos por senkes digitales.
 *  - Los asientos del ledger son append-only: los gastos se registran como
 *    asientos negativos vinculados a sus "lots" de origen mediante la tabla
 *    `ic_ledger_lifo_allocations`.
 *  - Gastos históricos sin allocations (legacy `spend_ic` / `spend_points_lifo`)
 *    se distribuyen newest-first sobre los lots al leer el estado.
 *
 * Este módulo es puro y determinista para permitir TDD sin base de datos.
 * La fuente de verdad en runtime es PL/pgSQL; cualquier cambio en uno debe
 * replicarse en el otro.
 */

export const MATURITY_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;
export const LIFO_ERRORS = {
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  INVALID_MATURITY_DAYS: 'INVALID_MATURITY_DAYS',
  INSUFFICIENT_IMMATURE_POINTS: 'INSUFFICIENT_IMMATURE_POINTS',
};

export class LifoError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'LifoError';
    this.code = code;
  }
}

export function maturityDate(createdAt, maturityDays = MATURITY_DAYS) {
  return new Date(new Date(createdAt).getTime() + maturityDays * DAY_MS);
}

export function isMature(createdAt, now = new Date(), maturityDays = MATURITY_DAYS) {
  return new Date(createdAt).getTime() <= now.getTime() - maturityDays * DAY_MS;
}

export function daysToMaturity(createdAt, now = new Date(), maturityDays = MATURITY_DAYS) {
  const ms = maturityDate(createdAt, maturityDays).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / DAY_MS));
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Ordena lots más recientes primero (created_at DESC, id DESC como en SQL).
 */
function sortNewestFirst(lots) {
  return [...lots].sort((a, b) => {
    const t = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return t !== 0 ? t : toNumber(b.id) - toNumber(a.id);
  });
}

/**
 * Distribuye `unallocatedSpend` puntos de gasto legacy (no trazado)
 * newest-first sobre los lots ya reducidos por sus allocations explícitas.
 * Replica el clamp GREATEST(0, LEAST(remPre, remPre - (unalloc - newerRem)))
 * del CTE en PL/pgSQL.
 *
 * @returns {Array} lots con `remPre` y `remaining` en puntos.
 */
export function distributeLots(lots = [], unallocatedSpend = 0) {
  const normalized = sortNewestFirst(
    lots.map((lot) => {
      const original = Math.max(0, toNumber(lot.amount));
      const allocated = Math.max(0, Math.min(original, toNumber(lot.allocated)));
      return {
        ...lot,
        id: lot.id,
        createdAt: lot.createdAt,
        originalAmount: original,
        allocatedAmount: allocated,
        remPre: original - allocated,
      };
    })
  );

  let newerRem = 0;
  let spendLeft = Math.max(0, toNumber(unallocatedSpend));

  return normalized.map((lot) => {
    const consume = Math.max(0, Math.min(lot.remPre, spendLeft - newerRem));
    const remaining = lot.remPre - consume;
    newerRem += lot.remPre;
    return { ...lot, unallocatedBurn: consume, remaining };
  });
}

/**
 * Estado de la cartera para UI (paneles Inmaduro/Maduro).
 * `spends` debe incluir TODOS los asientos negativos; cada gasto con
 * `tracked: true` ya está reflejado en `lot.allocated` y se excluye del
 * reparto legacy.
 */
export function summarizeWallet(lots = [], spends = [], now = new Date(), maturityDays = MATURITY_DAYS) {
  const unallocatedSpend = spends
    .filter((s) => !s.tracked)
    .reduce((acc, s) => acc + Math.max(0, -toNumber(s.amount)), 0);

  const distributed = distributeLots(lots, unallocatedSpend);

  let immature = 0;
  let mature = 0;
  for (const lot of distributed) {
    if (isMature(lot.createdAt, now, maturityDays)) mature += lot.remaining;
    else immature += lot.remaining;
  }

  return {
    lots: distributed,
    immaturePoints: immature,
    maturePoints: mature,
    totalPoints: immature + mature,
  };
}

/**
 * Planifica una deducción LIFO estricta sobre puntos inmaduros.
 * Lanza LifoError('INSUFFICIENT_IMMATURE_POINTS') si el disponible inmaduro no
 * cubre `amount`; los puntos maduros jamás se tocan.
 *
 * @param {Array} lots   Lots positivos: [{ id, createdAt, amount, allocated }]
 * @param {Array} spends Asientos negativos: [{ id, amount, tracked }]
 * @param {number} amount Puntos a deducir (> 0)
 * @param {{ now?: Date, maturityDays?: number }} options
 * @returns {{ allocations: Array<{lotId, amount, createdAt}>, immatureAvailableBefore: number, immatureRemainingAfter: number }}
 */
export function planLifoDeduction(lots = [], spends = [], amount, options = {}) {
  const { now = new Date(), maturityDays = MATURITY_DAYS } = options;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new LifoError(LIFO_ERRORS.INVALID_AMOUNT, 'p_amount must be a positive integer');
  }
  if (!Number.isInteger(maturityDays) || maturityDays < 1) {
    throw new LifoError(LIFO_ERRORS.INVALID_MATURITY_DAYS, 'maturityDays must be a positive integer');
  }

  const unallocatedSpend = spends
    .filter((s) => !s.tracked)
    .reduce((acc, s) => acc + Math.max(0, -toNumber(s.amount)), 0);

  const distributed = distributeLots(lots, unallocatedSpend);
  const immatureLots = distributed
    .filter((lot) => !isMature(lot.createdAt, now, maturityDays))
    .filter((lot) => lot.remaining > 0);

  const immatureAvailable = immatureLots.reduce((acc, lot) => acc + lot.remaining, 0);
  if (immatureAvailable < amount) {
    throw new LifoError(
      LIFO_ERRORS.INSUFFICIENT_IMMATURE_POINTS,
      `Insufficient immature points: requested ${amount}, available ${immatureAvailable}. ` +
      `Mature points (>= ${maturityDays} days) are never consumed by digital senkes.`
    );
  }

  let need = amount;
  const allocations = [];
  for (const lot of immatureLots) {
    if (need <= 0) break;
    const take = Math.min(need, lot.remaining);
    allocations.push({ lotId: lot.id, amount: take, createdAt: lot.createdAt });
    need -= take;
  }

  return {
    allocations,
    immatureAvailableBefore: immatureAvailable,
    immatureRemainingAfter: immatureAvailable - amount,
  };
}
