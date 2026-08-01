/**
 * E2E Test Helpers
 * Reusable utilities for Playwright tests
 */

import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'TestPassword123!',
};

export const TEST_STORE = {
  name: 'Test Store',
  slug: `test-store-${Date.now()}`,
};

export const TEST_PRODUCT = {
  title: 'Test E-Book',
  description: 'A great e-book for testing',
  price: '1000000000', // 10 MBITE in smallest units
  category: 'ebook',
  downloadLimit: '3',
};

export const TEST_COUPON = {
  code: `TEST${Math.random().toString().slice(2, 6)}`,
  discountType: 'percentage',
  discountValue: '20',
  maxUsage: 10,
};

/**
 * Register new merchant account
 */
export async function registerMerchant(page: Page) {
  await page.goto('/auth/register');
  await page.fill('input[name="email"]', TEST_USER.email);
  await page.fill('input[name="password"]', TEST_USER.password);
  await page.fill('input[name="confirmPassword"]', TEST_USER.password);

  await page.click('button:has-text("Sign Up")');

  // Wait for success or redirect
  await page.waitForURL(/\/auth\/login|\/dashboard/);
}

/**
 * Login to merchant account
 */
export async function loginMerchant(page: Page, email?: string, password?: string) {
  await page.goto('/auth/login');
  await page.fill('input[name="email"]', email || TEST_USER.email);
  await page.fill('input[name="password"]', password || TEST_USER.password);

  await page.click('button:has-text("Log In")');

  // Wait for dashboard
  await page.waitForURL('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);
}

/**
 * Verify email (simulated - in real test would use email service)
 */
export async function verifyEmail(page: Page) {
  // In CI, set a mock verification flag
  if (process.env.CI) {
    // TODO: Call API to mark email as verified
    // await page.request.post(`/api/v1/auth/verify-email`, {
    //   data: { token: 'mock-token' }
    // });
  }
}

/**
 * Create test store
 */
export async function createStore(page: Page, store = TEST_STORE) {
  await page.goto('/dashboard');
  await page.click('a:has-text("Stores")');
  await page.click('button:has-text("New Store")');

  // Fill form (adjust selectors based on actual HTML)
  await page.fill('input[name="name"]', store.name);
  await page.fill('input[name="slug"]', store.slug);

  await page.click('button:has-text("Create Store")');

  // Wait for success
  await page.waitForURL(/\/dashboard\/stores/);
  await expect(page.locator(`text=${store.name}`)).toBeVisible();
}

/**
 * Create test product
 */
export async function createProduct(page: Page, product = TEST_PRODUCT) {
  await page.goto('/dashboard');
  await page.click('a:has-text("Products")');
  await page.click('button:has-text("New Product")');

  // Fill form
  await page.fill('input[name="title"]', product.title);
  await page.fill('textarea[name="description"]', product.description);
  await page.fill('input[name="price"]', product.price);
  await page.selectOption('select[name="category"]', product.category);
  await page.selectOption('select[name="downloadLimit"]', product.downloadLimit);

  await page.click('button:has-text("Create Product")');

  // Wait for success
  await page.waitForURL(/\/dashboard\/products/);
  await expect(page.locator(`text=${product.title}`)).toBeVisible();

  // Extract product ID from URL or page
  const productId = new URL(page.url()).pathname.split('/').pop();
  return productId;
}

/**
 * Upload product file
 */
export async function uploadProductFile(page: Page, productId: string, filePath: string) {
  await page.goto(`/dashboard/products/${productId}`);

  // Upload file
  await page.locator('input[type="file"]').setInputFiles(filePath);

  // Wait for upload
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=File uploaded successfully')).toBeVisible();
}

/**
 * Publish product
 */
export async function publishProduct(page: Page, productId: string) {
  await page.goto(`/dashboard/products/${productId}`);
  await page.click('button:has-text("Publish")');

  // Wait for success
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=Published')).toBeVisible();
}

/**
 * Create coupon
 */
export async function createCoupon(page: Page, coupon = TEST_COUPON) {
  await page.goto('/dashboard/coupons');

  await page.fill('input[name="code"]', coupon.code);
  await page.selectOption('select[name="discountType"]', coupon.discountType);
  await page.fill('input[name="discountValue"]', coupon.discountValue);
  await page.fill('input[name="maxUsage"]', coupon.maxUsage.toString());

  await page.click('button:has-text("Create Coupon")');

  // Wait for success
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`text=${coupon.code}`)).toBeVisible();
}

/**
 * Buy product as customer
 */
export async function buyProduct(
  page: Page,
  productId: string,
  couponCode?: string
) {
  await page.goto(`/products/${productId}`);

  // Click buy button
  await page.click('button:has-text("Buy Now")');

  // Enter coupon if provided
  if (couponCode) {
    await page.fill('input[name="couponCode"]', couponCode);
  }

  await page.click('button:has-text("Continue to Payment")');

  // Wait for checkout modal
  await expect(page.locator('text=Scan to pay')).toBeVisible();

  return {
    depositAddress: await page.inputValue('input[readonly]'),
    qrCode: await page.locator('img[alt="QR Code"]').getAttribute('src'),
  };
}

/**
 * Simulate payment (for testing)
 */
export async function simulatePayment(
  page: Page,
  depositAddress: string,
  amount: string = TEST_PRODUCT.price
) {
  // Call dev endpoint to simulate payment
  const response = await page.request.post('/api/v1/dev/mock-payment', {
    data: {
      address: depositAddress,
      amount,
      txHash: `0x${Math.random().toString(16).slice(2)}`,
    },
  });

  return response.json();
}

/**
 * Wait for payment confirmation
 */
export async function waitForPaymentConfirmation(page: Page, timeout = 30000) {
  // Poll for "Payment confirmed" message
  await expect(page.locator('text=Payment Successful')).toBeVisible({ timeout });

  // Extract download URL
  const downloadButton = page.locator('a:has-text("Download")');
  const downloadUrl = await downloadButton.getAttribute('href');

  return downloadUrl;
}

/**
 * Submit review
 */
export async function submitReview(page: Page, review: {
  rating: number;
  name: string;
  comment: string;
}) {
  await page.click('button:has-text("Write a Review")');

  // Set rating
  for (let i = 0; i < review.rating; i++) {
    await page.click(`button.star:nth-child(${i + 1})`);
  }

  // Fill form
  await page.fill('input[name="customerName"]', review.name);
  await page.fill('textarea[name="comment"]', review.comment);

  await page.click('button:has-text("Post Review")');

  // Wait for success
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`text=${review.name}`)).toBeVisible();
}

/**
 * Check dashboard metrics
 */
export async function checkDashboardMetrics(page: Page) {
  await page.goto('/dashboard');

  const metrics = {
    totalRevenue: await page.textContent('[data-metric="revenue"]'),
    checkouts: await page.textContent('[data-metric="checkouts"]'),
    conversion: await page.textContent('[data-metric="conversion"]'),
  };

  return metrics;
}

/**
 * Create test file for upload
 */
export async function createTestFile(path: string, content = 'Test file content') {
  const fs = await import('fs').then(m => m.promises);
  await fs.writeFile(path, content);
  return path;
}

/**
 * Cleanup test data
 */
export async function cleanup(page: Page) {
  // Optional: Clear test data from database
  if (process.env.CI) {
    // Call cleanup endpoint if available
    try {
      await page.request.post('/api/v1/dev/cleanup', {
        data: { email: TEST_USER.email },
      });
    } catch (e) {
      console.error('Cleanup failed:', e);
    }
  }
}
