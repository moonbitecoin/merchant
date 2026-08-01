/**
 * Checkout and payment routes
 * POST /checkout - Create checkout
 * GET /checkout/:id - Get checkout status
 * POST /dev/mock-payment - Mock payment (dev only)
 */

import { FastifyInstance } from 'fastify';
import { CheckoutRequestSchema, MockPaymentRequestSchema } from '@moonbite/shared';

export default async function checkoutRoutes(app: FastifyInstance) {
  /**
   * POST /checkout
   * Create a checkout session for a product
   * Returns deposit address and QR code
   */
  app.post('/checkout', async (request, reply) => {
    try {
      const data = CheckoutRequestSchema.parse(request.body);

      // TODO: Implement checkout logic
      // - Find product
      // - Create transaction with unique deposit address
      // - Generate QR code
      // - Return checkout details

      return reply.status(201).send({
        transactionId: 'tx-id',
        depositAddress: 'deposit-address',
        amount: 1000000000n,
        qrCode: 'data:image/svg+xml;base64,...',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });
    } catch (error) {
      throw error;
    }
  });

  /**
   * GET /checkout/:id
   * Get checkout status
   */
  app.get('/checkout/:id', async (_request, reply) => {
    // TODO: Implement checkout status retrieval
    return reply.status(200).send({
      id: 'tx-id',
      status: 'pending',
      depositAddress: 'address',
      amount: 1000000000n,
      confirmedAt: null,
    });
  });

  /**
   * POST /dev/mock-payment
   * Simulate a payment (development only)
   * DO NOT expose in production
   */
  if (process.env.NODE_ENV === 'development' || process.env.MOCK_CHAIN_ENABLED === 'true') {
    app.post('/dev/mock-payment', async (request, reply) => {
      try {
        const data = MockPaymentRequestSchema.parse(request.body);

        // TODO: Implement mock payment simulation
        // - Find transaction by deposit address
        // - Simulate payment via MockChainAdapter
        // - Trigger payment confirmation flow

        return reply.status(200).send({
          success: true,
          transactionId: 'tx-id',
          message: 'Mock payment simulated',
        });
      } catch (error) {
        throw error;
      }
    });
  }
}
