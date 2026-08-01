/**
 * Authentication Guard for Fastify
 * Middleware to verify JWT tokens, API keys, and enforce rate limiting
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_CODES } from '@moonbite/shared';
import { PrismaClient } from '@moonbite/db';
import { extractMerchantIdFromToken } from '../services/auth-service.js';
import { createAppError } from './error-handler.js';
import { isWithinRateLimit, getRateLimitStatus } from './api-rate-limiter.js';

/**
 * Extend FastifyRequest to include authenticated merchant
 */
declare global {
  namespace Express {
    interface Request {
      merchantId?: string;
    }
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    merchantId?: string;
  }
}

/**
 * Extract Authorization header and verify JWT
 */
export function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * Fastify hook for authentication
 * Add to protected routes
 */
export async function authGuard(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Missing authorization token');
  }

  const merchantId = extractMerchantIdFromToken(token);
  if (!merchantId) {
    throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token');
  }

  // Attach to request for use in route handlers
  request.merchantId = merchantId;
}

/**
 * Register auth guard as a Fastify plugin/decorator
 */
export async function registerAuthGuard(app: FastifyInstance): Promise<void> {
  app.decorate('authGuard', authGuard);
  app.decorate('extractToken', extractToken);

  // Make merchantId available in handlers
  app.addHook('preHandler', async (request) => {
    const token = extractToken(request);
    if (token) {
      request.merchantId = extractMerchantIdFromToken(token) || undefined;
    }
  });
}

/**
 * Helper to require authentication on a route
 */
export async function requireAuth(request: FastifyRequest): Promise<string> {
  if (!request.merchantId) {
    throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Authentication required');
  }

  return request.merchantId;
}

/**
 * Verify API key and extract merchant ID
 */
export async function verifyApiKey(
  token: string,
  prisma: PrismaClient
): Promise<string | null> {
  // Remove 'Bearer ' prefix if present
  const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

  try {
    const apiKey = await prisma.apiKey.findUnique({
      where: { publicKey: cleanToken.split('_')[0] }, // pk_xyz format
      select: {
        secretKeyHash: true,
        isActive: true,
        merchantId: true,
      },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // In production, verify secret hash
    // For now, assume valid if found and active
    return apiKey.merchantId;
  } catch {
    return null;
  }
}

/**
 * Middleware to add rate limit headers to response
 */
export function addRateLimitHeaders(
  request: FastifyRequest,
  reply: FastifyReply,
  apiKey: string
): void {
  const status = getRateLimitStatus(apiKey);

  reply.header('X-RateLimit-Limit', status.limit.toString());
  reply.header('X-RateLimit-Remaining', status.remaining.toString());
  reply.header('X-RateLimit-Reset', status.resetAt.toString());
}

/**
 * Enhanced auth guard with API key support
 */
export async function authGuardWithApiKey(
  request: FastifyRequest,
  reply: FastifyReply,
  prisma: PrismaClient
): Promise<void> {
  const token = extractToken(request);
  if (!token) {
    throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Missing authorization token');
  }

  let merchantId: string | null = null;
  let apiKeyUsed = false;

  // Try JWT first
  merchantId = extractMerchantIdFromToken(token);

  // If not JWT, try API key
  if (!merchantId) {
    merchantId = await verifyApiKey(token, prisma);
    apiKeyUsed = true;

    if (!merchantId) {
      throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Invalid or expired token/API key');
    }

    // Check rate limit for API key
    const apiKey = token.split('_')[0]; // Extract public key part
    const rateLimit = isWithinRateLimit(apiKey);

    if (!rateLimit.allowed) {
      addRateLimitHeaders(request, reply, apiKey);
      throw createAppError(
        ERROR_CODES.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded: ${rateLimit.limit} requests per minute`
      );
    }

    // Add rate limit headers
    addRateLimitHeaders(request, reply, apiKey);
  }

  // Attach to request
  request.merchantId = merchantId;
  (request as any).isApiKey = apiKeyUsed;
}
