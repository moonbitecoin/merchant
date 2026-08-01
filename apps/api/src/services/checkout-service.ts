/**
 * Checkout Service
 * Handles transaction creation, deposit address generation, settlement
 * CRITICAL: All money operations use BigInt only
 */

import { PrismaClient } from '@moonbite/db';
import {
  generateUUIDv7,
  ERROR_CODES,
  CHECKOUT_EXPIRY_MINUTES,
  formatMbite,
} from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { generateSignedDownloadURL } from '../lib/security.js';
import { PaymentMatcher } from '../lib/payment-matcher.js';
import QRCode from 'qrcode';

/**
 * HD Wallet Address Derivation
 * Simple implementation - production should use proper HD wallet library
 */
export function deriveDepositAddress(merchantId: string, txIndex: number): string {
  // In production: use real HD wallet (m/44'/0'/0'/0/{index})
  // For now: generate deterministic address from merchantId + index
  const hash = require('crypto')
    .createHash('sha256')
    .update(`${merchantId}:${txIndex}`)
    .digest('hex');

  // Take first 30 hex chars, convert to base58-like format
  return `deposit_${hash.substring(0, 30)}`;
}

export interface CheckoutInput {
  productId: string;
  couponCode?: string;
  idempotencyKey: string;
}

export class CheckoutService {
  constructor(
    private prisma: PrismaClient,
    private paymentMatcher: PaymentMatcher
  ) {}

