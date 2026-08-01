/**
 * Prisma Seed Script
 * Creates test merchants, stores, products, and transactions for development
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

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
      email: 'alice@example.com',
      passwordHash: await bcrypt.hash('securepassword123', 12),
      name: 'Alice Smith',
      avatarUrl: null,
      payoutWallet: 'MerchantWallet1Address26characters',
      payoutWalletValidated: true,
      emailVerified: true,
    },
  });

  const merchant2 = await prisma.merchant.create({
    data: {
      email: 'bob@example.com',
      passwordHash: await bcrypt.hash('securepassword456', 12),
      name: 'Bob Johnson',
      avatarUrl: null,
      payoutWallet: 'MerchantWallet2Address26characters',
      payoutWalletValidated: true,
      emailVerified: true,
    },
  });

  console.log('✓ Created 2 merchants');

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

  console.log('✓ Created 2 stores');

  // ============================================================================
  // Create Products
  // ============================================================================

  const products = await prisma.product.createMany({
    data: [
      {
        storeId: store1.id,
        title: 'Advanced TypeScript Course',
        slug: 'advanced-typescript-course',
        description: '# Learn Advanced TypeScript\n\nMaster TypeScript generics, decorators, and more.',
        category: 'COURSE',
        price: 4900000000n, // 49 MBITE
        downloadLimit: 'UNLIMITED',
        status: 'active',
      },
      {
        storeId: store1.id,
        title: 'React Component Library',
        slug: 'react-component-library',
        description: '# Professional React Components\n\n50+ production-ready components.',
        category: 'SOFTWARE',
        price: 9900000000n, // 99 MBITE
        downloadLimit: '3',
        status: 'active',
      },
      {
        storeId: store1.id,
        title: 'Node.js Performance Guide',
        slug: 'nodejs-performance-guide',
        description: '# Optimize Your Node.js Applications\n\nLearn best practices and optimization techniques.',
        category: 'EBOOK',
        price: 2900000000n, // 29 MBITE
        downloadLimit: '1',
        status: 'active',
      },
      {
        storeId: store2.id,
        title: 'Digital Art Brushes Pack',
        slug: 'digital-art-brushes',
        description: '# 200+ Professional Brushes\n\nFor Photoshop and Procreate.',
        category: 'ART',
        price: 1900000000n, // 19 MBITE
        downloadLimit: 'UNLIMITED',
        status: 'active',
      },
      {
        storeId: store2.id,
        title: 'Web Design eBook',
        slug: 'web-design-ebook',
        description: '# Modern Web Design Principles\n\nComprehensive guide to designing beautiful websites.',
        category: 'EBOOK',
        price: 1500000000n, // 15 MBITE
        downloadLimit: 'UNLIMITED',
        status: 'active',
      },
      {
        storeId: store2.id,
        title: 'UI/UX Masterclass',
        slug: 'uiux-masterclass',
        description: '# Complete UI/UX Course\n\nFrom wireframes to polished interfaces.',
        category: 'COURSE',
        price: 5900000000n, // 59 MBITE
        downloadLimit: '3',
        status: 'active',
      },
    ],
  });

  console.log('✓ Created 6 products');

  // ============================================================================
  // Create Transactions (various states for testing)
  // ============================================================================

  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  const transactions = await prisma.transaction.createMany({
    data: [
      {
        productId: products[0],
        storeId: store1.id,
        amount: 4900000000n,
        expectedAmount: 4900000000n,
        platformFeeAmount: 98000000n, // 2% of 4900
        merchantAmount: 4802000000n,
        depositAddress: 'DepositorAddress1234567890ab',
        txHash: 'a'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: products[1],
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
        productId: products[2],
        storeId: store1.id,
        amount: 2800000000n,
        expectedAmount: 2900000000n,
        platformFeeAmount: 58000000n,
        merchantAmount: 2842000000n,
        depositAddress: 'DepositorAddress3234567890ab',
        txHash: 'c'.repeat(64),
        status: 'underpaid', // Underpaid by 100000000 (1 MBITE)
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: products[3],
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
        expiresAt: new Date(now.getTime() + 15 * 60 * 1000), // 15 minutes from now
      },
      {
        productId: products[4],
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
        productId: products[5],
        storeId: store2.id,
        amount: 5900000000n,
        expectedAmount: 5900000000n,
        platformFeeAmount: 118000000n,
        merchantAmount: 5782000000n,
        depositAddress: 'DepositorAddress6234567890ab',
        txHash: 'd'.repeat(64),
        status: 'late', // Payment received after expiry
        confirmedAt: fifteenMinutesAgo,
        confirmationCount: 2,
        expiresAt: fifteenMinutesAgo, // Expired 15 minutes ago
      },
      {
        productId: products[0],
        storeId: store1.id,
        amount: 5000000000n, // Overpaid by 100000000 (1 MBITE)
        expectedAmount: 4900000000n,
        platformFeeAmount: 98000000n,
        merchantAmount: 4902000000n,
        depositAddress: 'DepositorAddress7234567890ab',
        txHash: 'e'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: products[1],
        storeId: store1.id,
        amount: 9900000000n,
        expectedAmount: 9900000000n,
        platformFeeAmount: 198000000n,
        merchantAmount: 9702000000n,
        depositAddress: 'DepositorAddress8234567890ab',
        txHash: 'f'.repeat(64),
        status: 'reverted', // Chain reorg reverted this payment
        confirmedAt: new Date(now.getTime() - 1000 * 60 * 60),
        confirmationCount: 0,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: products[2],
        storeId: store1.id,
        amount: 2900000000n,
        expectedAmount: 2900000000n,
        platformFeeAmount: 58000000n,
        merchantAmount: 2842000000n,
        depositAddress: 'DepositorAddress9234567890ab',
        txHash: '1'.repeat(64),
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmationCount: 5,
        expiresAt: new Date(now.getTime() + 1000 * 60 * 60),
      },
      {
        productId: products[3],
        storeId: store2.id,
        amount: 1900000000n,
        expectedAmount: 1900000000n,
        platformFeeAmount: 38000000n,
        merchantAmount: 1862000000n,
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
  // Summary
  // ============================================================================

  console.log('\n📊 Database seeding complete!');
  console.log(`   - 2 merchants`);
  console.log(`   - 2 stores`);
  console.log(`   - 6 products`);
  console.log(`   - 10 transactions`);
  console.log(`\nTest accounts:`);
  console.log(`   - alice@example.com / securepassword123`);
  console.log(`   - bob@example.com / securepassword456`);
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
