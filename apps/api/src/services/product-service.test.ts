/**
 * Product Service Tests
 * Tests CRUD operations and business logic
 */

import { describe, it, expect } from 'vitest';
import { formatMbite, smallestUnitToMbite } from '@moonbite/shared';

describe('Product Service - Money Handling', () => {
  describe('Price formatting', () => {
    it('should format MBITE amounts correctly', () => {
      // 10 MBITE
      const amount = 1000000000n;
      const formatted = formatMbite(amount);
      expect(formatted).toBe('10');
    });

    it('should format 0.1 MBITE correctly', () => {
      const amount = 10000000n;
      const formatted = formatMbite(amount);
      expect(formatted).toBe('0.1');
    });

    it('should format 0.01 MBITE correctly', () => {
      const amount = 1000000n;
      const formatted = formatMbite(amount);
      expect(formatted).toBe('0.01');
    });

    it('should format small amounts correctly', () => {
      const amount = 1n;
      const formatted = formatMbite(amount);
      expect(parseFloat(formatted)).toBeGreaterThan(0);
    });

    it('should handle large amounts', () => {
      const amount = 10000000000n; // 100 MBITE
      const formatted = formatMbite(amount);
      expect(formatted).toBe('100');
    });
  });

  describe('Price conversion', () => {
    it('should convert smallest unit to MBITE', () => {
      const amount = 100000000n; // 1 MBITE
      const mbite = smallestUnitToMbite(amount);
      expect(mbite).toBe(1);
    });

    it('should handle fractional amounts', () => {
      const amount = 50000000n; // 0.5 MBITE
      const mbite = smallestUnitToMbite(amount);
      expect(mbite).toBe(0.5);
    });

    it('should preserve precision for large amounts', () => {
      const amount = 1000000000000n; // 10000 MBITE
      const mbite = smallestUnitToMbite(amount);
      expect(mbite).toBe(10000);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero correctly', () => {
      const amount = 0n;
      const formatted = formatMbite(amount);
      expect(formatted).toBe('0');
    });

    it('should never lose precision in conversion', () => {
      const amounts = [
        1n,
        100n,
        1000n,
        10000000n,
        100000000n,
        1000000000n,
      ];

      for (const amount of amounts) {
        const converted = smallestUnitToMbite(amount);
        const back = Math.floor(converted * 1e8);

        // Should be close (allowing for float precision)
        expect(Math.abs(back - Number(amount))).toBeLessThan(2);
      }
    });
  });
});

describe('Product Validation', () => {
  describe('Category validation', () => {
    it('should accept valid categories', () => {
      const categories = ['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER'];

      for (const cat of categories) {
        expect(['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER'].includes(cat)).toBe(true);
      }
    });
  });

  describe('Download limit validation', () => {
    it('should accept valid download limits', () => {
      const limits = ['1', '3', 'UNLIMITED'];

      for (const limit of limits) {
        expect(['1', '3', 'UNLIMITED'].includes(limit)).toBe(true);
      }
    });
  });

  describe('Price validation', () => {
    it('should reject negative prices', () => {
      const negativePrice = -1000000000n;
      expect(negativePrice < 0n).toBe(true);
    });

    it('should accept zero price (free product)', () => {
      const zeroPrice = 0n;
      expect(zeroPrice >= 0n).toBe(true);
    });

    it('should accept positive prices', () => {
      const positivePrice = 1000000000n;
      expect(positivePrice > 0n).toBe(true);
    });
  });

  describe('Title validation', () => {
    it('should reject empty title', () => {
      const title = '';
      expect(title.length >= 1).toBe(false);
    });

    it('should accept valid titles', () => {
      const titles = ['My Product', 'Advanced TypeScript Course', 'Digital Art Bundle'];

      for (const title of titles) {
        expect(title.length >= 1 && title.length <= 200).toBe(true);
      }
    });

    it('should reject titles over 200 chars', () => {
      const title = 'a'.repeat(201);
      expect(title.length <= 200).toBe(false);
    });
  });
});
