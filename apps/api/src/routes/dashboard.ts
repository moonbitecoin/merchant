/**
 * Dashboard routes
 * GET /dashboard/metrics - Revenue metrics
 * GET /dashboard/revenue-chart - Revenue chart data
 * GET /dashboard/top-products - Top 5 products
 * GET /dashboard/transactions - Transaction history
 * POST /dashboard/transactions/export - Export to CSV
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { AnalyticsService } from '../services/analytics-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function dashboardRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const analyticsService = new AnalyticsService(prisma);

  /**
   * GET /dashboard/metrics
   * Get sales metrics (revenue, checkouts, conversion rate)
   */
  app.get('/dashboard/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId } = request.query as { storeId?: string };

      const metrics = await analyticsService.getSalesMetrics(merchantId, storeId);
      return reply.status(200).send(metrics);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /dashboard/revenue-chart
   * Get revenue chart data
   */
  app.get('/dashboard/revenue-chart', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId, days } = request.query as { storeId?: string; days?: string };

      const chartDays = (days === '90' ? 90 : 30) as 30 | 90;
      const chart = await analyticsService.getRevenueChart(merchantId, storeId, chartDays);

      return reply.status(200).send({ data: chart, days: chartDays });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /dashboard/top-products
   * Get top 5 products by revenue
   */
  app.get('/dashboard/top-products', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId, limit } = request.query as { storeId?: string; limit?: string };

      const products = await analyticsService.getTopProducts(
        merchantId,
        storeId,
        limit ? parseInt(limit, 10) : 5
      );

      return reply.status(200).send(products);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /dashboard/transactions
   * Get transaction history with filtering
   */
  app.get('/dashboard/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const {
        storeId,
        status,
        productId,
        startDate,
        endDate,
        page,
        limit,
      } = request.query as {
        storeId?: string;
        status?: string;
        productId?: string;
        startDate?: string;
        endDate?: string;
        page?: string;
        limit?: string;
      };

      const filters: any = {
        storeId,
        status,
        productId,
      };

      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const pageNum = page ? parseInt(page, 10) : 1;
      const limitNum = limit ? parseInt(limit, 10) : 50;

      const result = await analyticsService.getTransactionHistory(merchantId, filters, {
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
   * POST /dashboard/transactions/export
   * Export transaction history to CSV
   */
  app.post('/dashboard/transactions/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId, status, productId, startDate, endDate } = request.body as any;

      const filters: any = {
        storeId,
        status,
        productId,
      };

      if (startDate) filters.startDate = new Date(startDate);
      if (endDate) filters.endDate = new Date(endDate);

      const result = await analyticsService.getTransactionHistory(merchantId, filters, {
        limit: 10000, // Max export
      });

      const csv = analyticsService.exportTransactionsToCSV(result.transactions);

      reply.header('Content-Type', 'text/csv');
      reply.header(
        'Content-Disposition',
        `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`
      );

      return reply.send(csv);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
