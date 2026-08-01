/**
 * Review routes
 * GET /reviews/:productId - Get product reviews (public)
 * POST /reviews/:productId - Submit review (after purchase)
 * GET /reviews/:productId/stats - Review statistics
 * DELETE /reviews/:id - Delete review (merchant only)
 * GET /reviews - Merchant review moderation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { ReviewService } from '../services/review-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function reviewRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const reviewService = new ReviewService(prisma);

  /**
   * GET /reviews/:productId
   * Get reviews for a product (public)
   */
  app.get('/reviews/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string };
      const { page, limit } = request.query as { page?: string; limit?: string };

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 10;

      const result = await reviewService.getProductReviews(productId, {
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      });

      return reply.status(200).send({
        ...result,
        page: pageNum,
        pageSize: limitNum,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /reviews/:productId/stats
   * Get review statistics for a product (public)
   */
  app.get('/reviews/:productId/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string };

      const stats = await reviewService.getReviewStats(productId);
      return reply.status(200).send(stats);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /reviews/:productId
   * Submit a review (after confirmed transaction)
   */
  app.post('/reviews/:productId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { productId } = request.params as { productId: string };
      const { transactionId, rating, comment, customerName } = request.body as {
        transactionId?: string;
        rating?: number;
        comment?: string;
        customerName?: string;
      };

      if (!transactionId || rating === undefined || !comment || !customerName) {
        return reply.status(400).send({
          type: 'VALIDATION_ERROR',
          status: 400,
          title: 'Validation error',
          detail: 'transactionId, rating, comment, and customerName are required',
        });
      }

      const review = await reviewService.submitReview(productId, transactionId, {
        rating,
        comment,
        customerName,
      });

      return reply.status(201).send(review);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /reviews
   * Get all reviews for merchant moderation (requires auth)
   */
  app.get('/reviews', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { page, limit } = request.query as { page?: string; limit?: string };

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const result = await reviewService.getMerchantReviews(merchantId, {
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
   * DELETE /reviews/:id
   * Delete a review (merchant moderation only)
   */
  app.delete('/reviews/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      await reviewService.deleteReview(id, merchantId);
      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
