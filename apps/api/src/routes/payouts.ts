/**
 * Payout routes
 * GET /payouts - Get payout history
 * POST /payouts - Request a payout
 * GET /payouts/:id - Get payout details
 * GET /payouts/balance - Get merchant balance
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { PayoutService } from '../services/payout-service.js';
import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';

export default async function payoutRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const payoutService = new PayoutService(prisma);

  /**
   * GET /payouts/balance
   * Get merchant account balance
   */
  app.get('/payouts/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const balance = await payoutService.getMerchantBalance(merchantId);
      return reply.status(200).send(balance);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /payouts
   * Get payout history
   */
  app.get('/payouts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { page, limit } = request.query as { page?: string; limit?: string };

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const result = await payoutService.getPayoutHistory(merchantId, {
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
   * POST /payouts
   * Request a payout
   */
  app.post('/payouts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { amount, wallet, totpCode } = request.body as {
        amount?: string;
        wallet?: string;
        totpCode?: string;
      };

      if (!amount || !wallet) {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'amount and wallet are required',
        });
      }

      // Convert amount string to BigInt
      let amountBigInt: bigint;
      try {
        amountBigInt = BigInt(amount);
      } catch {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'Invalid amount format',
        });
      }

      const payout = await payoutService.requestPayout(
        merchantId,
        amountBigInt,
        wallet,
        totpCode
      );

      return reply.status(201).send(payout);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /payouts/:id
   * Get payout details
   */
  app.get('/payouts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const payout = await payoutService.getPayoutDetails(id, merchantId);
      return reply.status(200).send(payout);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
