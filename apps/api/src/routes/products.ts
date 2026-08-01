/**
 * Product management routes
 * GET /products
 * POST /products
 * GET /products/:id
 * PUT /products/:id
 * DELETE /products/:id
 */

import { FastifyInstance } from 'fastify';

export default async function productsRoutes(app: FastifyInstance) {
  /**
   * GET /products
   * List all products for store
   */
  app.get('/', async (_request, reply) => {
    // TODO: Implement product listing
    return reply.status(200).send({
      products: [],
      total: 0,
    });
  });

  /**
   * POST /products
   * Create a new product
   */
  app.post('/', async (request, reply) => {
    // TODO: Implement product creation
    return reply.status(201).send({
      id: 'product-id',
      title: '',
      price: 0n,
      status: 'draft',
    });
  });

  /**
   * GET /products/:id
   * Get product details
   */
  app.get('/:id', async (_request, reply) => {
    // TODO: Implement product retrieval
    return reply.status(200).send({
      id: 'product-id',
      title: '',
      price: 0n,
    });
  });

  /**
   * PUT /products/:id
   * Update product
   */
  app.put('/:id', async (_request, reply) => {
    // TODO: Implement product update
    return reply.status(200).send({
      id: 'product-id',
      updated: true,
    });
  });

  /**
   * DELETE /products/:id
   * Delete product
   */
  app.delete('/:id', async (_request, reply) => {
    // TODO: Implement product deletion (soft delete)
    return reply.status(204).send();
  });
}
