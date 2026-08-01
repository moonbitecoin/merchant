/**
 * Download Service
 * Handles secure file downloads with:
 * - Signature verification (HMAC)
 * - Download limit enforcement
 * - IP-based rate limiting (5 per IP per day)
 * - Decryption and streaming
 */

import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES, DOWNLOADS_PER_IP_PER_DAY, extractIpAddress } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { decryptData } from '../lib/security.js';
import { FileService } from './file-service.js';
import { createMinIOClient } from './file-service.js';

export class DownloadService {
  private fileService: FileService;

  constructor(private prisma: PrismaClient) {
    const minioClient = createMinIOClient();
    this.fileService = new FileService(prisma, minioClient);
  }

  /**
   * Prepare download (verify signature + limits)
   */
  async prepareDownload(
    transactionId: string,
    ipAddress: string
  ): Promise<{
    filename: string;
    size: bigint;
    mimetype: string;
    stream: NodeJS.ReadableStream;
  }> {
    // Get transaction
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      select: {
        id: true,
        status: true,
        productId: true,
        product: {
          select: {
            downloadLimit: true,
            _count: {
              select: { files: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      throw createAppError(
        ERROR_CODES.TRANSACTION_NOT_FOUND,
        'Transaction not found'
      );
    }

    // Verify transaction is confirmed
    if (transaction.status !== 'confirmed') {
      throw createAppError(
        ERROR_CODES.VALIDATION_ERROR,
        'Payment not confirmed'
      );
    }

    // Verify product has files
    if (transaction.product._count.files === 0) {
      throw createAppError(
        ERROR_CODES.FILE_NOT_FOUND,
        'No files available for download'
      );
    }

    // Get first file (in production: let customer choose)
    const file = await this.prisma.productFile.findFirst({
      where: { productId: transaction.productId },
      select: {
        id: true,
        filename: true,
        mimetype: true,
      },
    });

    if (!file) {
      throw createAppError(ERROR_CODES.FILE_NOT_FOUND, 'File not found');
    }

    // Check download limit
    const downloadCount = await this.prisma.download.count({
      where: {
        transactionId,
      },
    });

    const downloadLimitNum = transaction.product.downloadLimit === 'UNLIMITED'
      ? Infinity
      : parseInt(transaction.product.downloadLimit, 10);

    if (downloadCount >= downloadLimitNum) {
      throw createAppError(
        ERROR_CODES.DOWNLOAD_LIMIT_EXCEEDED,
        `Download limit of ${transaction.product.downloadLimit} reached`
      );
    }

    // Check IP rate limit (5 per day)
    const downloadCountToday = await this.prisma.download.count({
      where: {
        ipAddress,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    if (downloadCountToday >= DOWNLOADS_PER_IP_PER_DAY) {
      throw createAppError(
        ERROR_CODES.IP_RATE_LIMIT_EXCEEDED,
        `IP rate limit: ${DOWNLOADS_PER_IP_PER_DAY} downloads per day`
      );
    }

    // Log download
    await this.prisma.download.create({
      data: {
        id: require('crypto').randomUUID(),
        transactionId,
        productFileId: file.id,
        ipAddress,
        userAgent: '', // Will be set by route handler
      },
    });

    // Get file from MinIO
    const fileData = await this.fileService.prepareDownload(file.id);

    // Get encrypted file size
    const encryptedSize = await this.getEncryptedFileSize(file.id);

    return {
      filename: file.filename,
      size: encryptedSize,
      mimetype: file.mimetype,
      stream: fileData.stream,
    };
  }

  /**
   * Get encrypted file size from MinIO
   */
  private async getEncryptedFileSize(fileId: string): Promise<bigint> {
    const file = await this.prisma.productFile.findUnique({
      where: { id: fileId },
      select: { size: true },
    });

    if (!file) {
      throw createAppError(ERROR_CODES.FILE_NOT_FOUND, 'File not found');
    }

    return file.size;
  }

  /**
   * Verify download signature
   */
  verifyDownloadSignature(
    transactionId: string,
    signature: string,
    ipAddress: string,
    expiresAt: Date
  ): boolean {
    // Check expiration
    if (new Date() > expiresAt) {
      return false;
    }

    // Verify signature (timing-safe)
    const crypto = require('crypto');
    const { createHmac } = require('crypto');

    const secret = process.env.JWT_SECRET || 'development-secret-change-in-prod';
    const payload = `${transactionId}:${expiresAt.getTime()}:${ipAddress}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get download stats for transaction
   */
  async getDownloadStats(transactionId: string): Promise<{
    downloaded: number;
    downloadLimit: string;
    canDownload: boolean;
  }> {
    const [transaction, downloadCount] = await Promise.all([
      this.prisma.transaction.findUnique({
        where: { id: transactionId },
        select: {
          productId: true,
          product: {
            select: { downloadLimit: true },
          },
        },
      }),
      this.prisma.download.count({
        where: { transactionId },
      }),
    ]);

    if (!transaction) {
      throw createAppError(ERROR_CODES.TRANSACTION_NOT_FOUND, 'Transaction not found');
    }

    const downloadLimitNum = transaction.product.downloadLimit === 'UNLIMITED'
      ? Infinity
      : parseInt(transaction.product.downloadLimit, 10);

    return {
      downloaded: downloadCount,
      downloadLimit: transaction.product.downloadLimit,
      canDownload: downloadCount < downloadLimitNum,
    };
  }

  /**
   * Get download history for merchant
   */
  async getDownloadHistory(
    merchantId: string,
    storeId?: string,
    options?: { limit?: number; offset?: number }
  ) {
    const where: any = {
      transaction: {
        store: { merchantId },
      },
    };

    if (storeId) {
      where.transaction.storeId = storeId;
    }

    const [downloads, total] = await Promise.all([
      this.prisma.download.findMany({
        where,
        select: {
          id: true,
          ipAddress: true,
          downloadedAt: true,
          transaction: {
            select: {
              id: true,
              productId: true,
              product: {
                select: { title: true },
              },
            },
          },
        },
        orderBy: { downloadedAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.download.count({ where }),
    ]);

    return { downloads, total };
  }
}
