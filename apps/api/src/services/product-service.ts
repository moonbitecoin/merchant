/**
 * Product Service
 * Business logic for product management
 */

import { PrismaClient } from '@moonbite/db';
import {
  generateUUIDv7,
  isValidSlug,
  ERROR_CODES,
  PRODUCT_CATEGORIES,
  DOWNLOAD_LIMITS,
  formatMbite,
} from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { AuditService } from './audit-service.js';

export interface CreateProductInput {
  title: string;
  slug: string;
  description: string;
  category: string;
  price: bigint;
  downloadLimit: string;
  expiryDate?: Date | null;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: bigint;
  downloadLimit?: string;
  expiryDate?: Date | null;
}

export class ProductService {
  constructor(
    private prisma: PrismaClient,
    private auditService?: AuditService
  ) {}

  /**
   * Create a new product
   */
  async createProduct(
    merchantId: string,
    storeId: string,
    input: CreateProductInput
  ): Promise<any> {
    // Verify store ownership
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: { merchantId: true, deletedAt: true },
    });

    if (!store || store.deletedAt || store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.STORE_NOT_FOUND, 'Store not found');
    }

    // Validate input
    if (!input.title || input.title.length < 1 || input.title.length > 200) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Product title must be 1-200 characters'
      );
    }

    if (!isValidSlug(input.slug)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Slug must be lowercase, alphanumeric with hyphens'
      );
    }

    if (!PRODUCT_CATEGORIES.includes(input.category as any)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Category must be one of: ${PRODUCT_CATEGORIES.join(', ')}`
      );
    }

    if (input.price < 0n) {
      throw createAppError(ERROR_CODES.VALIDATION_ERROR, 'Price must be positive');
    }

    if (!DOWNLOAD_LIMITS.includes(input.downloadLimit as any)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Download limit must be one of: ${DOWNLOAD_LIMITS.join(', ')}`
      );
    }

    // Check duplicate slug within store
    const existing = await this.prisma.product.findFirst({
      where: { storeId, slug: input.slug, deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      throw createAppError(
        ERROR_CODES.DUPLICATE_SLUG,
        'A product with this slug already exists in this store'
      );
    }

    // Create product
    const product = await this.prisma.product.create({
      data: {
        id: generateUUIDv7(),
        storeId,
        title: input.title,
        slug: input.slug,
        description: input.description,
        category: input.category,
        price: input.price,
        downloadLimit: input.downloadLimit,
        expiryDate: input.expiryDate || null,
        status: 'draft',
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        price: true,
        downloadLimit: true,
        expiryDate: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.logProductCreate(
        merchantId,
        product.id,
        input.title,
        '0.0.0.0'
      );
    }

    return {
      ...product,
      price: product.price.toString(),
      priceFormatted: formatMbite(product.price),
    };
  }

  /**
   * Get product by ID
   */
  async getProduct(productId: string, merchantId?: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        storeId: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        price: true,
        downloadLimit: true,
        expiryDate: true,
        status: true,
        store: {
          select: { merchantId: true },
        },
        _count: {
          select: { files: true },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product || product.store.deletedAt) {
      throw createAppError(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found');
    }

    // Verify ownership if merchantId provided
    if (merchantId && product.store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your product');
    }

    return {
      ...product,
      price: product.price.toString(),
      priceFormatted: formatMbite(product.price),
      fileCount: product._count.files,
    };
  }

  /**
   * Get products for a store
   */
  async getProductsForStore(
    storeId: string,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
      merchantId?: string;
    }
  ): Promise<any> {
    // Verify store access if merchantId provided
    if (options?.merchantId) {
      const store = await this.prisma.store.findUnique({
        where: { id: storeId },
        select: { merchantId: true },
      });

      if (!store || store.merchantId !== options.merchantId) {
        throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your store');
      }
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          storeId,
          deletedAt: null,
          ...(options?.status && { status: options.status }),
        },
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          category: true,
          price: true,
          downloadLimit: true,
          status: true,
          _count: {
            select: { files: true },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.product.count({
        where: { storeId, deletedAt: null },
      }),
    ]);

    return {
      products: products.map((p) => ({
        ...p,
        price: p.price.toString(),
        priceFormatted: formatMbite(p.price),
        fileCount: p._count.files,
      })),
      total,
    };
  }

  /**
   * Get products by store slug (public)
   */
  async getProductsByStoreSlug(slug: string): Promise<any> {
    const products = await this.prisma.product.findMany({
      where: {
        store: { slug },
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        category: true,
        price: true,
        downloadLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return products.map((p) => ({
      ...p,
      price: p.price.toString(),
      priceFormatted: formatMbite(p.price),
    }));
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string,
    merchantId: string,
    input: UpdateProductInput
  ): Promise<any> {
    // Verify ownership
    const product = await this.getProduct(productId, merchantId);

    // Validate input
    if (input.title && (input.title.length < 1 || input.title.length > 200)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Product title must be 1-200 characters'
      );
    }

    if (input.price !== undefined && input.price < 0n) {
      throw createAppError(ERROR_CODES.VALIDATION_ERROR, 'Price must be positive');
    }

    if (input.downloadLimit && !DOWNLOAD_LIMITS.includes(input.downloadLimit as any)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        `Download limit must be one of: ${DOWNLOAD_LIMITS.join(', ')}`
      );
    }

    // Update
    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.description && { description: input.description }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.downloadLimit && { downloadLimit: input.downloadLimit }),
        ...(input.expiryDate !== undefined && { expiryDate: input.expiryDate }),
      },
      select: {
        id: true,
        title: true,
        price: true,
        status: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      price: updated.price.toString(),
      priceFormatted: formatMbite(updated.price),
    };
  }

  /**
   * Publish product (draft -> active)
   */
  async publishProduct(productId: string, merchantId: string): Promise<any> {
    // Verify ownership and it has files
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: {
        storeId: true,
        status: true,
        _count: { select: { files: true } },
        store: { select: { merchantId: true } },
      },
    });

    if (!product || product.store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found');
    }

    if (product._count.files === 0) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Product must have at least one file before publishing'
      );
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'active' },
      select: { id: true, status: true },
    });

    return updated;
  }

  /**
   * Archive product
   */
  async archiveProduct(productId: string, merchantId: string): Promise<any> {
    // Verify ownership
    await this.getProduct(productId, merchantId);

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status: 'archived' },
      select: { id: true, status: true },
    });

    return updated;
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string, merchantId: string): Promise<void> {
    // Verify ownership
    await this.getProduct(productId, merchantId);

    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });
  }
}
