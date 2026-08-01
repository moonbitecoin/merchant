/**
 * Coupon Service
 * Manages discount coupons for merchant stores
 */

import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';

export type DiscountType = 'percentage' | 'fixed';

export interface CreateCouponInput {
  code: string;
  discountType: DiscountType;
  discountValue: bigint;
  maxUsage?: number;
  expiresAt?: Date;
  storeId?: string;
}

export class CouponService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a coupon
   */
  async createCoupon(
    merchantId: string,
    input: CreateCouponInput
  ): Promise<{
    id: string;
    code: string;
    discountType: string;
    discountValue: string;
    maxUsage?: number;
    expiresAt?: string;
  }> {
    // Validate code
    if (!input.code || input.code.length < 3 || input.code.length > 50) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Coupon code must be 3-50 characters'
      );
    }

    // Check for duplicate code
    const existing = await this.prisma.coupon.findFirst({
      where: {
        code: input.code.toUpperCase(),
        store: { merchantId },
        deletedAt: null,
      },
    });

    if (existing) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Coupon code already exists'
      );
    }

    // Validate discount value
    if (input.discountValue <= 0n) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Discount value must be greater than zero'
      );
    }

    // Validate percentage caps
    if (input.discountType === 'percentage' && input.discountValue > 100n) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Percentage discount cannot exceed 100%'
      );
    }

    // Get store (if storeId specified, verify ownership)
    let storeId: string | null = null;
    if (input.storeId) {
      const store = await this.prisma.store.findFirst({
        where: {
          id: input.storeId,
          merchantId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!store) {
        throw createAppError(ERROR_CODES.STORE_NOT_FOUND, 'Store not found');
      }

      storeId = store.id;
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        id: require('crypto').randomUUID(),
        code: input.code.toUpperCase(),
        discountType: input.discountType,
        discountValue: input.discountValue,
        maxUsage: input.maxUsage || 0, // 0 = unlimited
        expiresAt: input.expiresAt,
        storeId,
        isActive: true,
        createdAt: new Date(),
      },
    });

    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      maxUsage: coupon.maxUsage || undefined,
      expiresAt: coupon.expiresAt?.toISOString(),
    };
  }

  /**
   * Get coupon by code (for checkout)
   */
  async getCouponByCode(
    code: string
  ): Promise<{
    id: string;
    code: string;
    discountType: string;
    discountValue: string;
  } | null> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        deletedAt: null,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      select: {
        id: true,
        code: true,
        discountType: true,
        discountValue: true,
      },
    });

    if (!coupon) return null;

    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
    };
  }

  /**
   * List coupons for merchant
   */
  async listCoupons(
    merchantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    coupons: {
      id: string;
      code: string;
      discountType: string;
      discountValue: string;
      maxUsage: number;
      usageCount: number;
      expiresAt?: string;
      isActive: boolean;
      createdAt: string;
    }[];
    total: number;
  }> {
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where: {
          store: { merchantId },
          deletedAt: null,
        },
        select: {
          id: true,
          code: true,
          discountType: true,
          discountValue: true,
          maxUsage: true,
          expiresAt: true,
          isActive: true,
          createdAt: true,
          _count: { select: { transactions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.coupon.count({
        where: {
          store: { merchantId },
          deletedAt: null,
        },
      }),
    ]);

    return {
      coupons: coupons.map((c) => ({
        id: c.id,
        code: c.code,
        discountType: c.discountType,
        discountValue: c.discountValue.toString(),
        maxUsage: c.maxUsage,
        usageCount: c._count.transactions,
        expiresAt: c.expiresAt?.toISOString(),
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
    };
  }

  /**
   * Update coupon
   */
  async updateCoupon(
    couponId: string,
    merchantId: string,
    input: Partial<CreateCouponInput>
  ): Promise<{
    id: string;
    code: string;
    discountType: string;
    discountValue: string;
    isActive: boolean;
  }> {
    // Verify ownership
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        store: { merchantId },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw createAppError(ERROR_CODES.COUPON_NOT_FOUND, 'Coupon not found');
    }

    const updates: any = {};

    if (input.discountValue !== undefined) {
      if (input.discountValue <= 0n) {
        throw createAppError(
          ERROR_CODES.VALIDATION_ERROR,
          'Discount value must be greater than zero'
        );
      }
      updates.discountValue = input.discountValue;
    }

    if (input.maxUsage !== undefined) {
      updates.maxUsage = input.maxUsage;
    }

    if (input.expiresAt !== undefined) {
      updates.expiresAt = input.expiresAt;
    }

    const updated = await this.prisma.coupon.update({
      where: { id: couponId },
      data: updates,
    });

    return {
      id: updated.id,
      code: updated.code,
      discountType: updated.discountType,
      discountValue: updated.discountValue.toString(),
      isActive: updated.isActive,
    };
  }

  /**
   * Disable/enable coupon
   */
  async toggleCoupon(couponId: string, merchantId: string): Promise<boolean> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        store: { merchantId },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw createAppError(ERROR_CODES.COUPON_NOT_FOUND, 'Coupon not found');
    }

    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: !coupon.isActive },
    });

    return !coupon.isActive;
  }

  /**
   * Delete coupon (soft delete)
   */
  async deleteCoupon(couponId: string, merchantId: string): Promise<void> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        id: couponId,
        store: { merchantId },
        deletedAt: null,
      },
    });

    if (!coupon) {
      throw createAppError(ERROR_CODES.COUPON_NOT_FOUND, 'Coupon not found');
    }

    await this.prisma.coupon.update({
      where: { id: couponId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Calculate discount amount
   */
  calculateDiscount(amount: bigint, discountType: string, discountValue: bigint): bigint {
    if (discountType === 'percentage') {
      return (amount * discountValue) / 100n;
    }
    // fixed
    return Math.min(discountValue, amount);
  }
}
