/**
 * Authentication Guard for Fastify
 * Middleware to verify JWT tokens and extract merchant ID
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ERROR_CODES } from '@moonbite/shared';
import { extractMerchantIdFromToken } from '../services/auth-service.js';
import { createAppError } from './error-handler.js';

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
