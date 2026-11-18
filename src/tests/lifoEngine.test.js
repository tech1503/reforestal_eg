import { describe, it, expect } from 'vitest';
import {
  planLifoDeduction,
  summarizeWallet,
  distributeLots,
  isMature,
  daysToMaturity,
  maturityDate,
  LifoError,
  LIFO_ERRORS,
  MATURITY_DAYS,
} from '@/utils/lifoEngine';

const NOW = new Date('2026-11-18T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

describe('wallet_lifo_deduct — Criterio de Aceptación 3 (Consumo Estricto LIFO)', () => {
  it('descuenta exclusivamente de los puntos más recientes, preservando la maduración de los antiguos', () => {
    // Escenario normativo: 100 P acumulados hace 80 días + 20 P de hoy.
    // Un gasto de 10 P debe salir de los 20 recientes; los 100 P conservan su vencimiento a 10 días.
    const lots = [
      { id: 1, createdAt: daysAgo(80), amount: 100, allocated: 0 },
      { id: 2, createdAt: daysAgo(0), amount: 20, allocated: 0 },
    ];

    const result = planLifoDeduction(lots, [], 10, { now: NOW });

    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0]).toMatchObject({ lotId: 2, amount: 10 });
    expect(result.immatureAvailableBefore).toBe(120);
    expect(result.immatureRemainingAfter).toBe(110);

    const state = summarizeWallet(
      [{ ...lots[1], allocated: 10 }, lots[0]],
      [{ id: 99, amount: -10, tracked: true }],
      NOW
    );
    expect(state.immaturePoints).toBe(110);
    expect(state.maturePoints).toBe(0);
    // El vencimiento del lot antiguo no se altera: sigue faltando 10 días.
    expect(daysToMaturity(lots[0].createdAt, NOW, MATURITY_DAYS)).toBe(10);
  });
});

