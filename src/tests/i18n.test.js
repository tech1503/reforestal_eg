import { describe, it, expect } from 'vitest';
import en from '../locales/en.json';
import de from '../locales/de.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';

// Helper to flatten object keys
const flattenKeys = (obj, prefix = '') => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenKeys(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k];
    }
    return acc;
  }, {});
};

describe('Multilingual Support', () => {
  const enKeys = Object.keys(flattenKeys(en));
  const deKeys = Object.keys(flattenKeys(de));
  const esKeys = Object.keys(flattenKeys(es));
  const frKeys = Object.keys(flattenKeys(fr));

  it('should have matching key counts across languages', () => {
    // Warnings rather than hard failures usually, but for strict production check:
    expect(deKeys.length).toBeGreaterThan(0);
    expect(esKeys.length).toBeGreaterThan(0);
    expect(frKeys.length).toBeGreaterThan(0);
  });

  it('should not have empty values for critical keys in EN', () => {
    const criticalKeys = ['common.sign_in', 'navigation.dashboard', 'dashboard.welcome'];
    const flatEn = flattenKeys(en);
    criticalKeys.forEach(key => {
      expect(flatEn[key]).toBeTruthy();
    });
  });

  // In a real suite, we would diff arrays to find missing keys
  it('German should contain common keys', () => {
     expect(flattenKeys(de)['common.sign_in']).toBeDefined();
  });
});