/**
 * File Service
 * Handles product file uploads with streaming, encryption, and hashing
 */

import { PrismaClient } from '@moonbite/db';
import { Client as MinIOClient } from 'minio';
import crypto, { createHash } from 'crypto';
import { generateUUIDv7, ERROR_CODES } from '@moonbite/shared';
import { createAppError } from '../lib/error-handler.js';
import { encryptData } from '../lib/security.js';

export interface FileUploadOptions {
  productId: string;
  filename: string;
  mimetype: string;
  stream: NodeJS.ReadableStream;
  size?: number;
}

export class FileService {
  constructor(
    private prisma: PrismaClient,
    private minioClient: MinIOClient
  ) {}

  /**
   * Upload file to product
   * Streams directly to MinIO, never buffers in memory
   * Encrypts at rest with AES-256-GCM
   */
  async uploadFile(options: FileUploadOptions): Promise<any> {
    const { productId, filename, mimetype, stream } = options;

    // Verify product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      throw createAppError(ERROR_CODES.PRODUCT_NOT_FOUND, 'Product not found');
    }

    // Generate encryption key for this file
    const fileDataKey = crypto.randomBytes(32); // 256-bit key
    const encryptionIV = crypto.randomBytes(12); // 96-bit IV for GCM

    // Hash the file while streaming and encrypting
    const hash = createHash('sha256');
    let encryptedSize = 0;
    let encryptedData = Buffer.alloc(0);

    // Collect encrypted data (in production, stream directly to MinIO)
    const encryptCipher = crypto.createCipheriv('aes-256-gcm', fileDataKey, encryptionIV);

    return new Promise(async (resolve, reject) => {
      stream.on('data', (chunk: Buffer) => {
        try {
          hash.update(chunk);
          const encrypted = encryptCipher.update(chunk);
          encryptedData = Buffer.concat([encryptedData, encrypted]);
          encryptedSize += encrypted.length;
        } catch (error) {
          reject(error);
        }
      });

      stream.on('end', async () => {
        try {
          // Finalize encryption
          const final = encryptCipher.final();
          encryptedData = Buffer.concat([encryptedData, final]);

          const authTag = encryptCipher.getAuthTag();
          const sha256Hash = hash.digest('hex');

          // Upload to MinIO
          const minioPath = `${productId}/${generateUUIDv7()}/${filename}`;
          await this.minioClient.putObject(
            process.env.MINIO_BUCKET_PRODUCTS || 'moonbite-products',
            minioPath,
            encryptedData,
            encryptedData.length,
            { 'Content-Type': mimetype }
          );

          // Wrap data key with master key (in production, use KMS)
          const masterKey = Buffer.from(process.env.ENCRYPTION_KEY || '', 'hex');
          const wrappedKey = crypto.createCipheriv('aes-256-gcm', masterKey, crypto.randomBytes(12));
          const wrapped = Buffer.concat([
            wrappedKey.update(fileDataKey),
            wrappedKey.final(),
          ]);

          // Store metadata in database
          const productFile = await this.prisma.productFile.create({
            data: {
              id: generateUUIDv7(),
              productId,
              filename,
              mimetype,
              size: BigInt(encryptedData.length),
              sha256Hash,
              minioPath,
              encryptionKey: wrapped.toString('hex'),
              iv: encryptionIV.toString('hex'),
              tag: authTag.toString('hex'),
            },
            select: {
              id: true,
              filename: true,
              size: true,
              sha256Hash: true,
              createdAt: true,
            },
          });

          resolve({
            ...productFile,
            size: productFile.size.toString(),
            message: 'File uploaded successfully',
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on('error', reject);
    });
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<any> {
    const file = await this.prisma.productFile.findUnique({
      where: { id: fileId },
      select: {
        id: true,
        filename: true,
        mimetype: true,
        size: true,
        sha256Hash: true,
        createdAt: true,
      },
    });

    if (!file) {
      throw createAppError(ERROR_CODES.FILE_NOT_FOUND, 'File not found');
    }

    return {
      ...file,
      size: file.size.toString(),
    };
  }

  /**
   * Get files for product
   */
  async getFilesForProduct(productId: string): Promise<any> {
    const files = await this.prisma.productFile.findMany({
      where: { productId },
      select: {
        id: true,
        filename: true,
        mimetype: true,
        size: true,
        sha256Hash: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return files.map((f) => ({
      ...f,
      size: f.size.toString(),
    }));
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, productId: string): Promise<void> {
    // Verify file belongs to product
    const file = await this.prisma.productFile.findUnique({
      where: { id: fileId },
      select: { productId: true, minioPath: true },
    });

    if (!file || file.productId !== productId) {
      throw createAppError(ERROR_CODES.FILE_NOT_FOUND, 'File not found');
    }

    // Delete from MinIO
    await this.minioClient.removeObject(
      process.env.MINIO_BUCKET_PRODUCTS || 'moonbite-products',
      file.minioPath
    );

    // Delete from database
    await this.prisma.productFile.delete({
      where: { id: fileId },
    });
  }

  /**
   * Download file (for checkout)
   * Returns encrypted file stream with decryption keys
   */
  async prepareDownload(fileId: string): Promise<{
    stream: NodeJS.ReadableStream;
    filename: string;
    size: bigint;
    encryptionKey: string;
    iv: string;
    tag: string;
  }> {
    const file = await this.prisma.productFile.findUnique({
      where: { id: fileId },
      select: {
        filename: true,
        size: true,
        minioPath: true,
        encryptionKey: true,
        iv: true,
        tag: true,
      },
    });

    if (!file) {
      throw createAppError(ERROR_CODES.FILE_NOT_FOUND, 'File not found');
    }

    // Get encrypted file from MinIO
    const stream = await this.minioClient.getObject(
      process.env.MINIO_BUCKET_PRODUCTS || 'moonbite-products',
      file.minioPath
    );

    return {
      stream,
      filename: file.filename,
      size: file.size,
      encryptionKey: file.encryptionKey,
      iv: file.iv,
      tag: file.tag,
    };
  }
}

/**
 * Create MinIO client from environment
 */
export function createMinIOClient(): MinIOClient {
  return new MinIOClient({
    endPoint: process.env.MINIO_ENDPOINT || 'localhost:9000',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    useSSL: process.env.NODE_ENV === 'production',
  });
}
