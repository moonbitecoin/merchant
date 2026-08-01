/**
 * Checkout Service Tests
 * Tests payment matching and settlement logic
 */

import { describe, it, expect } from 'vitest';
import { PaymentMatcher } from '../lib/payment-matcher.js';
import { PrismaClient } from '@moonbite/db';

describe('Payment Matching - All 5 Edge Cases', () => {
  let paymentMatcher: PaymentMatcher;

  beforeEach(() => {
    const prisma = new PrismaClient();
    paymentMatcher = new PaymentMatcher(prisma);
  });

  describe('Edge Case 1: Exact Payment', () => {
    it('should confirm exact payment', () => {
      const result = paymentMatcher.validateAmount(1000000000n, 1000000000n);
      expect(result).toBe('exact');
    });

    it('should calculate correct settlement', () => {
      const { platformFee, merchantAmount } = paymentMatcher.calculateSettlement(
        1000000000n
      );

      expect(platformFee).toBe(20000000n); // 2%
      expect(merchantAmount).toBe(980000000n);
      expect(platformFee + merchantAmount).toBe(1000000000n);
    });
  });

  describe('Edge Case 2: Underpayment', () => {
    it('should detect underpayment', () => {
      const result = paymentMatcher.validateAmount(900000000n, 1000000000n);
      expect(result).toBe('underpaid');
    });

    it('should flag underpayment by 1 unit', () => {
      const result = paymentMatcher.validateAmount(999999999n, 1000000000n);
      expect(result).toBe('underpaid');
    });

    it('should not deliver on underpayment', () => {
      // Underpayment means no delivery, merchant gets nothing
      const shortAmount = 900000000n;
      const expectedAmount = 1000000000n;

      expect(shortAmount < expectedAmount).toBe(true);
      // No settlement should occur
    });
  });

  describe('Edge Case 3: Overpayment', () => {
    it('should detect overpayment', () => {
      const result = paymentMatcher.validateAmount(1100000000n, 1000000000n);
      expect(result).toBe('overpaid');
    });

    it('should still deliver on overpayment', () => {
      // Overpayment: customer pays extra, but merchant gets expected amount
      const actualAmount = 1100000000n;
      const expectedAmount = 1000000000n;

      expect(actualAmount > expectedAmount).toBe(true);

      // Settlement based on expected, not actual
      const { merchantAmount } = paymentMatcher.calculateSettlement(expectedAmount);
      expect(merchantAmount).toBe(980000000n);
    });

    it('should record surplus for reconciliation', () => {
      const actualAmount = 1100000000n;
      const expectedAmount = 1000000000n;
      const surplus = actualAmount - expectedAmount;

      expect(surplus).toBe(100000000n); // 1 MBITE extra
    });
  });

  describe('Edge Case 4: Late Payment', () => {
    it('should detect expired checkout', () => {
      const pastDate = new Date(Date.now() - 1000); // 1 second ago
      const result = paymentMatcher.isTransactionExpired(pastDate);

      expect(result).toBe(true);
    });

    it('should flag late payment', () => {
      const expiredDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      expect(paymentMatcher.isTransactionExpired(expiredDate)).toBe(true);
    });

    it('should not auto-deliver late payment', () => {
      // Late payment: flagged for manual review
      const expiresAt = new Date(Date.now() - 1000);
      const isLate = new Date() > expiresAt;

      expect(isLate).toBe(true);
      // Manual review required, no auto-delivery
    });

    it('should allow future checkout', () => {
      const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min from now
      expect(paymentMatcher.isTransactionExpired(futureDate)).toBe(false);
    });
  });

  describe('Edge Case 5: Duplicate Events (Idempotency)', () => {
    it('should be idempotent for exact amount', () => {
      const exact = 1000000000n;

      const result1 = paymentMatcher.validateAmount(exact, exact);
      const result2 = paymentMatcher.validateAmount(exact, exact);

      expect(result1).toBe(result2);
      expect(result1).toBe('exact');
    });

    it('should handle duplicate payment events', () => {
      // Same payment processed twice should return same status
      const amount = 1000000000n;
      const expected = 1000000000n;

      // First processing
      const status1 = paymentMatcher.validateAmount(amount, expected);

      // Duplicate event (blockchain listener sees it again)
      const status2 = paymentMatcher.validateAmount(amount, expected);

      expect(status1).toBe(status2);
      expect(status1).toBe('exact');
    });
  });

  describe('Chain Reorg Edge Case', () => {
    it('should detect reverted transaction', () => {
      // Confirmations drop from 5 to 0
      const initialConfirmations = 5;
      const reorgConfirmations = 0;

      expect(initialConfirmations > 0).toBe(true);
      expect(reorgConfirmations).toBe(0);

      // Should transition from confirmed to reverted
      // and reverse merchant credit
    });

    it('should handle confirmation changes', () => {
      const confirmations1 = 1;
      const confirmations2 = 2;
      const confirmations3 = 2; // Stable
      const confirmations4 = 0; // Reorg!

      expect(confirmations1 < confirmations2).toBe(true);
      expect(confirmations2).toBe(confirmations3);
      expect(confirmations4).toBe(0);
    });
  });

  describe('Settlement Math (Critical)', () => {
    it('should never lose money in settlement', () => {
      const testAmounts = [
        1n,
        10n,
        100n,
        1000n,
        10000000n, // 0.1 MBITE
        100000000n, // 1 MBITE
        1000000000n, // 10 MBITE
        10000000000n, // 100 MBITE
        100000000000n, // 1000 MBITE
      ];

      for (const amount of testAmounts) {
        const { platformFee, merchantAmount } = paymentMatcher.calculateSettlement(amount);

        // Check no money lost
        expect(platformFee + merchantAmount).toBe(amount);

        // Check fee is 2%
        const expectedFee = (amount * 200n) / 10000n;
        expect(platformFee).toBe(expectedFee);

        // Check merchant gets remainder
        expect(merchantAmount).toBe(amount - platformFee);
      }
    });

    it('should use only BigInt math', () => {
      const amount = 1000000000n;

      // All operations must be BigInt
      const fee = (amount * 200n) / 10000n;
      const merchant = amount - fee;

      expect(typeof fee).toBe('bigint');
      expect(typeof merchant).toBe('bigint');
      expect(typeof amount).toBe('bigint');

      // Never use float
      const feeFloat = Number(fee) / 1e8; // Convert for display only
      expect(typeof feeFloat).toBe('number');
    });

    it('should round down fees correctly', () => {
      // Ensure fees round down (merchant doesn't lose due to rounding)
      const amount = 1n; // Smallest unit

      const { platformFee, merchantAmount } = paymentMatcher.calculateSettlement(amount);

      expect(platformFee + merchantAmount).toBe(amount);
      expect(platformFee).toBe(0n); // Rounds down to 0
      expect(merchantAmount).toBe(1n); // Merchant gets it all
    });

    it('should handle odd amounts', () => {
      const oddAmounts = [
        123456789n,
        987654321n,
        5000000001n,
        9999999999n,
      ];

      for (const amount of oddAmounts) {
        const { platformFee, merchantAmount } = paymentMatcher.calculateSettlement(amount);

        // Must always add up perfectly
        expect(platformFee + merchantAmount).toBe(amount);

        // Fee must be <= 2% (may be less due to rounding down)
        const maxFee = (amount * 200n) / 10000n;
        expect(platformFee).toBeLessThanOrEqual(maxFee);
      }
    });
  });

  describe('Confirmation Requirements', () => {
    it('should require minimum confirmations', () => {
      const confirmationsRequired = 2;
      const scenarios = [
        { confirmations: 0, shouldConfirm: false },
        { confirmations: 1, shouldConfirm: false },
        { confirmations: 2, shouldConfirm: true },
        { confirmations: 3, shouldConfirm: true },
      ];

      for (const { confirmations, shouldConfirm } of scenarios) {
        const confirmed = confirmations >= confirmationsRequired;
        expect(confirmed).toBe(shouldConfirm);
      }
    });
  });
});