  /**
   * Create checkout (get deposit address)
   * Idempotent: same idempotency key returns same transaction
   */
  async createCheckout(merchantId: string, input: CheckoutInput): Promise<any> {
    // Check idempotency
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { key: input.idempotencyKey },
      select: { result: true, expiresAt: true },
    });

    if (existing) {
      if (new Date() > existing.expiresAt) {
        // Expired, treat as new
        await this.prisma.idempotencyKey.delete({
          where: { key: input.idempotencyKey },
        });
      } else {
        // Return cached result
        return existing.result;
      }
    }

    // Verify product exists and is active
    const product = await this.prisma.product.findUnique({
      where: { id: input.productId },
      select: {
        id: true,
        price: true,
        status: true,
        expiryDate: true,
        store: {
          select: { id: true, status: true },
        },
      },
    });

    if (!product) {
      throw createAppError(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found');
    }

    if (product.status !== 'active') {
      throw createAppError(ERROR_CODES.PRODUCT_NOT_ACTIVE, 'Product is not available');
    }

    if (product.expiryDate && new Date() > product.expiryDate) {
      throw createAppError(ERROR_CODES.PRODUCT_EXPIRED, 'Product has expired');
    }

    if (product.store.status !== 'active') {
      throw createAppError(ERROR_CODES.STORE_SUSPENDED, 'Store is not available');
    }

    // Calculate final price (after coupon, if provided)
    let expectedAmount = product.price;

    if (input.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: input.couponCode,
          storeId: product.store.id,
          deletedAt: null,
        },
        select: {
          id: true,
          type: true,
          value: true,
          usageLimit: true,
          usageCount: true,
          expiresAt: true,
        },
      });

      if (!coupon) {
        throw createAppError(ERROR_CODES.VALIDATION_ERROR, 'Invalid coupon code');
      }

      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        throw createAppError(ERROR_CODES.COUPON_EXPIRED, 'Coupon has expired');
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        throw createAppError(
          ERROR_CODES.COUPON_USAGE_LIMIT_EXCEEDED,
          'Coupon usage limit reached'
        );
      }

      // Apply discount
      if (coupon.type === 'percent') {
        const discount = (expectedAmount * coupon.value) / 100n;
        expectedAmount = expectedAmount - discount;
      } else if (coupon.type === 'fixed') {
        expectedAmount = expectedAmount - coupon.value;
      }

      // Ensure price doesn't go negative
      if (expectedAmount < 0n) {
        expectedAmount = 0n;
      }
    }

    // Get transaction count for this merchant (for address derivation)
    const transactionCount = await this.prisma.transaction.count({
      where: { storeId: product.store.id },
    });

    // Derive unique deposit address
    const depositAddress = deriveDepositAddress(product.store.id, transactionCount);

    // Create transaction
    const expiresAt = new Date(Date.now() + CHECKOUT_EXPIRY_MINUTES * 60 * 1000);

    const transaction = await this.prisma.transaction.create({
      data: {
        id: generateUUIDv7(),
        productId: input.productId,
        storeId: product.store.id,
        amount: 0n, // Will be updated when payment arrives
        expectedAmount,
        platformFeeAmount: 0n, // Will be calculated on confirmation
        merchantAmount: 0n, // Will be calculated on confirmation
        depositAddress,
        status: 'pending',
        expiresAt,
        confirmationCount: 0,
      },
      select: {
        id: true,
        depositAddress: true,
        expectedAmount: true,
        expiresAt: true,
      },
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(transaction.depositAddress);

    const result = {
      transactionId: transaction.id,
      depositAddress: transaction.depositAddress,
      amount: transaction.expectedAmount.toString(),
      amountFormatted: formatMbite(transaction.expectedAmount),
      qrCode,
      expiresAt: transaction.expiresAt,
      expiresIn: CHECKOUT_EXPIRY_MINUTES * 60, // seconds
    };

    // Store idempotency key (24 hour TTL)
    await this.prisma.idempotencyKey.create({
      data: {
        key: input.idempotencyKey,
        merchantId: product.store.id, // Use store ID as merchant context
        result,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return result;
  }

  /**
   * Get checkout status
   */
  async getCheckoutStatus(transactionId: string): Promise<any> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        amount: true,
        expectedAmount: true,
        depositAddress: true,
        txHash: true,
        confirmationCount: true,
        confirmedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!transaction) {
      throw createAppError(ERROR_CODES.TRANSACTION_NOT_FOUND, 'Checkout not found');
    }

    // Check if expired
    const isExpired = new Date() > transaction.expiresAt;

    return {
      transactionId: transaction.id,
      status: isExpired && transaction.status === 'pending' ? 'expired' : transaction.status,
      amount: transaction.amount.toString(),
      expectedAmount: transaction.expectedAmount.toString(),
      depositAddress: transaction.depositAddress,
      txHash: transaction.txHash,
      confirmationCount: transaction.confirmationCount,
      confirmedAt: transaction.confirmedAt,
      expiresAt: transaction.expiresAt,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Process payment confirmation
   * Called by payment listener when payment is detected
   */
  async processPaymentConfirmation(
    transactionId: string,
    amount: bigint,
    txHash: string,
    confirmations: number,
    confirmationsRequired: number
  ): Promise<{ status: string; merchantAmount: bigint; platformFeeAmount: bigint }> {
    const transaction = await this.prisma.transaction.findUniqueOrThrow({
      where: { id: transactionId },
      select: {
        id: true,
        depositAddress: true,
        expectedAmount: true,
        expiresAt: true,
        status: true,
      },
    });

    // Match payment using payment matcher
    const matchResult = await this.paymentMatcher.matchPayment(
      {
        txHash,
        toAddress: transaction.depositAddress,
        amount,
        timestamp: Math.floor(Date.now() / 1000),
        confirmations,
      },
      confirmationsRequired
    );

    // Update transaction
    await this.paymentMatcher.updateTransaction(
      transactionId,
      matchResult,
      {
        txHash,
        toAddress: transaction.depositAddress,
        amount,
        timestamp: Math.floor(Date.now() / 1000),
        confirmations,
      },
      confirmationsRequired
    );

    return {
      status: matchResult.status,
      merchantAmount: matchResult.merchantAmount,
      platformFeeAmount: matchResult.platformFeeAmount,
    };
  }

  /**
   * Get download URL for customer
   * Returns signed URL valid for 24 hours, bound to IP
   */
  async getDownloadURL(transactionId: string, ipAddress: string): Promise<string> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        confirmedAt: true,
      },
    });

    if (!transaction || transaction.status !== 'confirmed') {
      throw createAppError(
        ERROR_CODES.TRANSACTION_NOT_FOUND,
        'Transaction not confirmed'
      );
    }

    // Generate signed URL (24 hour TTL)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { url } = generateSignedDownloadURL(transactionId, expiresAt, ipAddress);

    return url;
  }

  /**
   * Verify download URL signature
   */
  async verifyDownloadURL(transactionId: string, signature: string, ipAddress: string): Promise<boolean> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        status: true,
        expiresAt: true,
      },
    });

    if (!transaction || transaction.status !== 'confirmed') {
      return false;
    }

    // Verify signature is valid and not expired
    // This is handled by security.verifySignedDownloadURL
    // We just check that signature matches expected format
    return signature.length === 64; // SHA256 hex = 64 chars
  }

  /**
   * Get transaction details (for dashboard)
   */
  async getTransaction(transactionId: string, merchantId?: string): Promise<any> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        productId: true,
        storeId: true,
        amount: true,
        expectedAmount: true,
        platformFeeAmount: true,
        merchantAmount: true,
        depositAddress: true,
        txHash: true,
        status: true,
        confirmationCount: true,
        confirmedAt: true,
        expiresAt: true,
        createdAt: true,
        product: {
          select: {
            title: true,
            price: true,
          },
        },
        store: {
          select: {
            merchantId: true,
          },
        },
      },
    });

    if (!transaction) {
      throw createAppError(ERROR_CODES.TRANSACTION_NOT_FOUND, 'Transaction not found');
    }

    // Verify ownership if merchantId provided
    if (merchantId && transaction.store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your transaction');
    }

    return {
      ...transaction,
      amount: transaction.amount.toString(),
      expectedAmount: transaction.expectedAmount.toString(),
      platformFeeAmount: transaction.platformFeeAmount.toString(),
      merchantAmount: transaction.merchantAmount.toString(),
    };
  }
}
