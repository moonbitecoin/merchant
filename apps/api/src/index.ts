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
  // Seed Endpoint (Admin Only - requires SEED_TOKEN)
  // =========================================================================

  app.post('/admin/seed', async (request, reply) => {
    const token = request.headers['x-seed-token'];
    const SEED_TOKEN = process.env.SEED_TOKEN || 'moonbite-seed-demo-key-2026';

    if (!token || token !== SEED_TOKEN) {
      reply.code(403);
      return { error: 'Unauthorized - invalid or missing X-Seed-Token header' };
    }

    try {
      const { PrismaClient } = await import('@prisma/client');
      const seedPrisma = new PrismaClient();
      const crypto = await import('crypto');

      function generateSimpleHash(password: string): string {
        return crypto.createHash('sha256').update(password + 'salt').digest('hex');
      }

      console.log('[INFO] Starting database seed from endpoint...');

      // Create merchants
      const m1 = await seedPrisma.merchant.create({
        data: {
          id: '11111111-1111-1111-1111-111111111111',
          email: 'alice@example.com',
          passwordHash: generateSimpleHash('DemoPassword123!'),
          name: 'Alice Smith - Software Developer',
          payoutWallet: 'MBITEWallet1AddressForAlice123',
          payoutWalletValidated: true,
          emailVerified: true,
        },
      });

      const m2 = await seedPrisma.merchant.create({
        data: {
          id: '22222222-2222-2222-2222-222222222222',
          email: 'bob@example.com',
          passwordHash: generateSimpleHash('DemoPassword456!'),
          name: 'Bob Johnson - Designer & Artist',
          payoutWallet: 'MBITEWallet2AddressForBob12345',
          payoutWalletValidated: true,
          emailVerified: true,
        },
      });

      const m3 = await seedPrisma.merchant.create({
        data: {
          id: '33333333-3333-3333-3333-333333333333',
          email: 'admin@moonbite.demo',
          passwordHash: generateSimpleHash('AdminDemo789!'),
          name: 'MoonBite Admin',
          payoutWallet: 'MBITEWallet3AdminAddress123456',
          payoutWalletValidated: true,
          emailVerified: true,
        },
      });

      console.log('✓ Created 3 merchants');

      // Create stores
      const s1 = await seedPrisma.store.create({
        data: {
          merchantId: m1.id,
          name: 'Digital Dreams Store',
          slug: 'digital-dreams',
          description: 'Premium software and courses',
          status: 'active',
          publishedAt: new Date(),
        },
      });

      const s2 = await seedPrisma.store.create({
        data: {
          merchantId: m2.id,
          name: 'Creative Marketplace',
          slug: 'creative-marketplace',
          description: 'Art, eBooks, and creative content',
          status: 'active',
          publishedAt: new Date(),
        },
      });

      const s3 = await seedPrisma.store.create({
        data: {
          merchantId: m3.id,
          name: 'MoonBite Demo Store',
          slug: 'moonbite-demo',
          description: 'Official MoonBite demo store with sample products',
          status: 'active',
          publishedAt: new Date(),
        },
      });

      console.log('✓ Created 3 stores');

      // Create 9 products
      const p1 = await seedPrisma.product.create({
        data: {
          storeId: s1.id,
          title: 'Advanced TypeScript Course',
          slug: 'advanced-typescript-course',
          description: '# Learn Advanced TypeScript\n\nMaster TypeScript generics, decorators, and more.',
          category: 'COURSE',
          price: BigInt(4900000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      const p2 = await seedPrisma.product.create({
        data: {
          storeId: s1.id,
          title: 'React Component Library',
          slug: 'react-component-library',
          description: '# Professional React Components\n\n50+ production-ready components.',
          category: 'SOFTWARE',
          price: BigInt(9900000000),
          downloadLimit: '3',
          status: 'active',
        },
      });

      const p3 = await seedPrisma.product.create({
        data: {
          storeId: s1.id,
          title: 'Node.js Performance Guide',
          slug: 'nodejs-performance-guide',
          description: '# Optimize Your Node.js Applications\n\nLearn best practices and optimization techniques.',
          category: 'EBOOK',
          price: BigInt(2900000000),
          downloadLimit: '1',
          status: 'active',
        },
      });

      const p4 = await seedPrisma.product.create({
        data: {
          storeId: s2.id,
          title: 'Digital Art Brushes Pack',
          slug: 'digital-art-brushes',
          description: '# 200+ Professional Brushes\n\nFor Photoshop and Procreate.',
          category: 'ART',
          price: BigInt(1900000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      const p5 = await seedPrisma.product.create({
        data: {
          storeId: s2.id,
          title: 'Web Design eBook',
          slug: 'web-design-ebook',
          description: '# Modern Web Design Principles\n\nComprehensive guide to designing beautiful websites.',
          category: 'EBOOK',
          price: BigInt(1500000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      const p6 = await seedPrisma.product.create({
        data: {
          storeId: s2.id,
          title: 'UI/UX Masterclass',
          slug: 'uiux-masterclass',
          description: '# Complete UI/UX Course\n\nFrom wireframes to polished interfaces.',
          category: 'COURSE',
          price: BigInt(5900000000),
          downloadLimit: '3',
          status: 'active',
        },
      });

      const p7 = await seedPrisma.product.create({
        data: {
          storeId: s3.id,
          title: 'MoonBite Integration Guide',
          slug: 'moonbite-integration-guide',
          description: '# Complete MoonBite Integration Guide\n\nLearn how to integrate MoonBite payments into your app.',
          category: 'EBOOK',
          price: BigInt(999000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      const p8 = await seedPrisma.product.create({
        data: {
          storeId: s3.id,
          title: 'Crypto Payment Essentials',
          slug: 'crypto-payment-essentials',
          description: '# Crypto Payment Essentials\n\nUnderstand blockchain payments and crypto transactions.',
          category: 'COURSE',
          price: BigInt(2499000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      const p9 = await seedPrisma.product.create({
        data: {
          storeId: s3.id,
          title: 'MoonBite API Reference',
          slug: 'moonbite-api-reference',
          description: '# Complete API Reference\n\nDetailed documentation for all MoonBite API endpoints.',
          category: 'SOFTWARE',
          price: BigInt(499000000),
          downloadLimit: 'UNLIMITED',
          status: 'active',
        },
      });

      console.log('✓ Created 9 products');

      // Create sample transactions
      const now = new Date();
      await seedPrisma.transaction.createMany({
        data: [
          {
            productId: p1.id,
            storeId: s1.id,
            amount: BigInt(4900000000),
            expectedAmount: BigInt(4900000000),
            platformFeeAmount: BigInt(98000000),
            merchantAmount: BigInt(4802000000),
            depositAddress: 'DepositorAddress1234567890ab',
            txHash: 'a'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p2.id,
            storeId: s1.id,
            amount: BigInt(9900000000),
            expectedAmount: BigInt(9900000000),
            platformFeeAmount: BigInt(198000000),
            merchantAmount: BigInt(9702000000),
            depositAddress: 'DepositorAddress2234567890ab',
            txHash: 'b'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p3.id,
            storeId: s1.id,
            amount: BigInt(2800000000),
            expectedAmount: BigInt(2900000000),
            platformFeeAmount: BigInt(58000000),
            merchantAmount: BigInt(2842000000),
            depositAddress: 'DepositorAddress3234567890ab',
            txHash: 'c'.repeat(64),
            status: 'underpaid',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p4.id,
            storeId: s2.id,
            amount: BigInt(1900000000),
            expectedAmount: BigInt(1900000000),
            platformFeeAmount: BigInt(38000000),
            merchantAmount: BigInt(1862000000),
            depositAddress: 'DepositorAddress4234567890ab',
            txHash: null,
            status: 'pending',
            confirmedAt: null,
            confirmationCount: 0,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
          {
            productId: p5.id,
            storeId: s2.id,
            amount: BigInt(1500000000),
            expectedAmount: BigInt(1500000000),
            platformFeeAmount: BigInt(30000000),
            merchantAmount: BigInt(1470000000),
            depositAddress: 'DepositorAddress5234567890ab',
            txHash: null,
            status: 'pending',
            confirmedAt: null,
            confirmationCount: 0,
            expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
          },
          {
            productId: p6.id,
            storeId: s2.id,
            amount: BigInt(5900000000),
            expectedAmount: BigInt(5900000000),
            platformFeeAmount: BigInt(118000000),
            merchantAmount: BigInt(5782000000),
            depositAddress: 'DepositorAddress6234567890ab',
            txHash: 'd'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p7.id,
            storeId: s3.id,
            amount: BigInt(999000000),
            expectedAmount: BigInt(999000000),
            platformFeeAmount: BigInt(19980000),
            merchantAmount: BigInt(979020000),
            depositAddress: 'DepositorAddress7234567890ab',
            txHash: 'e'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p8.id,
            storeId: s3.id,
            amount: BigInt(2499000000),
            expectedAmount: BigInt(2499000000),
            platformFeeAmount: BigInt(49980000),
            merchantAmount: BigInt(2449020000),
            depositAddress: 'DepositorAddress8234567890ab',
            txHash: 'f'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p9.id,
            storeId: s3.id,
            amount: BigInt(499000000),
            expectedAmount: BigInt(499000000),
            platformFeeAmount: BigInt(9980000),
            merchantAmount: BigInt(489020000),
            depositAddress: 'DepositorAddress9234567890ab',
            txHash: '1'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
          {
            productId: p1.id,
            storeId: s1.id,
            amount: BigInt(5000000000),
            expectedAmount: BigInt(4900000000),
            platformFeeAmount: BigInt(98000000),
            merchantAmount: BigInt(4902000000),
            depositAddress: 'DepositorAddress0234567890ab',
            txHash: '2'.repeat(64),
            status: 'confirmed',
            confirmedAt: new Date(),
            confirmationCount: 5,
            expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
          },
        ],
      });

      console.log('✓ Created 10 transactions');

      // Create API keys
      await seedPrisma.apiKey.createMany({
        data: [
          {
            merchantId: m1.id,
            publicKey: 'pk_live_alice_test_key_123456',
            secretKeyHash: generateSimpleHash('sk_live_alice_secret_123456'),
            lastUsedAt: new Date(),
          },
          {
            merchantId: m2.id,
            publicKey: 'pk_live_bob_test_key_789012',
            secretKeyHash: generateSimpleHash('sk_live_bob_secret_789012'),
            lastUsedAt: new Date(),
          },
        ],
      });

      console.log('✓ Created 2 API keys');

      // Create webhooks
      await seedPrisma.webhook.createMany({
        data: [
          {
            merchantId: m1.id,
            url: 'https://example.com/webhooks/payment',
            events: ['payment.received', 'file.downloaded'],
            status: 'active',
            secret: crypto.randomBytes(32).toString('hex'),
          },
          {
            merchantId: m2.id,
            url: 'https://creative.example.com/hooks',
            events: ['payout.completed'],
            status: 'active',
            secret: crypto.randomBytes(32).toString('hex'),
          },
        ],
      });

      console.log('✓ Created 2 webhooks');

      // Create coupons
      await seedPrisma.coupon.createMany({
        data: [
          {
            storeId: s1.id,
            code: 'SAVE20',
            type: 'percent',
            value: BigInt(20),
            usageLimit: 100,
            usageCount: 5,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
          {
            storeId: s2.id,
            code: 'WELCOME10',
            type: 'fixed',
            value: BigInt(1000000000),
            usageLimit: null,
            usageCount: 0,
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          },
        ],
      });

      console.log('✓ Created 2 coupons');

      await seedPrisma.$disconnect();

      return {
        status: 'ok',
        message: 'Database seeded successfully with demo data',
        summary: {
          merchants: 3,
          stores: 3,
          products: 9,
          transactions: 10,
          apiKeys: 2,
          webhooks: 2,
          coupons: 2,
        },
      };
    } catch (error) {
      console.error('[ERROR] Seed failed:', error);
      reply.code(500);
      return {
        error: 'Seed failed',
        details: error instanceof Error ? error.message : String(error),
      };
    }
  });

  // =========================================================================
  // Database Connection & Initialization
  // =========================================================================

  // Run database migrations if needed (non-blocking, logs errors but continues)
  const runMigrationsAsync = async () => {
    try {
      if (process.env.NODE_ENV === 'production') {
        const { execSync } = await import('child_process');
        console.log('[INFO] Running database migrations...');
        execSync('pnpm --filter=@moonbite/db db:migrate:prod', { stdio: 'pipe' });
        console.log('[INFO] Database migrations completed successfully');
      }
    } catch (error) {
      console.error('[WARN] Database migrations failed:', error instanceof Error ? error.message : error);
      // Continue anyway - migrations might already be applied
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

    const host = process.env.API_HOST || '0.0.0.0';
    const port = parseInt(process.env.API_PORT || '3001', 10);

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