describe('wallet_lifo_deduct — senkes digitales estrictos', () => {
  it('rechaza el consumo si los inmaduros no cubren, aunque haya maduros disponibles', () => {
    const lots = [
      { id: 1, createdAt: daysAgo(120), amount: 500, allocated: 0 }, // maduro
      { id: 2, createdAt: daysAgo(10), amount: 15, allocated: 0 },   // inmaduro
    ];

    expect(() => planLifoDeduction(lots, [], 20, { now: NOW })).toThrow(LifoError);
    try {
      planLifoDeduction(lots, [], 20, { now: NOW });
    } catch (e) {
      expect(e.code).toBe(LIFO_ERRORS.INSUFFICIENT_IMMATURE_POINTS);
      expect(e.message).toContain('available 15');
    }
  });

  it('consume múltiples lots inmaduros newest-first hasta completar el monto', () => {
    const lots = [
      { id: 1, createdAt: daysAgo(30), amount: 40, allocated: 0 },
      { id: 2, createdAt: daysAgo(4), amount: 15, allocated: 0 },
      { id: 3, createdAt: daysAgo(0), amount: 5, allocated: 0 },
    ];

    const { allocations } = planLifoDeduction(lots, [], 12, { now: NOW });

    expect(allocations).toEqual([
      { lotId: 3, amount: 5, createdAt: daysAgo(0) },
      { lotId: 2, amount: 7, createdAt: daysAgo(4) },
    ]);
  });

  it('permite consumir exactamente todo el saldo inmaduro', () => {
    const lots = [
      { id: 2, createdAt: daysAgo(0), amount: 20, allocated: 0 },
      { id: 1, createdAt: daysAgo(80), amount: 100, allocated: 0 },
    ];

    const result = planLifoDeduction(lots, [], 120, { now: NOW });
    expect(result.immatureRemainingAfter).toBe(0);
    expect(result.allocations.reduce((acc, a) => acc + a.amount, 0)).toBe(120);
  });

  it('valida montos: cero, negativos y no enteros son rechazados', () => {
    const lots = [{ id: 1, createdAt: daysAgo(0), amount: 100, allocated: 0 }];
    const invalidAmounts = [0, -5, 2.5];
    for (const invalid of invalidAmounts) {
      try {
        planLifoDeduction(lots, [], invalid, { now: NOW });
        throw new Error('Expected INVALID_AMOUNT to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(LifoError);
        expect(e.code).toBe(LIFO_ERRORS.INVALID_AMOUNT);
      }
    }
  });

  it('un lot en exactamente 90 días se considera maduro y no es consumible', () => {
    expect(isMature(daysAgo(90), NOW)).toBe(true);
    expect(daysToMaturity(daysAgo(80), NOW)).toBe(10);
    expect(daysToMaturity(daysAgo(200), NOW)).toBe(0);

    const lots = [{ id: 1, createdAt: daysAgo(90), amount: 100, allocated: 0 }];
    try {
      planLifoDeduction(lots, [], 1, { now: NOW });
      throw new Error('Expected INSUFFICIENT_IMMATURE_POINTS to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(LifoError);
      expect(e.code).toBe(LIFO_ERRORS.INSUFFICIENT_IMMATURE_POINTS);
    }
  });

  it('la fecha de maduración es created_at + 90 días', () => {
    expect(maturityDate(daysAgo(80), 90).toISOString()).toBe(daysAgo(-10));
  });
});

describe('wallet_lifo_deduct — contabilidad de gastos legacy sin allocations', () => {
  it('un gasto legacy no trazado se reparte newest-first y reduce el disponible inmaduro', () => {
    const lots = [
      { id: 1, createdAt: daysAgo(80), amount: 100, allocated: 0 },
      { id: 2, createdAt: daysAgo(0), amount: 20, allocated: 0 },
    ];
    // Asiento negativo histórico (p. ej. spend_ic) de 15 puntos, sin fila de allocations.
    const legacySpend = [{ id: 50, amount: -15, tracked: false }];

    const state = summarizeWallet(lots, legacySpend, NOW);
    // LIFO: los 15 salen del lot nuevo (20) → quedan 5 + 100 = 105 inmaduros.
    expect(state.immaturePoints).toBe(105);

    const result = planLifoDeduction(lots, legacySpend, 10, { now: NOW });
    // El reparto deja 5 en el lot nuevo; los 5 restantes salen del lot de 80 días.
    expect(result.allocations).toEqual([
      { lotId: 2, amount: 5, createdAt: daysAgo(0) },
      { lotId: 1, amount: 5, createdAt: daysAgo(80) },
    ]);
  });

  it('un gasto LIFO trazado no se descuenta dos veces (no infla el reparto legacy)', () => {
    const lots = [
      { id: 1, createdAt: daysAgo(80), amount: 100, allocated: 0 },
      { id: 2, createdAt: daysAgo(0), amount: 20, allocated: 10 }, // ya consumido por wallet_lifo_deduct
    ];
    const trackedSpend = [{ id: 99, amount: -10, tracked: true }];

    const state = summarizeWallet(lots, trackedSpend, NOW);
    expect(state.immaturePoints).toBe(110); // 100 + (20 - 10)
  });

  it('el gasto legacy puede agotar lots inmaduros y desbordarse sobre maduros (consistente con financial_context_view)', () => {
    const lots = [
      { id: 1, createdAt: daysAgo(120), amount: 100, allocated: 0 }, // maduro
      { id: 2, createdAt: daysAgo(10), amount: 50, allocated: 0 },   // inmaduro
    ];
    const legacySpend = [{ id: 50, amount: -80, tracked: false }];

    const state = summarizeWallet(lots, legacySpend, NOW);
    // 80 = 50 (inmaduro) + 30 (maduro, newest-first) → queda 70 maduros.
    expect(state.immaturePoints).toBe(0);
    expect(state.maturePoints).toBe(70);
    expect(state.totalPoints).toBe(70);
  });
});

describe('wallet_lifo_deduct — orden determinista entre lots simultáneos', () => {
  it('con created_at idéntico, el lot con mayor id (más reciente) se consume primero', () => {
    const sameDay = daysAgo(2);
    const lots = [
      { id: 7, createdAt: sameDay, amount: 10, allocated: 0 },
      { id: 9, createdAt: sameDay, amount: 10, allocated: 0 },
    ];

    const { allocations } = planLifoDeduction(lots, [], 6, { now: NOW });
    expect(allocations).toEqual([{ lotId: 9, amount: 6, createdAt: sameDay }]);
  });
});

describe('distributeLots — clamp de reparto heredado', () => {
  it('un gasto legacy mayor que la suma de lots deja todo en cero', () => {
    const lots = [{ id: 1, createdAt: daysAgo(10), amount: 30, allocated: 0 }];
    const distributed = distributeLots(lots, 50);
    expect(distributed[0].remaining).toBe(0);
    expect(distributed[0].unallocatedBurn).toBe(30);
  });
});
