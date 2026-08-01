/**
 * Payout Service
 * Manages merchant payouts and withdrawal requests
 */

import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';

export class PayoutService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get merchant balance (total confirmed revenue)
   */
  async getMerchantBalance(merchantId: string): Promise<{
    totalRevenue: string; // BigInt as string
    totalPayoutsRequested: string; // BigInt as string
    totalPayoutsCompleted: string; // BigInt as string
    availableBalance: string; // BigInt as string
  }> {
    const [revenue, payouts] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          store: { merchantId },
          status: 'confirmed',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.payout.findMany({
        where: { merchantId },
        select: { amount: true, status: true },
      }),
    ]);

    const totalRevenue = revenue._sum.amount || 0n;

    let totalPayoutsRequested = 0n;
    let totalPayoutsCompleted = 0n;

    for (const payout of payouts) {
      if (payout.status === 'pending' || payout.status === 'processing') {
        totalPayoutsRequested += payout.amount;
      } else if (payout.status === 'completed') {
        totalPayoutsCompleted += payout.amount;
      }
    }

    const availableBalance = totalRevenue - totalPayoutsRequested;

    return {
      totalRevenue: totalRevenue.toString(),
      totalPayoutsRequested: totalPayoutsRequested.toString(),
      totalPayoutsCompleted: totalPayoutsCompleted.toString(),
      availableBalance: availableBalance.toString(),
    };
  }

  /**
   * Request a payout
   */
  async requestPayout(
    merchantId: string,
    amount: bigint,
    wallet: string,
    totpCode?: string
  ): Promise<{
    payoutId: string;
    status: string;
    amount: string;
  }> {
    // Validate amount
    if (amount <= 0n) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Payout amount must be greater than zero'
      );
    }

    // Validate wallet address format (basic)
    if (!wallet || wallet.trim().length < 5) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid wallet address'
      );
    }

    // Get merchant and check 2FA if enabled
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, totpEnabled: true },
    });

    if (!merchant) {
      throw createAppError(ERROR_CODES.MERCHANT_NOT_FOUND, 'Merchant not found');
    }

    if (merchant.totpEnabled && !totpCode) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        '2FA verification required'
      );
    }

    // Check available balance
    const balance = await this.getMerchantBalance(merchantId);
    const availableBalance = BigInt(balance.availableBalance);

    if (amount > availableBalance) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Insufficient balance. Available: ${balance.availableBalance} MBITE`
      );
    }

    // Create payout record
    const payout = await this.prisma.payout.create({
      data: {
        id: require('crypto').randomUUID(),
        merchantId,
        amount,
        wallet,
        status: 'pending',
        requestedAt: new Date(),
      },
    });

    return {
      payoutId: payout.id,
      status: payout.status,
      amount: payout.amount.toString(),
    };
  }

  /**
   * Get payout history
   */
  async getPayoutHistory(
    merchantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    payouts: {
      id: string;
      amount: string; // BigInt as string
      status: string;
      wallet: string;
      requestedAt: string; // ISO string
      completedAt?: string; // ISO string
    }[];
    total: number;
  }> {
    const [payouts, total] = await Promise.all([
      this.prisma.payout.findMany({
        where: { merchantId },
        select: {
          id: true,
          amount: true,
          status: true,
          wallet: true,
          requestedAt: true,
          completedAt: true,
        },
        orderBy: { requestedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.payout.count({ where: { merchantId } }),
    ]);

    return {
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: p.amount.toString(),
        status: p.status,
        wallet: p.wallet,
        requestedAt: p.requestedAt.toISOString(),
        completedAt: p.completedAt?.toISOString(),
      })),
      total,
    };
  }

  /**
   * Get payout details
   */
  async getPayoutDetails(
    payoutId: string,
    merchantId: string
  ): Promise<{
    id: string;
    amount: string;
    status: string;
    wallet: string;
    requestedAt: string;
    completedAt?: string;
    txHash?: string;
  }> {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      select: {
        id: true,
        amount: true,
        status: true,
        wallet: true,
        requestedAt: true,
        completedAt: true,
        txHash: true,
        merchantId: true,
      },
    });

    if (!payout || payout.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.PAYOUT_NOT_FOUND, 'Payout not found');
    }

    return {
      id: payout.id,
      amount: payout.amount.toString(),
      status: payout.status,
      wallet: payout.wallet,
      requestedAt: payout.requestedAt.toISOString(),
      completedAt: payout.completedAt?.toISOString(),
      txHash: payout.txHash || undefined,
    };
  }
}
