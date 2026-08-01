/**
 * Zod schemas for all API boundaries
 * Single source of truth for request/response validation
 */

import { z } from 'zod';

// ============================================================================
// Common Schemas
// ============================================================================

export const IDSchema = z.string().uuid().min(1);
export const MoneyBigIntSchema = z.bigint().nonnegative();
export const WalletAddressSchema = z.string().regex(/^[a-zA-Z0-9]{26,35}$/);
export const TxHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const HTTPSUrlSchema = z.string().url().startsWith('https://');

// ============================================================================
// Authentication Schemas
// ============================================================================

export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12).max(128),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  merchant: z.object({
    id: IDSchema,
    email: z.string().email(),
    name: z.string(),
  }),
});

export const RefreshTokenRequestSchema = z.object({
  refreshToken: z.string(),
});

export const VerifyEmailRequestSchema = z.object({
  token: z.string(),
});

// ============================================================================
// Store Schemas
// ============================================================================

export const CreateStoreRequestSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]{2,50}$/),
  description: z.string().max(500).optional(),
});

export const UpdateStoreRequestSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const StoreResponseSchema = z.object({
  id: IDSchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  logoUrl: z.string().url().nullable(),
  status: z.enum(['active', 'suspended', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Product Schemas
// ============================================================================

export const CreateProductRequestSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().regex(/^[a-z0-9-]{1,50}$/),
  description: z.string().max(5000),
  category: z.enum(['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER']),
  price: z.bigint().nonnegative(),
  downloadLimit: z.enum(['1', '3', 'UNLIMITED']),
  expiryDate: z.date().nullable().optional(),
});

export const UpdateProductRequestSchema = CreateProductRequestSchema.partial();

export const ProductResponseSchema = z.object({
  id: IDSchema,
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  category: z.enum(['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER']),
  price: z.bigint(),
  downloadLimit: z.enum(['1', '3', 'UNLIMITED']),
  expiryDate: z.date().nullable(),
  status: z.enum(['draft', 'active', 'archived']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const BulkImportProductsRequestSchema = z.object({
  products: z.array(
    z.object({
      title: z.string().min(1).max(200),
      slug: z.string().regex(/^[a-z0-9-]{1,50}$/),
      description: z.string().max(5000),
      category: z.enum(['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER']),
      price: z.string().regex(/^\d+$/), // will be converted to BigInt
      downloadLimit: z.enum(['1', '3', 'UNLIMITED']),
    })
  ),
});

// ============================================================================
// Payment & Checkout Schemas
// ============================================================================

export const CheckoutRequestSchema = z.object({
  productId: IDSchema,
  couponCode: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

export const CheckoutResponseSchema = z.object({
  transactionId: IDSchema,
  depositAddress: z.string(),
  amount: z.bigint(),
  qrCode: z.string(), // SVG as data URL
  expiresAt: z.date(),
});

export const MockPaymentRequestSchema = z.object({
  address: z.string(),
  amount: z.bigint().nonnegative(),
  txHash: TxHashSchema,
});

export const TransactionResponseSchema = z.object({
  id: IDSchema,
  amount: z.bigint(),
  expectedAmount: z.bigint(),
  status: z.enum(['pending', 'underpaid', 'confirmed', 'reverted', 'late', 'failed']),
  depositAddress: z.string(),
  txHash: z.string().nullable(),
  confirmedAt: z.date().nullable(),
  confirmationCount: z.number().nonnegative(),
  expiresAt: z.date(),
  createdAt: z.date(),
});

// ============================================================================
// Download Schemas
// ============================================================================

export const DownloadRequestSchema = z.object({
  transactionId: IDSchema,
  productFileId: IDSchema,
  signedUrl: z.string().url(),
});

export const DownloadResponseSchema = z.object({
  filename: z.string(),
  size: z.bigint(),
  contentType: z.string(),
});

// ============================================================================
// Payout Schemas
// ============================================================================

export const SetPayoutWalletRequestSchema = z.object({
  wallet: WalletAddressSchema,
});

export const RequestPayoutRequestSchema = z.object({
  amount: z.bigint().nonnegative(),
  totpCode: z.string().regex(/^\d{6}$/).optional(),
  idempotencyKey: z.string().uuid(),
});

export const PayoutResponseSchema = z.object({
  id: IDSchema,
  amount: z.bigint(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  txHash: z.string().nullable(),
  requestedAt: z.date(),
  processedAt: z.date().nullable(),
});

// ============================================================================
// API Key Schemas
// ============================================================================

export const CreateAPIKeyRequestSchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write'])).optional(),
});

export const APIKeyResponseSchema = z.object({
  id: IDSchema,
  publicKey: z.string(),
  secretKey: z.string().optional(), // Only on creation
  createdAt: z.date(),
});

// ============================================================================
// Webhook Schemas
// ============================================================================

export const CreateWebhookRequestSchema = z.object({
  url: HTTPSUrlSchema,
  events: z.array(z.enum(['payment.received', 'file.downloaded', 'payout.completed'])),
});

export const WebhookResponseSchema = z.object({
  id: IDSchema,
  url: z.string().url(),
  events: z.array(z.string()),
  status: z.enum(['active', 'disabled', 'deleted']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const WebhookPayloadSchema = z.object({
  event: z.string(),
  timestamp: z.date(),
  data: z.record(z.unknown()),
});

// ============================================================================
// Coupon Schemas
// ============================================================================

export const CreateCouponRequestSchema = z.object({
  code: z.string().regex(/^[A-Z0-9-]{3,20}$/),
  type: z.enum(['percent', 'fixed']),
  value: z.bigint().nonnegative(),
  usageLimit: z.number().nonnegative().optional(),
  expiresAt: z.date().optional(),
});

export const CouponResponseSchema = z.object({
  id: IDSchema,
  code: z.string(),
  type: z.enum(['percent', 'fixed']),
  value: z.bigint(),
  usageLimit: z.number().nullable(),
  usageCount: z.number(),
  expiresAt: z.date().nullable(),
});

// ============================================================================
// Review Schemas
// ============================================================================

export const CreateReviewRequestSchema = z.object({
  transactionId: IDSchema,
  rating: z.number().min(1).max(5),
  text: z.string().max(1000).optional(),
});

export const ReviewResponseSchema = z.object({
  id: IDSchema,
  productId: IDSchema,
  rating: z.number().min(1).max(5),
  text: z.string().nullable(),
  merchantReply: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ============================================================================
// Error Schemas (RFC 7807)
// ============================================================================

export const ProblemJsonSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(100).max(599),
  detail: z.string().optional(),
  instance: z.string().url().optional(),
  errors: z.record(z.array(z.string())).optional(),
});

// ============================================================================
// Pagination Schemas
// ============================================================================

export const PaginationQuerySchema = z.object({
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().nonnegative(),
  });

// ============================================================================
// Merchant Profile Schemas
// ============================================================================

export const UpdateMerchantProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

export const MerchantProfileResponseSchema = z.object({
  id: IDSchema,
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  payoutWallet: z.string().nullable(),
  payoutWalletValidated: z.boolean(),
  totpEnabled: z.boolean(),
  createdAt: z.date(),
});

// ============================================================================
// 2FA Schemas
// ============================================================================

export const Enable2FARequestSchema = z.object({
  password: z.string().min(1),
});

export const Enable2FAResponseSchema = z.object({
  secret: z.string(),
  qrCode: z.string(),
});

export const Confirm2FARequestSchema = z.object({
  secret: z.string(),
  code: z.string().regex(/^\d{6}$/),
});

export const Disable2FARequestSchema = z.object({
  password: z.string().min(1),
  code: z.string().regex(/^\d{6}$/),
});
