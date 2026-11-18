import { describe, it, expect } from 'vitest';
import {
  computeLuminosity,
  ENTROPY_FLOOR,
  ENTROPY_DECAY_PER_MONTH,
  ENTROPY_MONTH_DAYS,
} from '@/utils/myzelEntropy';

const NOW = new Date('2026-11-18T12:00:00.000Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);

describe('computeLuminosity — entropía suave (§3.9)', () => {
  it('actividad reciente (< 30 días) mantiene la luminosidad al 100%', () => {
    expect(computeLuminosity(daysAgo(0), NOW)).toBe(1);
    expect(computeLuminosity(daysAgo(29), NOW)).toBe(1);
  });

  it('a partir de 30 días de inactividad, decae un 10% por mes', () => {
    expect(computeLuminosity(daysAgo(30), NOW)).toBeCloseTo(0.9, 5);
    expect(computeLuminosity(daysAgo(60), NOW)).toBeCloseTo(0.8, 5);
    expect(computeLuminosity(daysAgo(90), NOW)).toBeCloseTo(0.7, 5);
  });

  it('el suelo de entropía garantiza un mínimo del 20%', () => {
    expect(computeLuminosity(daysAgo(800), NOW)).toBe(ENTROPY_FLOOR);
    expect(computeLuminosity(daysAgo(30 * 20), NOW)).toBe(ENTROPY_FLOOR);
  });

  it('sin actividad registrada se aplica el suelo del 20%', () => {
    expect(computeLuminosity(null, NOW)).toBe(ENTROPY_FLOOR);
    expect(computeLuminosity(undefined, NOW)).toBe(ENTROPY_FLOOR);
    expect(computeLuminosity('fecha-no-valida', NOW)).toBe(ENTROPY_FLOOR);
  });

  it('constantes normativas correctas', () => {
    expect(ENTROPY_MONTH_DAYS).toBe(30);
    expect(ENTROPY_DECAY_PER_MONTH).toBe(0.1);
    expect(ENTROPY_FLOOR).toBe(0.2);
  });
});
