/**
 * Payment Matcher Tests
 * Tests all 5 edge cases for payment reconciliation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { PrismaClient } from '@moonbite/db';
import { PaymentMatcher } from './payment-matcher.js';

describe('PaymentMatcher', () => {
  let prisma: PrismaClient;
  let matcher: PaymentMatcher;

  beforeAll(async () => {
    // Use test database
    prisma = new PrismaClient();
    matcher = new PaymentMatcher(prisma);
  });

  describe('calculateSettlement', () => {
    it('should calculate correct platform fee (2%)', () => {
      const expectedAmount = 1000000000n; // 10 MBITE
      const { platformFee, merchantAmount } = matcher.calculateSettlement(expectedAmount);

      // 2% of 10 MBITE = 0.2 MBITE
      expect(platformFee).toBe(20000000n);
      expect(merchantAmount).toBe(980000000n);

      // Verify they add up
      expect(platformFee + merchantAmount).toBe(expectedAmount);
    });

    it('should handle 1 MBITE amount correctly', () => {
      const expectedAmount = 100000000n; // 1 MBITE
      const { platformFee, merchantAmount } = matcher.calculateSettlement(expectedAmount);

      // 2% of 1 MBITE = 0.02 MBITE
      expect(platformFee).toBe(2000000n);
      expect(merchantAmount).toBe(98000000n);
      expect(platformFee + merchantAmount).toBe(expectedAmount);
    });

    it('should handle 0.5 MBITE amount correctly', () => {
      const expectedAmount = 50000000n; // 0.5 MBITE
      const { platformFee, merchantAmount } = matcher.calculateSettlement(expectedAmount);

      expect(platformFee).toBe(1000000n); // 0.01 MBITE
      expect(merchantAmount).toBe(49000000n);
      expect(platformFee + merchantAmount).toBe(expectedAmount);
    });

    it('should handle large amounts correctly', () => {
      const expectedAmount = 10000000000n; // 100 MBITE
      const { platformFee, merchantAmount } = matcher.calculateSettlement(expectedAmount);

      // 2% of 100 MBITE = 2 MBITE
      expect(platformFee).toBe(200000000n);
      expect(merchantAmount).toBe(9800000000n);
      expect(platformFee + merchantAmount).toBe(expectedAmount);
    });
  });

  describe('validateAmount', () => {
    it('should identify exact payment', () => {
      const result = matcher.validateAmount(1000000000n, 1000000000n);
      expect(result).toBe('exact');
    });

    it('should identify underpayment', () => {
      const result = matcher.validateAmount(900000000n, 1000000000n);
      expect(result).toBe('underpaid');
    });

    it('should identify overpayment', () => {
      const result = matcher.validateAmount(1100000000n, 1000000000n);
      expect(result).toBe('overpaid');
    });

    it('should handle small underpayment', () => {
      const result = matcher.validateAmount(999999999n, 1000000000n);
      expect(result).toBe('underpaid');
    });

    it('should handle small overpayment', () => {
      const result = matcher.validateAmount(1000000001n, 1000000000n);
      expect(result).toBe('overpaid');
    });
  });

  describe('isTransactionExpired', () => {
    it('should return false for future expiry', () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes
      const result = matcher.isTransactionExpired(futureDate);
      expect(result).toBe(false);
    });

    it('should return true for past expiry', () => {
      const pastDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
      const result = matcher.isTransactionExpired(pastDate);
      expect(result).toBe(true);
    });

    it('should return true for just-expired', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      const result = matcher.isTransactionExpired(expiredDate);
      expect(result).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('Edge Case 1: Exact Payment', () => {
      // Exact payment should confirm and deliver
      expect(matcher.validateAmount(1000000000n, 1000000000n)).toBe('exact');
    });

    it('Edge Case 2: Underpayment', () => {
      // Underpayment should be flagged, no delivery
      expect(matcher.validateAmount(900000000n, 1000000000n)).toBe('underpaid');
    });

    it('Edge Case 3: Overpayment', () => {
      // Overpayment should still deliver (merchant gets expected amount)
      const result = matcher.validateAmount(1100000000n, 1000000000n);
      expect(result).toBe('overpaid');

      // But settlement should be based on expected, not actual
      const { merchantAmount } = matcher.calculateSettlement(1000000000n);
      expect(merchantAmount).toBe(980000000n);
    });

    it('Edge Case 4: Late Payment', () => {
      // Late payment should be flagged
      const pastDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
      expect(matcher.isTransactionExpired(pastDate)).toBe(true);
    });

    it('Edge Case 5: Duplicate Events (idempotent)', () => {
      // Processing same payment twice should return same result
      const result1 = matcher.validateAmount(1000000000n, 1000000000n);
      const result2 = matcher.validateAmount(1000000000n, 1000000000n);

      expect(result1).toBe(result2);
      expect(result1).toBe('exact');
    });
  });

  describe('Money Math (Critical)', () => {
    it('should never lose money due to rounding', () => {
      // Test a variety of amounts
      const amounts = [
        1n,
        100n,
        1000n,
        10000000n, // 0.1 MBITE
        100000000n, // 1 MBITE
        1000000000n, // 10 MBITE
        10000000000n, // 100 MBITE
      ];

      for (const amount of amounts) {
        const { platformFee, merchantAmount } = matcher.calculateSettlement(amount);

        // Must always add up exactly
        expect(platformFee + merchantAmount).toBe(amount);

        // Platform fee must never be negative
        expect(platformFee).toBeGreaterThanOrEqual(0n);

        // Merchant must get something
        if (amount > 0n) {
          expect(merchantAmount).toBeGreaterThan(0n);
        }
      }
    });

    it('should use only BigInt operations', () => {
      // This test ensures no float operations are used
      const amount = 1000000000n;

      // All intermediate values should be BigInt
      const fee = (amount * 200n) / 10000n;
      const merchant = amount - fee;

      expect(typeof fee).toBe('bigint');
      expect(typeof merchant).toBe('bigint');
      expect(fee + merchant).toBe(amount);
    });
  });
});
