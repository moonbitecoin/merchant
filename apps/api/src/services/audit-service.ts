/**
 * Audit Log Service
 * Logs all sensitive actions for compliance and security
 */

import { PrismaClient } from '@moonbite/db';
import { generateUUIDv7 } from '@moonbite/shared';

export type AuditAction =
  | 'merchant.login'
  | 'merchant.logout'
  | 'merchant.2fa_enable'
  | 'merchant.2fa_disable'
  | 'store.create'
  | 'store.update'
  | 'store.delete'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'payout.request'
  | 'wallet.update'
  | 'webhook.create'
  | 'webhook.update'
  | 'webhook.delete';

export interface AuditLogOptions {
  merchantId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
}

export class AuditService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Log an action to audit trail
   */
  async log(options: AuditLogOptions): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          id: generateUUIDv7(),
          merchantId: options.merchantId,
          action: options.action,
          resourceType: options.resourceType,
          resourceId: options.resourceId || '',
          changes: options.changes || null,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent || null,
        },
      });
    } catch (error) {
      // Don't throw - audit failures shouldn't break the main flow
      console.error('Failed to log audit action:', error);
    }
  }

  /**
   * Get audit logs for a merchant
   */
  async getLogsForMerchant(
    merchantId: string,
    options?: {
      limit?: number;
      offset?: number;
      action?: string;
    }
  ) {
    return await this.prisma.auditLog.findMany({
      where: {
        merchantId,
        ...(options?.action && { action: options.action }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Log merchant login
   */
  async logLogin(merchantId: string, ipAddress: string, userAgent?: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'merchant.login',
      resourceType: 'merchant',
      resourceId: merchantId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log merchant logout
   */
  async logLogout(merchantId: string, ipAddress: string, userAgent?: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'merchant.logout',
      resourceType: 'merchant',
      resourceId: merchantId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log 2FA enable
   */
  async log2FAEnable(merchantId: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'merchant.2fa_enable',
      resourceType: 'merchant',
      resourceId: merchantId,
      ipAddress,
    });
  }

  /**
   * Log 2FA disable
   */
  async log2FADisable(merchantId: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'merchant.2fa_disable',
      resourceType: 'merchant',
      resourceId: merchantId,
      ipAddress,
    });
  }

  /**
   * Log store creation
   */
  async logStoreCreate(merchantId: string, storeId: string, name: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'store.create',
      resourceType: 'store',
      resourceId: storeId,
      changes: { name },
      ipAddress,
    });
  }

  /**
   * Log store update
   */
  async logStoreUpdate(
    merchantId: string,
    storeId: string,
    changes: Record<string, any>,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      merchantId,
      action: 'store.update',
      resourceType: 'store',
      resourceId: storeId,
      changes,
      ipAddress,
    });
  }

  /**
   * Log product creation
   */
  async logProductCreate(
    merchantId: string,
    productId: string,
    title: string,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      merchantId,
      action: 'product.create',
      resourceType: 'product',
      resourceId: productId,
      changes: { title },
      ipAddress,
    });
  }

  /**
   * Log API key creation
   */
  async logAPIKeyCreate(merchantId: string, publicKeyPrefix: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'api_key.create',
      resourceType: 'api_key',
      resourceId: publicKeyPrefix,
      ipAddress,
    });
  }

  /**
   * Log API key revocation
   */
  async logAPIKeyRevoke(merchantId: string, publicKey: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'api_key.revoke',
      resourceType: 'api_key',
      resourceId: publicKey,
      ipAddress,
    });
  }

  /**
   * Log payout request
   */
  async logPayoutRequest(
    merchantId: string,
    payoutId: string,
    amount: bigint,
    ipAddress: string
  ): Promise<void> {
    await this.log({
      merchantId,
      action: 'payout.request',
      resourceType: 'payout',
      resourceId: payoutId,
      changes: { amount: amount.toString() },
      ipAddress,
    });
  }

  /**
   * Log wallet update
   */
  async logWalletUpdate(merchantId: string, newWallet: string, ipAddress: string): Promise<void> {
    await this.log({
      merchantId,
      action: 'wallet.update',
      resourceType: 'merchant',
      resourceId: merchantId,
      changes: { wallet: newWallet },
      ipAddress,
    });
  }
}
