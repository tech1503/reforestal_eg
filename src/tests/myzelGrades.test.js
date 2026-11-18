import { describe, it, expect } from 'vitest';
import {
  resolveMyzelGrades,
  normalizeSubscriptionTier,
  subscriptionGrade,
  highestUnlockedGrade,
  GRADE_REQUIRED_PLAN,
  SUBSCRIPTION_GRADE_MAP,
} from '@/utils/myzelGrades';

describe('normalizeSubscriptionTier', () => {
  it('normaliza etiquetas de plan en todos los idiomas soportados', () => {
    expect(normalizeSubscriptionTier('Explorador/a')).toBe('explorador');
    expect(normalizeSubscriptionTier('Guardián/a')).toBe('guardian');
    expect(normalizeSubscriptionTier('Guardian/a')).toBe('guardian');
    expect(normalizeSubscriptionTier('Campeón/a')).toBe('campeon');
    expect(normalizeSubscriptionTier('Paladín/a')).toBe('paladin');
    expect(normalizeSubscriptionTier('paladin')).toBe('paladin');
  });

  it('entradas desconocidas o vacías devuelven null / mapa 0', () => {
    expect(normalizeSubscriptionTier('')).toBeNull();
    expect(normalizeSubscriptionTier(null)).toBeNull();
    expect(normalizeSubscriptionTier('enterprise')).toBeNull();
    expect(subscriptionGrade('enterprise')).toBe(0);
  });
});

describe('resolveMyzelGrades — normativa Modul II / §6.3', () => {
  it('el Grado 1 está siempre abierto, incluso sin suscripción', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: null });
    expect(grades[0]).toMatchObject({ grade: 1, unlocked: true, via: 'open' });
    expect(grades[1].unlocked).toBe(false);
    expect(grades[2].unlocked).toBe(false);
    expect(grades[3].unlocked).toBe(false);
    expect(highestUnlockedGrade(grades)).toBe(1);
  });

  it('Guardián/a abre hasta el Grado 2', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: 'Guardián/a' });
    expect(grades.map((g) => g.unlocked)).toEqual([true, true, false, false]);
    expect(grades[1].via).toBe('subscription');
  });

  it('Campeón/a abre hasta el Grado 3', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: 'campeon' });
    expect(grades.map((g) => g.unlocked)).toEqual([true, true, true, false]);
  });

  it('Paladín/a abre los 4 Grados', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: 'Paladín/a' });
    expect(grades.map((g) => g.unlocked)).toEqual([true, true, true, true]);
    expect(highestUnlockedGrade(grades)).toBe(4);
  });

  it('los puntos de Freischaltung abren grados sin suscripción (via points)', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: null, pointsUnlockedGrades: [3] });
    expect(grades.map((g) => g.unlocked)).toEqual([true, false, true, false]);
    expect(grades[2].via).toBe('points');
  });

  it('ignora grados de puntos fuera de rango o no enteros', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: null, pointsUnlockedGrades: [0, 1, 5, 2.5, 'x'] });
    expect(grades.map((g) => g.unlocked)).toEqual([true, false, false, false]);
  });

  it('la suscripción tiene prioridad declarada sobre puntos para el via', () => {
    const grades = resolveMyzelGrades({ subscriptionTier: 'guardian', pointsUnlockedGrades: [2] });
    expect(grades[1].via).toBe('subscription');
  });

  it('el mapa de suscripción coincide con /dashboard/subscription', () => {
    expect(SUBSCRIPTION_GRADE_MAP).toEqual({ explorador: 1, guardian: 2, campeon: 3, paladin: 4 });
    expect(GRADE_REQUIRED_PLAN).toEqual({ 2: 'guardian', 3: 'campeon', 4: 'paladin' });
  });
});
