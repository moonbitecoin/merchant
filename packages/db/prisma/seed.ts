/**
 * Prisma Seed Script
 * Creates demo merchants, stores, products, and transactions for testing
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Simple hash function for demo purposes (use proper Argon2id in production)
// In real usage, passwords are hashed via the API's auth service
function generateSimpleHash(password: string): string {
  return crypto.createHash('sha256').update(password + 'salt').digest('hex');
}

async function main() {
  console.log('Seeding database...');

  // Clean up existing data (careful in production!)
  await prisma.transaction.deleteMany();
  await prisma.product.deleteMany();
  await prisma.store.deleteMany();
  await prisma.merchant.deleteMany();

  // ============================================================================
  // Create Merchants
  // ============================================================================

  const merchant1 = await prisma.merchant.create({
    data: {
      id: '11111111-1111-1111-1111-111111111111',
      email: 'alice@example.com',
      passwordHash: generateSimpleHash('DemoPassword123!'),
      name: 'Alice Smith - Software Developer',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
      payoutWallet: 'MBITEWallet1AddressForAlice123',
      payoutWalletValidated: true,
      emailVerified: true,
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      id: '22222222-2222-2222-2222-222222222222',
      email: 'bob@example.com',
      passwordHash: generateSimpleHash('DemoPassword456!'),
      name: 'Bob Johnson - Designer & Artist',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      payoutWallet: 'MBITEWallet2AddressForBob12345',
      payoutWalletValidated: true,
      emailVerified: true,
    },
  });

  const merchant3 = await prisma.merchant.create({
    data: {
      id: '33333333-3333-3333-3333-333333333333',
      email: 'admin@moonbite.demo',
      passwordHash: generateSimpleHash('AdminDemo789!'),
      name: 'MoonBite Admin',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      payoutWallet: 'MBITEWallet3AdminAddress123456',
      payoutWalletValidated: true,
      emailVerified: true,
    },
  });

  console.log('✓ Created 3 merchants');

  // ============================================================================
  // Create Stores
  // ============================================================================

  const store1 = await prisma.store.create({
    data: {
      merchantId: merchant1.id,
      name: 'Digital Dreams Store',
      slug: 'digital-dreams',
      description: 'Premium software and courses',
      status: 'active',
      publishedAt: new Date(),
    },
  });

  const store2 = await prisma.store.create({
    data: {
      merchantId: merchant2.id,
      name: 'Creative Marketplace',
      slug: 'creative-marketplace',
      description: 'Art, eBooks, and creative content',
      status: 'active',
      publishedAt: new Date(),
    },
  });

  const store3 = await prisma.store.create({
    data: {
      merchantId: merchant3.id,
      name: 'MoonBite Demo Store',
      slug: 'moonbite-demo',
      description: 'Official MoonBite demo store with sample products',
      status: 'active',
      publishedAt: new Date(),
    },
  });

  console.log('✓ Created 3 stores');

  // ============================================================================
  // Create Products
  // ============================================================================

  const product1 = await prisma.product.create({
    data: {
      storeId: store1.id,
      title: 'Advanced TypeScript Course',
      slug: 'advanced-typescript-course',
      description: '# Learn Advanced TypeScript\n\nMaster TypeScript generics, decorators, and more.',
      category: 'COURSE',
      price: 4900000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  const product2 = await prisma.product.create({
    data: {
      storeId: store1.id,
      title: 'React Component Library',
      slug: 'react-component-library',
      description: '# Professional React Components\n\n50+ production-ready components.',
      category: 'SOFTWARE',
      price: 9900000000n,
      downloadLimit: '3',
      status: 'active',
    },
  });

  const product3 = await prisma.product.create({
    data: {
      storeId: store1.id,
      title: 'Node.js Performance Guide',
      slug: 'nodejs-performance-guide',
      description: '# Optimize Your Node.js Applications\n\nLearn best practices and optimization techniques.',
      category: 'EBOOK',
      price: 2900000000n,
      downloadLimit: '1',
      status: 'active',
    },
  });

  const product4 = await prisma.product.create({
    data: {
      storeId: store2.id,
      title: 'Digital Art Brushes Pack',
      slug: 'digital-art-brushes',
      description: '# 200+ Professional Brushes\n\nFor Photoshop and Procreate.',
      category: 'ART',
      price: 1900000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  const product5 = await prisma.product.create({
    data: {
      storeId: store2.id,
      title: 'Web Design eBook',
      slug: 'web-design-ebook',
      description: '# Modern Web Design Principles\n\nComprehensive guide to designing beautiful websites.',
      category: 'EBOOK',
      price: 1500000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  const product6 = await prisma.product.create({
    data: {
      storeId: store2.id,
      title: 'UI/UX Masterclass',
      slug: 'uiux-masterclass',
      description: '# Complete UI/UX Course\n\nFrom wireframes to polished interfaces.',
      category: 'COURSE',
      price: 5900000000n,
      downloadLimit: '3',
      status: 'active',
    },
  });

  const product7 = await prisma.product.create({
    data: {
      storeId: store3.id,
      title: 'MoonBite Integration Guide',
      slug: 'moonbite-integration-guide',
      description: '# Complete MoonBite Integration Guide\n\nLearn how to integrate MoonBite payments into your app.',
      category: 'EBOOK',
      price: 999000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  const product8 = await prisma.product.create({
    data: {
      storeId: store3.id,
      title: 'Crypto Payment Essentials',
      slug: 'crypto-payment-essentials',
      description: '# Crypto Payment Essentials\n\nUnderstand blockchain payments and crypto transactions.',
      category: 'COURSE',
      price: 2499000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  const product9 = await prisma.product.create({
    data: {
      storeId: store3.id,
      title: 'MoonBite API Reference',
      slug: 'moonbite-api-reference',
      description: '# Complete API Reference\n\nDetailed documentation for all MoonBite API endpoints.',
      category: 'SOFTWARE',
      price: 499000000n,
      downloadLimit: 'UNLIMITED',
      status: 'active',
    },
  });

  console.log('✓ Created 9 products');

  // ============================================================================
  // Create Transactions (various states for testing)
  // ============================================================================

  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const transactions = await prisma.transaction.createMany({
    data: [
      {
        productId: product1.id,
        storeId: store1.id,
        amount: 4900000000n,
        expectedAmount: 4900000000n,
        platformFeeAmount: 98000000n,
        merchantAmount: 4802000000n,
        depositAddress: 'DepositorAddress1234567890ab',
        txHash: 'a'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product2.id,
        storeId: store1.id,
        amount: 9900000000n,
        expectedAmount: 9900000000n,
        platformFeeAmount: 198000000n,
        merchantAmount: 9702000000n,
        depositAddress: 'DepositorAddress2234567890ab',
        txHash: 'b'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product3.id,
        storeId: store1.id,
        amount: 2800000000n,
        expectedAmount: 2900000000n,
        platformFeeAmount: 58000000n,
        merchantAmount: 2842000000n,
        depositAddress: 'DepositorAddress3234567890ab',
        txHash: 'c'.repeat(64),
        status: 'underpaid',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product4.id,
        storeId: store2.id,
        amount: 1900000000n,
        expectedAmount: 1900000000n,
        platformFeeAmount: 38000000n,
        merchantAmount: 1862000000n,
        depositAddress: 'DepositorAddress4234567890ab',
        txHash: null,
        status: 'pending',
        confirmedAt: null,
        confirmationCount: 0,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      },
      {
        productId: product5.id,
        storeId: store2.id,
        amount: 1500000000n,
        expectedAmount: 1500000000n,
        platformFeeAmount: 30000000n,
        merchantAmount: 1470000000n,
        depositAddress: 'DepositorAddress5234567890ab',
        txHash: null,
        status: 'pending',
        confirmedAt: null,
        confirmationCount: 0,
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000),
      },
      {
        productId: product6.id,
        storeId: store2.id,
        amount: 5900000000n,
        expectedAmount: 5900000000n,
        platformFeeAmount: 118000000n,
        merchantAmount: 5782000000n,
        depositAddress: 'DepositorAddress6234567890ab',
        txHash: 'd'.repeat(64),
        status: 'late',
        confirmedAt: fifteenMinutesAgo,
        confirmationCount: 2,
        expiresAt: fifteenMinutesAgo,
      },
      {
        productId: product7.id,
        storeId: store3.id,
        amount: 999000000n,
        expectedAmount: 999000000n,
        platformFeeAmount: 19980000n,
        merchantAmount: 979020000n,
        depositAddress: 'DepositorAddress7234567890ab',
        txHash: 'e'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product8.id,
        storeId: store3.id,
        amount: 2499000000n,
        expectedAmount: 2499000000n,
        platformFeeAmount: 49980000n,
        merchantAmount: 2449020000n,
        depositAddress: 'DepositorAddress8234567890ab',
        txHash: 'f'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product9.id,
        storeId: store3.id,
        amount: 499000000n,
        expectedAmount: 499000000n,
        platformFeeAmount: 9980000n,
        merchantAmount: 489020000n,
        depositAddress: 'DepositorAddress9234567890ab',
        txHash: '1'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: product1.id,
        storeId: store1.id,
        amount: 5000000000n,
        expectedAmount: 4900000000n,
        platformFeeAmount: 98000000n,
        merchantAmount: 4902000000n,
        depositAddress: 'DepositorAddress0234567890ab',
        txHash: '2'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
    ],
  });

  console.log('✓ Created 10 transactions with various states');

  // ============================================================================
  // Create API Keys for Testing
  // ============================================================================

  const apiKey1 = await prisma.apiKey.create({
    data: {
      merchantId: merchant1.id,
      publicKey: 'pk_live_alice_test_key_123456',
      secretKeyHash: generateSimpleHash('sk_live_alice_secret_123456'),
      lastUsedAt: new Date(),
    },
  });

  const apiKey2 = await prisma.apiKey.create({
    data: {
      merchantId: merchant2.id,
      publicKey: 'pk_live_bob_test_key_789012',
      secretKeyHash: generateSimpleHash('sk_live_bob_secret_789012'),
      lastUsedAt: new Date(),
    },
  });

  console.log('✓ Created 2 API keys');

  // ============================================================================
  // Create Webhooks for Testing
  // ============================================================================

  const webhook1 = await prisma.webhook.create({
    data: {
      merchantId: merchant1.id,
      url: 'https://example.com/webhooks/payment',
      events: ['payment.received', 'file.downloaded'],
      status: 'active',
      secret: crypto.randomBytes(32).toString('hex'),
    },
  });

  const webhook2 = await prisma.webhook.create({
    data: {
      merchantId: merchant2.id,
      url: 'https://creative.example.com/hooks',
      events: ['payout.completed'],
      status: 'active',
      secret: crypto.randomBytes(32).toString('hex'),
    },
  });

  console.log('✓ Created 2 webhooks');

  // ============================================================================
  // Create Coupons
  // ============================================================================

  const coupon1 = await prisma.coupon.create({
    data: {
      storeId: store1.id,
      code: 'SAVE20',
      type: 'percent',
      value: 20n,
      usageLimit: 100,
      usageCount: 5,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  const coupon2 = await prisma.coupon.create({
    data: {
      storeId: store2.id,
      code: 'WELCOME10',
      type: 'fixed',
      value: 1000000000n, // 10 MBITE fixed discount
      usageLimit: null,
      usageCount: 0,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  });

  console.log('✓ Created 2 coupons');

  // ============================================================================
  // Summary
  // ============================================================================

  console.log('\n📊 Database seeding complete!');
  console.log(`\n✅ Created Data:`);
  console.log(`   - 3 merchants`);
  console.log(`   - 3 stores`);
  console.log(`   - 9 products`);
  console.log(`   - 10 transactions (various payment states)`);
  console.log(`   - 2 API keys`);
  console.log(`   - 2 webhooks`);
  console.log(`   - 2 coupons`);

  console.log(`\n🔑 Demo Merchant Accounts:`);
  console.log(`\n   1. Alice's Store (Digital Dreams)`);
  console.log(`      Email: alice@example.com`);
  console.log(`      Password: DemoPassword123!`);
  console.log(`      Store: digital-dreams`);
  console.log(`      Products: TypeScript Course, React Library, Node.js Guide`);

  console.log(`\n   2. Bob's Store (Creative Marketplace)`);
  console.log(`      Email: bob@example.com`);
  console.log(`      Password: DemoPassword456!`);
  console.log(`      Store: creative-marketplace`);
  console.log(`      Products: Art Brushes, Web Design eBook, UI/UX Course`);

  console.log(`\n   3. Admin Demo Store (MoonBite)`);
  console.log(`      Email: admin@moonbite.demo`);
  console.log(`      Password: AdminDemo789!`);
  console.log(`      Store: moonbite-demo`);
  console.log(`      Products: Integration Guide, Crypto Essentials, API Reference`);

  console.log(`\n📝 API Keys for Testing:`);
  console.log(`   - pk_live_alice_test_key_123456`);
  console.log(`   - pk_live_bob_test_key_789012`);

  console.log(`\n💬 Test Webhook URLs (configure your endpoints):`);
  console.log(`   - alice@example.com: https://example.com/webhooks/payment`);
  console.log(`   - bob@example.com: https://creative.example.com/hooks`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
