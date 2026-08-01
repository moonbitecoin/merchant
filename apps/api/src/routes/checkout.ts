/**
 * Checkout and payment routes
 * POST /checkout - Create checkout (deposit address + QR code)
 * GET /checkout/:id - Get checkout status
 * POST /dev/mock-payment - Simulate payment (dev only)
 * GET /transactions/:id - Get transaction details
 * POST /webhooks - Create webhook
 * GET /webhooks - List webhooks
 * PUT /webhooks/:id - Update webhook
 * DELETE /webhooks/:id - Delete webhook
 */

import { FastifyInstance } from 'fastify';
import { CheckoutRequestSchema, MockPaymentRequestSchema } from '@moonbite/shared';
import { sendProblemJson, createAppError } from '../lib/error-handler.js';
import { requireAuth, extractToken } from '../lib/auth-guard.js';
import { CheckoutService } from '../services/checkout-service.js';
import { WebhookService } from '../services/webhook-service.js';
import { PaymentMatcher } from '../lib/payment-matcher.js';
import { getMockChainAdapter } from '@moonbite/chain';
import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';

export default async function checkoutRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const paymentMatcher = new PaymentMatcher(prisma);
  const checkoutService = new CheckoutService(prisma, paymentMatcher);
  const webhookService = new WebhookService(prisma);
  const mockChain = getMockChainAdapter();

  /**
   * POST /checkout
   * Create checkout session (get deposit address + QR code)
   */
  app.post('/checkout', async (request, reply) => {
    try {
      const data = CheckoutRequestSchema.parse(request.body);

      const result = await checkoutService.createCheckout(
        'anonymous', // Checkout can be done without auth
        data
      );

      return reply.status(201).send(result);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /checkout/:id
   * Poll checkout status
   */
  app.get('/checkout/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const result = await checkoutService.getCheckoutStatus(id);

      return reply.status(200).send(result);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /dev/mock-payment
   * Simulate payment (development only)
   * Creates a mock payment for testing
   */
  if (process.env.NODE_ENV === 'development' || process.env.MOCK_CHAIN_ENABLED === 'true') {
    app.post('/dev/mock-payment', async (request, reply) => {
      try {
        const data = MockPaymentRequestSchema.parse(request.body);

        // Start mock chain
        await mockChain.start();

        // Watch the address
        await mockChain.watchAddress(data.address);

        // Simulate deposit
        await mockChain.simulateDeposit({
          address: data.address,
          amount: data.amount,
          txHash: data.txHash,
        });

        // Get confirmations
        const confirmations = await mockChain.getConfirmations(data.txHash);

        // Find transaction by deposit address
        const transaction = await prisma.transaction.findUnique({
          where: { depositAddress: data.address },
          select: { id: true, storeId: true, productId: true },
        });

        if (!transaction) {
          throw createAppError(
            ERROR_CODES.TRANSACTION_NOT_FOUND,
            'No transaction found for this address'
          );
        }

        // Process payment
        const result = await checkoutService.processPaymentConfirmation(
          transaction.id,
          data.amount,
          data.txHash,
          confirmations,
          parseInt(process.env.CONFIRMATIONS_REQUIRED || '2', 10)
        );

        // Fire webhooks if confirmed
        if (result.status === 'confirmed') {
          await webhookService.fireWebhook(transaction.storeId, 'payment.received', {
            transactionId: transaction.id,
            amount: data.amount.toString(),
            merchantAmount: result.merchantAmount.toString(),
            platformFeeAmount: result.platformFeeAmount.toString(),
          });
        }

        return reply.status(200).send({
          success: true,
          transactionId: transaction.id,
          status: result.status,
          confirmations,
          message: `Mock payment simulated: ${result.status}`,
        });
      } catch (error) {
        return sendProblemJson(reply, error);
      }
    });
  }

  /**
   * GET /transactions/:id
   * Get transaction details (merchant can view own)
   */
  app.get('/transactions/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const merchantId = request.merchantId; // Optional auth

      const transaction = await checkoutService.getTransaction(id, merchantId);

      return reply.status(200).send(transaction);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  // =========================================================================
  // Webhook Management
  // =========================================================================

  /**
   * POST /webhooks
   * Create webhook endpoint
   */
  app.post('/webhooks', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { url, events } = request.body as { url: string; events: string[] };

      const webhook = await webhookService.createWebhook(merchantId, url, events);

      return reply.status(201).send(webhook);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /webhooks
   * List webhooks for merchant
   */
  app.get('/webhooks', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);

      const webhooks = await webhookService.listWebhooks(merchantId);

      return reply.status(200).send({ webhooks });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * PUT /webhooks/:id
   * Update webhook
   */
  app.put('/webhooks/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };
      const { url, events, status } = request.body as any;

      const webhook = await webhookService.updateWebhook(id, merchantId, {
        ...(url && { url }),
        ...(events && { events }),
        ...(status && { status }),
      });

      return reply.status(200).send(webhook);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /webhooks/:id
   * Delete webhook
   */
  app.delete('/webhooks/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      await webhookService.deleteWebhook(id, merchantId);

      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /webhooks/:id/deliveries
   * Get webhook delivery history
   */
  app.get('/webhooks/:id/deliveries', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const deliveries = await webhookService.getDeliveryHistory(id, merchantId);

      return reply.status(200).send({ deliveries });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
