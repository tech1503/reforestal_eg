import { describe, it, expect } from 'vitest';
import { 
  validateEmail, 
  validatePhone, 
  validateAmount, 
  validateCountry, 
  validateContributionForm 
} from '../utils/validationUtils';

describe('Validation Utilities', () => {
  // 1. Email Validation
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('test@domain')).toBe(false); // Missing TLD often invalid in strict mode
      expect(validateEmail('test space@domain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(null)).toBe(false);
    });
  });

  // 2. Amount Validation
  describe('validateAmount', () => {
    it('should pass for valid amounts within range', () => {
      expect(validateAmount(50, 5, 10000).isValid).toBe(true);
      expect(validateAmount('50', 5, 10000).isValid).toBe(true);
    });

    it('should fail for amounts below minimum', () => {
      const result = validateAmount(4, 5, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Minimum');
    });

    it('should fail for amounts above maximum', () => {
      const result = validateAmount(10001, 5, 10000);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should fail for non-numeric inputs', () => {
      expect(validateAmount('abc', 5, 10000).isValid).toBe(false);
      expect(validateAmount(null, 5, 10000).isValid).toBe(false);
    });
  });

  // 3. Country/City Validation
  describe('Location Validation', () => {
    it('should validate non-empty country', () => {
      expect(validateCountry('Germany')).toBe(true);
      expect(validateCountry('')).toBe(false);
      expect(validateCountry('   ')).toBe(false);
    });
  });

  // 4. Form Validation
  describe('validateContributionForm', () => {
    it('should validate a complete form', () => {
      const validForm = {
        full_name: 'John Doe',
        email: 'john@example.com',
        amount: 100,
        contribution_date: '2023-01-01'
      };
      const result = validateContributionForm(validForm, 'manual');
      expect(result.isValid).toBe(true);
    });

    it('should fail if manual user email is missing', () => {
      const invalidForm = {
        full_name: 'John Doe',
        amount: 100
      };
      const result = validateContributionForm(invalidForm, 'manual');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('email');
    });

    it('should fail if user_id is missing in existing mode', () => {
      const invalidForm = {
        amount: 100
      };
      const result = validateContributionForm(invalidForm, 'existing');
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveProperty('user_id');
    });
  });
});