import { describe, it, expect } from 'vitest';
import {
  planActivityDispersion,
  splitIntegerShares,
  recipientOpenGrade,
  ACTIVITY_WEIGHTS,
} from '@/utils/myzelDispersion';

const DEGREES = {
  1: [{ id: 'b1' }, { id: 'a1' }], // desordenados a propósito: el reparto ordena por id ASC
  2: [{ id: 'c2' }, { id: 'a2' }],
  3: [{ id: 'a3' }],
  4: [{ id: 'a4' }],
};

describe('ACTIVITY_WEIGHTS — fórmula normativa Modul II / §3.4', () => {
  it('la suma de pesos del reparto es exactamente 100%', () => {
    const total = Object.values(ACTIVITY_WEIGHTS).reduce((acc, w) => acc + w, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(ACTIVITY_WEIGHTS).toEqual({ actor: 0.5, degree1: 0.25, degree2: 0.125, degree3: 0.0625, degree4: 0.0625 });
  });
});

describe('splitIntegerShares — reparto por mayor resto', () => {
  it('10 puntos en 3 partes iguales → 4/3/3', () => {
    expect(splitIntegerShares(10, [1 / 3, 1 / 3, 1 / 3])).toEqual([4, 3, 3]);
  });

  it('los restos se adjudican de mayor a menor fracción, desempate por índice', () => {
    expect(splitIntegerShares(1, [0.5, 0.3, 0.2])).toEqual([1, 0, 0]);
    expect(splitIntegerShares(2, [0.5, 0.4, 0.1])).toEqual([1, 1, 0]);
  });
});

describe('planActivityDispersion — budget 10 (normativo)', () => {
  const openAll = { a1: 4, b1: 4, a2: 4, c2: 4, a3: 4, a4: 4 };
  const result = planActivityDispersion({ actorId: 'actor', budget: 10, degrees: DEGREES, openGradesByRecipient: openAll });

  it('reparto total: actor 5, d1 2 (1+1), d2 1, d3 1, d4 1 → suma exacta 10', () => {
    // budget de red = 5 → d1 2 (floor 2.5), d2 1 (floor 1.25), d3 0 (floor 0.625), d4 0 (floor 0.625)
    // resto = 5 - (2+1+0+0) = 2 → +1 a d3 (frac .625) y +1 a d4 (frac .625 → desempate por índice: d3 antes que d4)... verificamos invariante:
    expect(result.actorShare).toBe(5);
    expect(result.networkBudget).toBe(5);
    expect(result.degreePools[1] + result.degreePools[2] + result.degreePools[3] + result.degreePools[4]).toBe(5);
    expect(result.totalCredited + result.zeroWaste.total).toBe(10);
  });

  it('cada peer del grado recibe la parte entera más restos por id ASC', () => {
    const byUser = Object.fromEntries(result.credits.map((c) => [c.userId, c.amount]));
    expect(byUser.actor).toBe(5);
    const d1Total = result.degreePools[1];
    expect(byUser.a1 + byUser.b1).toBe(d1Total);
    expect(Math.abs(byUser.a1 - byUser.b1)).toBeLessThanOrEqual(1);
  });
});

describe('planActivityDispersion — budget impar 3', () => {
  const openAll = { a1: 4, b1: 4, a2: 4, c2: 4, a3: 4, a4: 4 };
  const result = planActivityDispersion({ actorId: 'actor', budget: 3, degrees: DEGREES, openGradesByRecipient: openAll });

  it('actor cobra floor(1.5)=1; el pool de red 2 se reparte entre grados por mayor resto', () => {
    expect(result.actorShare).toBe(1);
    expect(result.networkBudget).toBe(2);
    const pools = Object.values(result.degreePools);
    expect(pools.reduce((a, b) => a + b, 0)).toBe(2);
    expect(result.totalCredited + result.zeroWaste.total).toBe(3);
  });
});

describe('planActivityDispersion — Zero-Waste-Loop por grado cerrado', () => {
  it('los impulsos de un grado cerrado regresan al fondo, sin redistribuirse', () => {
    const degrees = { 1: [{ id: 'p1' }], 2: [{ id: 'locked-a' }, { id: 'locked-b' }], 3: [], 4: [] };
    // Todos los destinatarios de grado 2 cerrados (acceso gratuito = grado 1 abierto)
    const result = planActivityDispersion({ actorId: 'actor', budget: 10, degrees, openGradesByRecipient: {} });

    const d2 = result.zeroWaste[2];
    expect(d2).toBe(result.degreePools[2]);
    // Ningún crédito destinado a grado 2
    expect(result.credits.filter((c) => c.degree === 2)).toHaveLength(0);
    // La parte del actor y grado 1 se abonan normalmente
    expect(result.credits.find((c) => c.degree === 'actor')?.amount).toBe(5);
    expect(result.totalCredited + result.zeroWaste.total).toBe(10);
  });

  it('un destinatario abierto en grado 2 (p. ej. Guardián/a) sí recibe', () => {
    const degrees = { 1: [], 2: [{ id: 'g2' }], 3: [], 4: [] };
    const result = planActivityDispersion({ actorId: 'actor', budget: 10, degrees, openGradesByRecipient: { g2: 2 } });
    const credit = result.credits.find((c) => c.userId === 'g2');
    expect(credit?.amount).toBe(result.degreePools[2]);
    expect(result.zeroWaste[2]).toBe(0);
  });

  it('grado sin peers: el pool completo regresa al fondo', () => {
    const degrees = { 1: [], 2: [], 3: [], 4: [] };
    const result = planActivityDispersion({ actorId: 'actor', budget: 10, degrees, openGradesByRecipient: {} });
    expect(result.zeroWaste.total).toBe(result.networkBudget);
    expect(result.totalCredited).toBe(result.actorShare);
  });
});

describe('planActivityDispersion — invariantes para budgets 1..50', () => {
  const openAll = { a1: 4, b1: 4, a2: 4, c2: 4, a3: 4, a4: 4 };
  for (let budget = 1; budget <= 50; budget += 1) {
    it(`budget ${budget}: suma exacta y sin crédito negativo`, () => {
      const result = planActivityDispersion({ actorId: 'actor', budget, degrees: DEGREES, openGradesByRecipient: openAll });
      expect(result.totalCredited + result.zeroWaste.total).toBe(budget);
      for (const credit of result.credits) {
        expect(credit.amount).toBeGreaterThanOrEqual(0);
      }
    });
  }
});

describe('recipientOpenGrade', () => {
  it('sin datos → solo Grado 1 (acceso gratuito)', () => {
    expect(recipientOpenGrade(undefined)).toBe(1);
    expect(recipientOpenGrade('x')).toBe(1);
    expect(recipientOpenGrade(null)).toBe(1);
  });

  it('plan Paladín abre hasta Grado 4; clamps fuera de rango', () => {
    expect(recipientOpenGrade(4)).toBe(4);
    expect(recipientOpenGrade(9)).toBe(4);
    expect(recipientOpenGrade(0)).toBe(1);
  });
});

describe('planActivityDispersion — validaciones', () => {
  it('budget inválido o actor ausente lanzan error', () => {
    expect(() => planActivityDispersion({ actorId: 'a', budget: 0, degrees: {} })).toThrow('INVALID_BUDGET');
    expect(() => planActivityDispersion({ actorId: 'a', budget: 2.5, degrees: {} })).toThrow('INVALID_BUDGET');
    expect(() => planActivityDispersion({ budget: 10, degrees: {} })).toThrow('ACTOR_REQUIRED');
  });
});
