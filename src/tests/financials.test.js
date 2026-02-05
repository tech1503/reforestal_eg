import { describe, it, expect } from 'vitest';

// Simulating logic usually found in DB functions or UI components
const calculateTier = (amount) => {
  if (amount < 5) return null;
  if (amount < 50) return 'Explorer';
  if (amount < 250) return 'Designer';
  if (amount < 500) return 'Architect';
  return 'Ambassador';
};

const calculateCredits = (amount, tier) => {
  // 1 EUR = 10 Credits (base) + Bonuses
  const base = amount * 10;
  let multiplier = 1;
  if (tier === 'Designer') multiplier = 1.1;
  if (tier === 'Architect') multiplier = 1.25;
  if (tier === 'Ambassador') multiplier = 1.5;
  return Math.floor(base * multiplier);
};

describe('Financial Calculations', () => {
  
  describe('Tier Logic', () => {
    it('should return null for amounts < 5', () => {
      expect(calculateTier(4.99)).toBe(null);
    });
    
    it('should return Explorer for 5-49', () => {
      expect(calculateTier(5)).toBe('Explorer');
      expect(calculateTier(49)).toBe('Explorer');
    });

    it('should return Designer for 50-249', () => {
      expect(calculateTier(50)).toBe('Designer');
      expect(calculateTier(249)).toBe('Designer');
    });

    it('should return Ambassador for 500+', () => {
      expect(calculateTier(500)).toBe('Ambassador');
      expect(calculateTier(5000)).toBe('Ambassador');
    });
  });

  describe('Impact Credit Calculation', () => {
    it('should calculate base credits correctly', () => {
      expect(calculateCredits(10, 'Explorer')).toBe(100);
    });

    it('should apply Designer multiplier (1.1x)', () => {
      // 100 * 10 * 1.1 = 1100
      expect(calculateCredits(100, 'Designer')).toBe(1100);
    });

    it('should apply Ambassador multiplier (1.5x)', () => {
      // 1000 * 10 * 1.5 = 15000
      expect(calculateCredits(1000, 'Ambassador')).toBe(15000);
    });
  });
});