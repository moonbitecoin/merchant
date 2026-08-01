/**
 * Webhook Service
 * Manages webhook endpoints and deliveries with retry logic
 */

import { PrismaClient } from '@moonbite/db';
import { generateUUIDv7, WEBHOOK_RETRY_INTERVALS_MS, WEBHOOK_EVENTS } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { generateWebhookSignature } from '../lib/security.js';
import { ERROR_CODES } from '@moonbite/shared';

export type WebhookEvent = 'payment.received' | 'file.downloaded' | 'payout.completed';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, any>;
}

export class WebhookService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create webhook endpoint
   */
  async createWebhook(merchantId: string, url: string, events: string[]): Promise<any> {
    // Validate events
    for (const event of events) {
      if (!WEBHOOK_EVENTS.includes(event as any)) {
        throw createAppError(
          ERROR_CODES.VALIDATION_ERROR,
          `Invalid event: ${event}. Must be one of: ${WEBHOOK_EVENTS.join(', ')}`
        );
      }
    }

    // Generate secret for signing
    const secret = require('crypto').randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        id: generateUUIDv7(),
        merchantId,
        url,
        events,
        secret,
        status: 'active',
      },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        createdAt: true,
      },
    });

    return webhook;
  }

  /**
   * List webhooks for merchant
   */
  async listWebhooks(merchantId: string): Promise<any> {
    return await this.prisma.webhook.findMany({
      where: { merchantId, status: { not: 'deleted' } },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update webhook
   */
  async updateWebhook(webhookId: string, merchantId: string, data: any): Promise<any> {
    // Verify ownership
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { merchantId: true },
    });

    if (!webhook || webhook.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.NOT_FOUND, 'Webhook not found');
    }

    return await this.prisma.webhook.update({
      where: { id: webhookId },
      data,
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
      },
    });
  }

  /**
   * Delete webhook (soft delete)
   */
  async deleteWebhook(webhookId: string, merchantId: string): Promise<void> {
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { merchantId: true },
    });

    if (!webhook || webhook.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.NOT_FOUND, 'Webhook not found');
    }

    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: { status: 'deleted' },
    });
  }

  /**
   * Fire webhook (create delivery job)
   * In production: queue this with BullMQ for reliable delivery
   */
  async fireWebhook(merchantId: string, event: WebhookEvent, data: Record<string, any>): Promise<void> {
    // Get active webhooks for this merchant subscribing to this event
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        merchantId,
        status: 'active',
        events: { has: event },
      },
      select: {
        id: true,
        url: true,
        secret: true,
      },
    });

    for (const webhook of webhooks) {
      // Create delivery record
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      const payloadJson = JSON.stringify(payload);
      const signature = generateWebhookSignature(payloadJson, webhook.secret);

      await this.prisma.webhookDelivery.create({
        data: {
          id: generateUUIDv7(),
          webhookId: webhook.id,
          event,
          payload,
          retryCount: 0,
          nextRetryAt: new Date(), // Deliver immediately
        },
      });

      // In production: enqueue with BullMQ
      // await this.queue.add('webhook-delivery', {
      //   webhookId: webhook.id,
      //   url: webhook.url,
      //   signature,
      //   payload: payloadJson,
      // });
    }
  }

  /**
   * Send webhook delivery (called by BullMQ job or directly)
   * Returns true if successful, false if should retry
   */
  async sendDelivery(
    deliveryId: string,
    url: string,
    signature: string,
    payload: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MoonBite-Signature': signature,
          'User-Agent': 'MoonBite/1.0',
        },
        body: payload,
        timeout: 10000, // 10 second timeout
      });

      // Update delivery record
      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          statusCode: response.status,
          response: await response.text(),
          completedAt: response.ok ? new Date() : null,
        },
      });

      return {
        success: response.ok,
        statusCode: response.status,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          response: errorMessage,
        },
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<{ canRetry: boolean; nextRetryAt?: Date }> {
    const delivery = await this.prisma.webhookDelivery.findUnique({
      where: { id: deliveryId },
      select: {
        retryCount: true,
        completedAt: true,
      },
    });

    if (!delivery) {
      throw createAppError(ERROR_CODES.NOT_FOUND, 'Delivery not found');
    }

    if (delivery.completedAt) {
      return { canRetry: false }; // Already completed
    }

    if (delivery.retryCount >= WEBHOOK_RETRY_INTERVALS_MS.length) {
      return { canRetry: false }; // Max retries exceeded
    }

    // Calculate next retry time
    const nextRetryMs = WEBHOOK_RETRY_INTERVALS_MS[delivery.retryCount];
    const nextRetryAt = new Date(Date.now() + nextRetryMs);

    await this.prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        retryCount: delivery.retryCount + 1,
        nextRetryAt,
      },
    });

    return { canRetry: true, nextRetryAt };
  }

  /**
   * Get delivery history
   */
  async getDeliveryHistory(webhookId: string, merchantId: string): Promise<any> {
    // Verify ownership
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      select: { merchantId: true },
    });

    if (!webhook || webhook.merchantId !== merchantId) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your webhook');
    }

    return await this.prisma.webhookDelivery.findMany({
      where: { webhookId },
      select: {
        id: true,
        event: true,
        statusCode: true,
        response: true,
        retryCount: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
