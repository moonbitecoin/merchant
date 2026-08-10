/**
 * MoonBite Merchant Hub API
 * Fastify-based backend for digital goods and cryptocurrency payments
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import Redis from 'ioredis';
import { PrismaClient } from '@moonbite/db';
import { RATE_LIMIT_API_MAX, RATE_LIMIT_API_WINDOW_MS } from '@moonbite/shared';
import { sendProblemJson } from './lib/error-handler.js';

// Import routes
import authRoutes from './routes/auth.js';
import storesRoutes from './routes/stores.js';
import productsRoutes from './routes/products.js';
import checkoutRoutes from './routes/checkout.js';
import downloadsRoutes from './routes/downloads.js';
import dashboardRoutes from './routes/dashboard.js';
import payoutRoutes from './routes/payouts.js';
import couponRoutes from './routes/coupons.js';
import reviewRoutes from './routes/reviews.js';
import apiDocsRoutes from './routes/api-docs.js';

/**
 * Create and configure Fastify app
 */
export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // =========================================================================
  // Global Plugins
  // =========================================================================

  // Security: Helmet for standard HTTP headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // Configured per-route
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // CORS with strict configuration
  await app.register(cors, {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-MoonBite-Signature'],
    exposedHeaders: ['X-Total-Count', 'X-Total-Pages'],
  });

  // Rate limiting: Sliding window using Redis
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

  await app.register(rateLimit, {
    max: RATE_LIMIT_API_MAX,
    timeWindow: RATE_LIMIT_API_WINDOW_MS,
    cache: 10000,
    allowList: ['127.0.0.1'],
    redis: redis,
    skip: (_request) => {
      // Skip rate limiting for health checks
      return false;
    },
  });

  // Multipart form data (for file uploads)
  await app.register(multipart, {
    limits: {
      fileSize: 2n * 1024n * 1024n * 1024n, // 2GB
    },
  });

  // =========================================================================
  // Global Error Handler
  // =========================================================================

  app.setErrorHandler((error, _request, reply) => {
    return sendProblemJson(reply, error);
  });

  // =========================================================================
  // Health Check
  // =========================================================================

  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // =========================================================================
  // Database Connection & Initialization
  // =========================================================================

  // Run database migrations if needed (non-blocking, logs errors but continues)
  const runMigrationsAsync = async () => {
    try {
      if (process.env.NODE_ENV === 'production') {
        const { execSync } = await import('child_process');
        console.log('[INFO] Syncing database schema...');
        const output = execSync('pnpm --filter=@moonbite/db db:migrate:prod 2>&1', { encoding: 'utf-8' });
        if (output) console.log('[INFO] Schema sync output:', output);
        console.log('[INFO] Database schema sync completed successfully');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[WARN] Database schema sync failed:', errorMsg);
      if (error instanceof Error && (error as any).stdout) {
        console.error('[WARN] Stdout:', (error as any).stdout);
      }
      if (error instanceof Error && (error as any).stderr) {
        console.error('[WARN] Stderr:', (error as any).stderr);
      }
      // Continue anyway - schema might already be applied
    }
  };

  // Start migrations in background but don't wait for them
  runMigrationsAsync().catch(err => console.error('[ERROR] Unexpected error during migrations:', err));

  const prisma = new PrismaClient();

  app.decorate('prisma', prisma);

  // Graceful shutdown
  app.addHook('onClose', async () => {
    await redis.disconnect();
    await prisma.$disconnect();
  });

  // =========================================================================
  // Authentication Guard
  // =========================================================================

  const { registerAuthGuard } = await import('./lib/auth-guard.js');
  await registerAuthGuard(app);

  // =========================================================================
  // Routes
  // =========================================================================

  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(storesRoutes, { prefix: '/api/v1/stores' });
  await app.register(productsRoutes, { prefix: '/api/v1/products' });
  await app.register(checkoutRoutes, { prefix: '/api/v1' });
  await app.register(downloadsRoutes, { prefix: '/api/v1' });
  await app.register(dashboardRoutes, { prefix: '/api/v1' });
  await app.register(payoutRoutes, { prefix: '/api/v1' });
  await app.register(couponRoutes, { prefix: '/api/v1' });
  await app.register(reviewRoutes, { prefix: '/api/v1' });
  await app.register(apiDocsRoutes, { prefix: '/api/v1' });

  // =========================================================================
  // OpenAPI Documentation
  // =========================================================================

  // TODO: Add @fastify/swagger for OpenAPI generation

  return app;
}

/**
 * Start server
 */
async function start() {
  try {
    const app = await createApp();

    const host = process.env.API_HOST || process.env.HOST || '0.0.0.0';
    const port = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10);

    await app.listen({ host, port });

    console.log(`🚀 MoonBite API running at http://${host}:${port}`);
    console.log(`📚 Documentation at http://${host}:${port}/docs`);
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Only start if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export type App = Awaited<ReturnType<typeof createApp>>;
