/**
 * Job Queue Service
 * BullMQ-based async job processing for email, webhooks, payouts
 * Production-grade reliable delivery with retries
 */

import Queue from 'bull';
import { PrismaClient } from '@moonbite/db';
import { WEBHOOK_RETRY_INTERVALS_MS } from '@moonbite/shared';
import { generateWebhookSignature } from '../lib/security.js';
import { EmailService } from './email-service.js';
import { WebhookService } from './webhook-service.js';

export interface JobData {
  [key: string]: any;
}

/**
 * Job types that can be queued
 */
export type JobType = 'email-receipt' | 'webhook-delivery' | 'payout-process' | 'cleanup';

export class JobQueueService {
  private emailQueue: Queue.Queue<JobData>;
  private webhookQueue: Queue.Queue<JobData>;
  private payoutQueue: Queue.Queue<JobData>;
  private cleanupQueue: Queue.Queue<JobData>;

  constructor(
    private prisma: PrismaClient,
    private emailService: EmailService,
    private webhookService: WebhookService,
    private redisUrl: string
  ) {
    // Initialize queues with Redis backend
    this.emailQueue = new Queue('email', this.redisUrl);
    this.webhookQueue = new Queue('webhook', this.redisUrl);
    this.payoutQueue = new Queue('payout', this.redisUrl);
    this.cleanupQueue = new Queue('cleanup', this.redisUrl);

    // Setup processors
    this.setupProcessors();
  }

  /**
   * Setup job processors
   */
  private setupProcessors(): void {
    // Email processor
    this.emailQueue.process(async (job) => {
      return this.processEmailJob(job);
    });

    // Webhook processor
    this.webhookQueue.process(async (job) => {
      return this.processWebhookJob(job);
    });

    // Payout processor
    this.payoutQueue.process(async (job) => {
      return this.processPayoutJob(job);
    });

    // Cleanup processor
    this.cleanupQueue.process(async (job) => {
      return this.processCleanupJob(job);
    });

    // Error handlers
    this.emailQueue.on('failed', (job, err) => {
      console.error(`Email job ${job.id} failed:`, err.message);
    });

    this.webhookQueue.on('failed', (job, err) => {
      console.error(`Webhook job ${job.id} failed:`, err.message);
    });

    this.payoutQueue.on('failed', (job, err) => {
      console.error(`Payout job ${job.id} failed:`, err.message);
    });
  }

  /**
   * Queue email job
   */
  async queueEmail(type: string, recipient: string, data: any): Promise<void> {
    await this.emailQueue.add(
      { type, recipient, data },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000, // Start at 2 seconds
        },
        removeOnComplete: true,
      }
    );
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: Queue.Job<JobData>): Promise<void> {
    const { type, recipient, data } = job.data;

    switch (type) {
      case 'payment-receipt':
        await this.emailService.sendPaymentConfirmation(
          recipient,
          data.productName,
          data.amount,
          data.downloadUrl
        );
        break;

      case 'verification':
        await this.emailService.sendVerificationEmail(recipient, data.token);
        break;

      case 'password-reset':
        await this.emailService.sendPasswordResetEmail(recipient, data.token);
        break;

      case 'payout-notification':
        await this.emailService.sendPayoutNotification(
          recipient,
          data.amount,
          data.wallet
        );
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }
  }

  /**
   * Queue webhook delivery
   */
  async queueWebhookDelivery(
    webhookId: string,
    event: string,
    payload: any,
    secret: string,
    url: string
  ): Promise<void> {
    const payloadJson = JSON.stringify(payload);
    const signature = generateWebhookSignature(payloadJson, secret);

    await this.webhookQueue.add(
      {
        webhookId,
        event,
        payload: payloadJson,
        signature,
        url,
      },
      {
        attempts: WEBHOOK_RETRY_INTERVALS_MS.length + 1,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
  }

  /**
   * Process webhook delivery
   */
  private async processWebhookJob(job: Queue.Job<JobData>): Promise<void> {
    const { webhookId, url, signature, payload } = job.data;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-MoonBite-Signature': signature,
          'User-Agent': 'MoonBite/1.0',
        },
        body: payload,
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      // BullMQ will retry automatically
      throw error;
    }
  }

  /**
   * Queue payout processing
   */
  async queuePayout(payoutId: string, merchantId: string, amount: bigint, wallet: string): Promise<void> {
    await this.payoutQueue.add(
      {
        payoutId,
        merchantId,
        amount: amount.toString(), // BigInt → string for serialization
        wallet,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      }
    );
  }

  /**
   * Process payout
   */
  private async processPayoutJob(job: Queue.Job<JobData>): Promise<void> {
    const { payoutId, merchantId, amount, wallet } = job.data;

    // TODO: Integrate with blockchain to send funds
    // For now, mark as pending

    await this.prisma.payout.update({
      where: { id: payoutId },
      data: {
        status: 'processing',
      },
    });

    console.log(`Processing payout: ${payoutId} (${amount} to ${wallet})`);
  }

  /**
   * Queue cleanup job
   */
  async queueCleanup(type: string, data: any): Promise<void> {
    await this.cleanupQueue.add(
      { type, data },
      {
        attempts: 3,
      }
    );
  }

  /**
   * Process cleanup
   */
  private async processCleanupJob(job: Queue.Job<JobData>): Promise<void> {
    const { type, data } = job.data;

    switch (type) {
      case 'expire-transactions':
        // Delete old pending transactions
        await this.prisma.transaction.deleteMany({
          where: {
            status: 'pending',
            expiresAt: {
              lt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Older than 24h
            },
          },
        });
        break;

      case 'cleanup-idempotency-keys':
        // Delete expired idempotency keys
        await this.prisma.idempotencyKey.deleteMany({
          where: {
            expiresAt: {
              lt: new Date(),
            },
          },
        });
        break;

      case 'archive-audit-logs':
        // Archive old audit logs (soft delete)
        await this.prisma.auditLog.updateMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Older than 90 days
            },
          },
          data: {
            // Mark for archive (if we add that field)
          },
        });
        break;

      default:
        throw new Error(`Unknown cleanup type: ${type}`);
    }
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    email: { active: number; pending: number; failed: number };
    webhook: { active: number; pending: number; failed: number };
    payout: { active: number; pending: number; failed: number };
  }> {
    const [emailCounts, webhookCounts, payoutCounts] = await Promise.all([
      Promise.all([
        this.emailQueue.getActiveCount(),
        this.emailQueue.getWaitingCount(),
        this.emailQueue.getFailedCount(),
      ]),
      Promise.all([
        this.webhookQueue.getActiveCount(),
        this.webhookQueue.getWaitingCount(),
        this.webhookQueue.getFailedCount(),
      ]),
      Promise.all([
        this.payoutQueue.getActiveCount(),
        this.payoutQueue.getWaitingCount(),
        this.payoutQueue.getFailedCount(),
      ]),
    ]);

    return {
      email: { active: emailCounts[0], pending: emailCounts[1], failed: emailCounts[2] },
      webhook: { active: webhookCounts[0], pending: webhookCounts[1], failed: webhookCounts[2] },
      payout: { active: payoutCounts[0], pending: payoutCounts[1], failed: payoutCounts[2] },
    };
  }

  /**
   * Close all queues
   */
  async close(): Promise<void> {
    await Promise.all([
      this.emailQueue.close(),
      this.webhookQueue.close(),
      this.payoutQueue.close(),
      this.cleanupQueue.close(),
    ]);
  }
}
