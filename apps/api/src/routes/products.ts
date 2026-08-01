/**
 * Product management routes
 * GET /stores/:storeId/products - List products for store
 * POST /stores/:storeId/products - Create product
 * GET /products/:id - Get product details
 * PUT /products/:id - Update product
 * POST /products/:id/publish - Publish product
 * POST /products/:id/archive - Archive product
 * DELETE /products/:id - Delete product
 * POST /products/:id/files - Upload file
 * GET /products/:id/files - List files
 * DELETE /products/:id/files/:fileId - Delete file
 * GET /public/store/:slug/products - Get store products (public)
 */

import { FastifyInstance } from 'fastify';
import { CreateProductRequestSchema, UpdateProductRequestSchema } from '@moonbite/shared';
import { sendProblemJson } from '../lib/error-handler.js';
import { requireAuth } from '../lib/auth-guard.js';
import { ProductService } from '../services/product-service.js';
import { FileService, createMinIOClient } from '../services/file-service.js';
import { PrismaClient } from '@moonbite/db';

export default async function productsRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const productService = new ProductService(prisma);
  const minioClient = createMinIOClient();
  const fileService = new FileService(prisma, minioClient);

  /**
   * GET /stores/:storeId/products
   * List products for store (merchant only)
   */
  app.get('/stores/:storeId', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId } = request.params as { storeId: string };
      const { page, limit, status } = request.query as {
        page?: string;
        limit?: string;
        status?: string;
      };

      const result = await productService.getProductsForStore(storeId, {
        merchantId,
        status,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: page ? (parseInt(page, 10) - 1) * parseInt(limit || '50', 10) : 0,
      });

      return reply.status(200).send(result);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /stores/:storeId/products
   * Create a new product
   */
  app.post('/stores/:storeId', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId } = request.params as { storeId: string };
      const data = CreateProductRequestSchema.parse(request.body);

      const product = await productService.createProduct(merchantId, storeId, data);

      return reply.status(201).send(product);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /products/:id
   * Get product details (merchant only)
   */
  app.get('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const product = await productService.getProduct(id, merchantId);

      return reply.status(200).send(product);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * PUT /products/:id
   * Update product
   */
  app.put('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };
      const data = UpdateProductRequestSchema.parse(request.body);

      const product = await productService.updateProduct(id, merchantId, data);

      return reply.status(200).send(product);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /products/:id/publish
   * Publish product (requires at least one file)
   */
  app.post('/:id/publish', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const product = await productService.publishProduct(id, merchantId);

      return reply.status(200).send({
        message: 'Product published',
        ...product,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /products/:id/archive
   * Archive product
   */
  app.post('/:id/archive', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      const product = await productService.archiveProduct(id, merchantId);

      return reply.status(200).send({
        message: 'Product archived',
        ...product,
      });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /products/:id
   * Delete product (soft delete)
   */
  app.delete('/:id', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      await productService.deleteProduct(id, merchantId);

      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * POST /products/:id/files
   * Upload file to product
   */
  app.post('/:id/files', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      // Verify ownership
      await productService.getProduct(id, merchantId);

      // Get file from multipart
      const data = await request.file();
      if (!data) {
        throw new Error('No file provided');
      }

      const file = await fileService.uploadFile({
        productId: id,
        filename: data.filename,
        mimetype: data.mimetype,
        stream: data.file,
      });

      return reply.status(201).send(file);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /products/:id/files
   * List files for product
   */
  app.get('/:id/files', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id } = request.params as { id: string };

      // Verify ownership
      await productService.getProduct(id, merchantId);

      const files = await fileService.getFilesForProduct(id);

      return reply.status(200).send({ files });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * DELETE /products/:id/files/:fileId
   * Delete file from product
   */
  app.delete('/:id/files/:fileId', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { id, fileId } = request.params as { id: string; fileId: string };

      // Verify ownership
      await productService.getProduct(id, merchantId);

      await fileService.deleteFile(fileId, id);

      return reply.status(204).send();
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /public/store/:slug/products
   * Get public store products (no auth)
   */
  app.get('/public/store/:slug/products', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };

      const products = await productService.getProductsByStoreSlug(slug);

      return reply.status(200).send({ products });
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
