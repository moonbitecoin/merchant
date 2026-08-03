/**
 * Review Service
 * Manages product reviews and ratings from customers
 */

import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';

export class ReviewService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get reviews for a product (public)
   */
  async getProductReviews(
    productId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    reviews: Array<{
      id: string;
      rating: number;
      comment: string;
      customerName: string;
      createdAt: string;
    }>;
    total: number;
    averageRating: number;
  }> {
    const [reviews, total, stats] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          productId,
          deletedAt: null,
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          customerName: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 10,
        skip: options?.offset || 0,
      }),
      this.prisma.review.count({
        where: {
          productId,
          deletedAt: null,
        },
      }),
      this.prisma.review.aggregate({
        where: {
          productId,
          deletedAt: null,
        },
        _avg: {
          rating: true,
        },
      }),
    ]);

    const averageRating = stats._avg.rating || 0;

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
      averageRating: Math.round(averageRating * 10) / 10,
    };
  }

  /**
   * Submit a review (customer after download)
   */
  async submitReview(
    productId: string,
    transactionId: string,
    input: {
      rating: number;
      comment: string;
      customerName: string;
    }
  ): Promise<{
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
  }> {
    // Validate rating
    if (input.rating < 1 || input.rating > 5 || !Number.isInteger(input.rating)) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Rating must be an integer between 1 and 5'
      );
    }

    // Validate comment
    if (!input.comment || input.comment.trim().length < 5 || input.comment.length > 1000) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Comment must be 5-1000 characters'
      );
    }

    // Validate customer name
    if (!input.customerName || input.customerName.trim().length < 2 || input.customerName.length > 100) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Customer name must be 2-100 characters'
      );
    }

    // Verify transaction is confirmed
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        productId: true,
      },
    });

    if (!transaction || transaction.status !== 'confirmed') {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Only confirmed transactions can leave reviews'
      );
    }

    if (transaction.productId !== productId) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Transaction does not match product'
      );
    }

    // Check if already reviewed this transaction
    const existing = await this.prisma.review.findFirst({
      where: {
        transactionId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'You have already reviewed this purchase'
      );
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        id: require('crypto').randomUUID(),
        productId,
        transactionId,
        rating: input.rating,
        comment: input.comment.trim(),
        customerName: input.customerName.trim(),
        createdAt: new Date(),
      },
    });

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }

  /**
   * Get review statistics for a product
   */
  async getReviewStats(productId: string): Promise<{
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }> {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        deletedAt: null,
      },
      select: {
        rating: true,
      },
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      distribution[review.rating as keyof typeof distribution]++;
      totalRating += review.rating;
    }

    const averageRating =
      reviews.length > 0 ? Math.round((totalRating / reviews.length) * 10) / 10 : 0;

    return {
      totalReviews: reviews.length,
      averageRating,
      ratingDistribution: distribution as any,
    };
  }

  /**
   * Delete review (merchant moderation)
   */
  async deleteReview(reviewId: string, merchantId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        product: {
          select: {
            store: {
              select: { merchantId: true },
            },
          },
        },
      },
    });

    if (!review || review.product.store.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.NOT_FOUND, 'Review not found');
    }

    await this.prisma.review.update({
      where: { id: reviewId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get reviews for merchant moderation
   */
  async getMerchantReviews(
    merchantId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    reviews: Array<{
      id: string;
      productTitle: string;
      rating: number;
      comment: string;
      customerName: string;
      createdAt: string;
    }>;
    total: number;
  }> {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          product: {
            store: { merchantId },
          },
          deletedAt: null,
        },
        select: {
          id: true,
          rating: true,
          comment: true,
          customerName: true,
          createdAt: true,
          product: { select: { title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.review.count({
        where: {
          product: {
            store: { merchantId },
          },
          deletedAt: null,
        },
      }),
    ]);

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        productTitle: r.product.title,
        rating: r.rating,
        comment: r.comment,
        customerName: r.customerName,
        createdAt: r.createdAt.toISOString(),
      })),
      total,
    };
  }
}
