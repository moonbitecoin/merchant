/**
 * Store Service
 * Business logic for store management
 */

import { PrismaClient } from '@moonbite/db';
import { generateUUIDv7, isValidSlug, ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { AuditService } from './audit-service.js';

export interface CreateStoreInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateStoreInput {
  name?: string;
  description?: string;
  logoUrl?: string | null;
}

export class StoreService {
  constructor(
    private prisma: PrismaClient,
    private auditService?: AuditService
  ) {}

  /**
   * Create a new store
   */
  async createStore(merchantId: string, input: CreateStoreInput): Promise<any> {
    // Validate input
    if (!input.name || !input.slug) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Name and slug are required'
      );
    }

    if (input.name.length < 2 || input.name.length > 100) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Store name must be 2-100 characters'
      );
    }

    if (!isValidSlug(input.slug)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Slug must be lowercase, alphanumeric with hyphens (2-50 chars)'
      );
    }

    // Check duplicate slug
    const existing = await this.prisma.store.findUnique({
      where: { slug: input.slug },
      select: { id: true, deletedAt: true },
    });

    if (existing && !existing.deletedAt) {
      throw createAppError(
        ERROR_CODES.DUPLICATE_SLUG,
        'This store slug is already taken'
      );
    }

    // Create store
    const store = await this.prisma.store.create({
      data: {
        id: generateUUIDv7(),
        merchantId,
        name: input.name,
        slug: input.slug,
        description: input.description || null,
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.logStoreCreate(
        merchantId,
        store.id,
        input.name,
        '0.0.0.0' // Will be passed by route handler
      );
    }

    return store;
  }

  /**
   * Get store by ID with ownership check
   */
  async getStore(storeId: string, merchantId?: string): Promise<any> {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        merchantId: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!store) {
      throw createAppError(ERROR_CODES.STORE_NOT_FOUND, 'Store not found');
    }

    // Verify ownership if merchantId provided
    if (merchantId && store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your store');
    }

    return store;
  }

  /**
   * Get all stores for a merchant
   */
  async getStoresForMerchant(merchantId: string, options?: { limit?: number; offset?: number }): Promise<any> {
    const [stores, total] = await Promise.all([
      this.prisma.store.findMany({
        where: { merchantId, deletedAt: null },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          publishedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.store.count({
        where: { merchantId, deletedAt: null },
      }),
    ]);

    return { stores, total };
  }

  /**
   * Get store by slug (public, no auth required)
   */
  async getStoreBySlug(slug: string): Promise<any> {
    const store = await this.prisma.store.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        status: true,
        merchant: {
          select: { name: true },
        },
      },
    });

    if (!store || store.status !== 'active') {
      throw createAppError(ERROR_CODES.STORE_NOT_FOUND, 'Store not found');
    }

    return store;
  }

  /**
   * Update store
   */
  async updateStore(storeId: string, merchantId: string, input: UpdateStoreInput): Promise<any> {
    // Verify ownership
    await this.getStore(storeId, merchantId);

    // Validate input
    if (input.name && (input.name.length < 2 || input.name.length > 100)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Store name must be 2-100 characters'
      );
    }

    // Update
    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    if (this.auditService) {
      await this.auditService.logStoreUpdate(merchantId, storeId, input, '0.0.0.0');
    }

    return store;
  }

  /**
   * Publish store (make it visible publicly)
   */
  async publishStore(storeId: string, merchantId: string): Promise<any> {
    // Verify ownership
    await this.getStore(storeId, merchantId);

    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: {
        status: 'active',
        publishedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
      },
    });

    return store;
  }

  /**
   * Suspend store (make it inaccessible)
   */
  async suspendStore(storeId: string, merchantId: string): Promise<any> {
    // Verify ownership
    await this.getStore(storeId, merchantId);

    const store = await this.prisma.store.update({
      where: { id: storeId },
      data: { status: 'suspended' },
      select: { id: true, status: true },
    });

    return store;
  }

  /**
   * Delete store (soft delete)
   */
  async deleteStore(storeId: string, merchantId: string): Promise<void> {
    // Verify ownership
    await this.getStore(storeId, merchantId);

    await this.prisma.store.update({
      where: { id: storeId },
      data: { deletedAt: new Date() },
    });
  }
}
