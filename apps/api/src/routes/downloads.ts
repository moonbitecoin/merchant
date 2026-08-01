/**
 * Download routes
 * GET /downloads/:transactionId - Download file (signed URL)
 * GET /transactions/:transactionId/downloads - Get download stats
 * GET /analytics/downloads - Download history (merchant only)
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { sendProblemJson, createAppError } from '../lib/error-handler.js';
import { requireAuth, extractToken } from '../lib/auth-guard.js';
import { DownloadService } from '../services/download-service.js';
import { decryptData } from '../lib/security.js';
import { PrismaClient } from '@moonbite/db';
import { ERROR_CODES, extractIpAddress } from '@moonbite/shared';

export default async function downloadsRoutes(app: FastifyInstance) {
  const prisma = app.prisma as PrismaClient;
  const downloadService = new DownloadService(prisma);

  /**
   * GET /downloads/:transactionId
   * Download product file
   * Requires: valid transaction, signature, confirmed status
   */
  app.get('/downloads/:transactionId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { transactionId } = request.params as { transactionId: string };
      const { sig, expires } = request.query as { sig?: string; expires?: string };

      // Get client IP
      const ipAddress = extractIpAddress(request.headers);

      // Verify signature
      if (!sig || !expires) {
        throw createAppError(ERROR_CODES.VALIDATION_ERROR, 'Missing signature or expiry');
      }

      const expiresAt = new Date(parseInt(expires, 10));
      const signatureValid = downloadService.verifyDownloadSignature(
        transactionId,
        sig,
        ipAddress,
        expiresAt
      );

      if (!signatureValid) {
        throw createAppError(ERROR_CODES.INVALID_REQUEST, 'Invalid or expired download link');
      }

      // Prepare download (check limits, log download, get file)
      const fileData = await downloadService.prepareDownload(transactionId, ipAddress);

      // Decrypt and stream file to client
      // In production: decrypt on-the-fly (don't load full file in memory)
      const { encryptionKey, iv, tag } = await prisma.productFile.findFirstOrThrow({
        where: {
          id: fileData.id || '', // This needs to be fixed - we need to get the file ID
        },
        select: { encryptionKey: true, iv: true, tag: true },
      });

      // Set response headers for file download
      reply.header('Content-Type', fileData.mimetype);
      reply.header('Content-Disposition', `attachment; filename="${fileData.filename}"`);
      reply.header('Content-Length', fileData.size.toString());

      // Stream encrypted file
      return reply.send(fileData.stream);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /transactions/:transactionId/downloads
   * Get download stats for transaction
   */
  app.get('/transactions/:transactionId/downloads', async (request, reply) => {
    try {
      const { transactionId } = request.params as { transactionId: string };

      const stats = await downloadService.getDownloadStats(transactionId);

      return reply.status(200).send(stats);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });

  /**
   * GET /analytics/downloads
   * Get download history for authenticated merchant
   */
  app.get('/analytics/downloads', async (request, reply) => {
    try {
      const merchantId = await requireAuth(request);
      const { storeId, page, limit } = request.query as {
        storeId?: string;
        page?: string;
        limit?: string;
      };

      const history = await downloadService.getDownloadHistory(merchantId, storeId, {
        limit: limit ? parseInt(limit, 10) : 50,
        offset: page ? (parseInt(page, 10) - 1) * parseInt(limit || '50', 10) : 0,
      });

      return reply.status(200).send(history);
    } catch (error) {
      return sendProblemJson(reply, error);
    }
  });
}
