/**
 * Coupon routes
 * GET /coupons - List coupons
 * POST /coupons - Create coupon
 * PUT /coupons/:id - Update coupon
 * DELETE /coupons/:id - Delete coupon
 * POST /coupons/:id/toggle - Toggle coupon active status
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { CouponService } from '../services/coupon-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function couponRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const couponService = new CouponService(prisma);

  /**
   * GET /coupons
   * List coupons for merchant
   */
  app.get('/coupons', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { page, limit } = request.query as { page?: string; limit?: string };

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const result = await couponService.listCoupons(merchantId, {
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      });

      return reply.status(200).send({
        ...result,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(result.total / limitNum),
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /coupons
   * Create a coupon
   */
  app.post('/coupons', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { code, discountType, discountValue, maxUsage, expiresAt, storeId } = request.body as {
        code?: string;
        discountType?: string;
        discountValue?: string;
        maxUsage?: number;
        expiresAt?: string;
        storeId?: string;
      };

      if (!code || !discountType || !discountValue) {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'code, discountType, and discountValue are required',
        });
      }

      if (discountType !== 'percentage' && discountType !== 'fixed') {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'discountType must be "percentage" or "fixed"',
        });
      }

      let discountBigInt: bigint;
      try {
        discountBigInt = BigInt(discountValue);
      } catch {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'Invalid discountValue format',
        });
      }

      const coupon = await couponService.createCoupon(merchantId, {
        code,
        discountType: discountType as 'percentage' | 'fixed',
        discountValue: discountBigInt,
        maxUsage,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        storeId,
      });

      return reply.status(201).send(coupon);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * PUT /coupons/:id
   * Update coupon
   */
  app.put('/coupons/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };
      const { discountValue, maxUsage, expiresAt } = request.body as {
        discountValue?: string;
        maxUsage?: number;
        expiresAt?: string;
      };

      const updates: any = {};

      if (discountValue !== undefined) {
        updates.discountValue = BigInt(discountValue);
      }

      if (maxUsage !== undefined) {
        updates.maxUsage = maxUsage;
      }

      if (expiresAt !== undefined) {
        updates.expiresAt = expiresAt ? new Date(expiresAt) : null;
      }

      const coupon = await couponService.updateCoupon(id, merchantId, updates);
      return reply.status(200).send(coupon);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /coupons/:id/toggle
   * Toggle coupon active status
   */
  app.post('/coupons/:id/toggle', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const isActive = await couponService.toggleCoupon(id, merchantId);
      return reply.status(200).send({ isActive });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /coupons/:id
   * Delete coupon
   */
  app.delete('/coupons/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      await couponService.deleteCoupon(id, merchantId);
      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
