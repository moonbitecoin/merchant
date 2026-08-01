/**
 * Store management routes
 * GET /stores - List all stores for merchant
 * POST /stores - Create new store
 * GET /stores/:id - Get store details
 * PUT /stores/:id - Update store
 * POST /stores/:id/publish - Publish store
 * POST /stores/:id/suspend - Suspend store
 * DELETE /stores/:id - Delete store
 * GET /public/:slug - Get public store (no auth)
 */

import { FastifyInstance } from 'fastify';
import { CreateStoreRequestSchema, UpdateStoreRequestSchema } from '@moonbite/shared';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { StoreService } from '../services/store-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function storesRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const storeService = new StoreService(prisma);

  /**
   * GET /stores
   * List all stores for authenticated merchant
   */
  app.get('/', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { page, limit } = request.query as { page?: string; limit?: string };

      const result = await storeService.getStoresForMerchant(merchantId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: page ? (parseInt(page, 10) - 1) * parseInt(limit || '50', 10) : 0,
      });

      return reply.status(200).send(result);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /stores
   * Create a new store
   */
  app.post('/', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const data = CreateStoreRequestSchema.parse(request.body);

      const store = await storeService.createStore(merchantId, data);

      return reply.status(201).send(store);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /stores/:id
   * Get store details (merchant only)
   */
  app.get('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const store = await storeService.getStore(id, merchantId);

      return reply.status(200).send(store);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * PUT /stores/:id
   * Update store
   */
  app.put('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };
      const data = UpdateStoreRequestSchema.parse(request.body);

      const store = await storeService.updateStore(id, merchantId, data);

      return reply.status(200).send(store);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /stores/:id/publish
   * Publish store (make visible)
   */
  app.post('/:id/publish', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const store = await storeService.publishStore(id, merchantId);

      return reply.status(200).send({
        message: 'Store published',
        ...store,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /stores/:id/suspend
   * Suspend store (make inaccessible)
   */
  app.post('/:id/suspend', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const store = await storeService.suspendStore(id, merchantId);

      return reply.status(200).send({
        message: 'Store suspended',
        ...store,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /stores/:id
   * Delete store (soft delete)
   */
  app.delete('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      await storeService.deleteStore(id, merchantId);

      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /public/:slug
   * Get public store (no authentication required)
   */
  app.get('/public/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      const store = await storeService.getStoreBySlug(slug);

      return reply.status(200).send(store);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
