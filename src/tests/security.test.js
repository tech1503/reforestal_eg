import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sanitizeInput, checkRateLimit } from '../utils/securityUtils';

describe('Security Utilities', () => {
  // 1. Input Sanitization
  describe('sanitizeInput', () => {
    it('should escape HTML tags', () => {
      const malicious = '<script>alert("xss")</script>';
      const expected = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      expect(sanitizeInput(malicious)).toBe(expected);
    });

    it('should escape quotes', () => {
      const malicious = 'Robert"); DROP TABLE students;--';
      expect(sanitizeInput(malicious)).toContain('&quot;');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should handle non-string inputs gracefully', () => {
      expect(sanitizeInput(null)).toBe(null);
      expect(sanitizeInput(123)).toBe(123);
    });
  });

  // 2. Rate Limiting
  describe('checkRateLimit', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should allow requests within limit', () => {
      const key = 'test_action';
      expect(checkRateLimit(key, 3, 60000)).toBe(true);
      expect(checkRateLimit(key, 3, 60000)).toBe(true);
      expect(checkRateLimit(key, 3, 60000)).toBe(true);
    });

    it('should block requests over limit', () => {
      const key = 'test_block';
      checkRateLimit(key, 2, 60000);
      checkRateLimit(key, 2, 60000);
      // Third request should fail
      expect(checkRateLimit(key, 2, 60000)).toBe(false);
    });

    it('should reset after time window', () => {
      const key = 'test_reset';
      checkRateLimit(key, 1, 1000); // 1 allowed per second
      expect(checkRateLimit(key, 1, 1000)).toBe(false); // blocked
      
      // Advance time by 1.1 seconds
      vi.advanceTimersByTime(1100);
      
      expect(checkRateLimit(key, 1, 1000)).toBe(true); // allowed again
    });
  });
});