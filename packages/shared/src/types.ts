/**
 * Core domain types for MoonBite Merchant Hub
 * These represent the immutable, single-source-of-truth types across all apps
 */

// IDs: Always UUIDv7, never exposed as sequential numbers
export type ID = string & { readonly __id: unique symbol };
export type MerchantID = ID;
export type StoreID = ID;
export type ProductID = ID;
export type ProductFileID = ID;
export type TransactionID = ID;
export type DownloadID = ID;
export type PayoutID = ID;
export type APIKeyID = ID;
export type WebhookID = ID;
export type WebhookDeliveryID = ID;
export type CouponID = ID;
export type ReviewID = ID;
export type AffiliateID = ID;
export type AffiliateEarningID = ID;
export type SubscriptionID = ID;
export type AuditLogID = ID;

// Money: ALWAYS BigInt in smallest unit (1 MBITE = 10^8 units)
export type MoneyBigInt = bigint & { readonly __money: unique symbol };

// Authentication & Authorization
export type JWTPayload = {
  sub: MerchantID;
  iat: number;
  exp: number;
  aud: 'merchant';
  type: 'access' | 'refresh';
};

// Merchant & Store
export type MerchantRole = 'admin' | 'operator';
export type StoreStatus = 'active' | 'suspended' | 'archived';

export type Merchant = {
  id: MerchantID;
  email: string;
  passwordHash: string;
  name: string;
  avatarUrl: string | null;
  payoutWallet: string | null;
  payoutWalletValidated: boolean;
  totpSecret: string | null;
  totpEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type Store = {
  id: StoreID;
  merchantId: MerchantID;
  name: string;
  slug: string; // unique
  description: string | null;
  logoUrl: string | null;
  status: StoreStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// Products
export type ProductCategory = 'SOFTWARE' | 'EBOOK' | 'ART' | 'COURSE' | 'OTHER';
export type DownloadLimitType = '1' | '3' | 'UNLIMITED';
export type ProductStatus = 'draft' | 'active' | 'archived';

export type Product = {
  id: ProductID;
  storeId: StoreID;
  title: string;
  slug: string;
  description: string; // markdown
  category: ProductCategory;
  price: MoneyBigInt; // in smallest MBITE unit
  downloadLimit: DownloadLimitType;
  expiryDate: Date | null;
  status: ProductStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type ProductFile = {
  id: ProductFileID;
  productId: ProductID;
  filename: string;
  mimetype: string;
  size: bigint; // in bytes
  sha256Hash: string;
  minioPath: string;
  encryptionKey: string; // base64, wrapped with master key
  iv: string; // base64
  tag: string; // base64, AES-256-GCM auth tag
  createdAt: Date;
};

// Transactions & Payments
export type TransactionStatus =
  | 'pending'
  | 'underpaid'
  | 'confirmed'
  | 'reverted'
  | 'late'
  | 'failed';

export type Transaction = {
  id: TransactionID;
  productId: ProductID;
  storeId: StoreID;
  amount: MoneyBigInt; // actual amount sent
  expectedAmount: MoneyBigInt; // expected amount
  platformFeeAmount: MoneyBigInt; // 2% of expected
  merchantAmount: MoneyBigInt; // merchant gets this
  depositAddress: string;
  txHash: string | null; // blockchain tx hash
  confirmedAt: Date | null;
  confirmationCount: number;
  status: TransactionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Download = {
  id: DownloadID;
  transactionId: TransactionID;
  productFileId: ProductFileID;
  ipAddress: string;
  userAgent: string | null;
  downloadedAt: Date;
  createdAt: Date;
};

// Payouts
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type Payout = {
  id: PayoutID;
  merchantId: MerchantID;
  amount: MoneyBigInt;
  status: PayoutStatus;
  txHash: string | null;
  requestedAt: Date;
  processedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

// API Keys
export type APIKey = {
  id: APIKeyID;
  merchantId: MerchantID;
  publicKey: string; // prefix: pk_live_ or pk_test_
  secretKeyHash: string; // hashed with Argon2id
  lastUsedAt: Date | null;
  createdAt: Date;
  revokedAt: Date | null;
};

// Webhooks
export type WebhookEvent = 'payment.received' | 'file.downloaded' | 'payout.completed';
export type WebhookStatus = 'active' | 'disabled' | 'deleted';

export type Webhook = {
  id: WebhookID;
  merchantId: MerchantID;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  secret: string; // for HMAC signing
  createdAt: Date;
  updatedAt: Date;
};

export type WebhookDelivery = {
  id: WebhookDeliveryID;
  webhookId: WebhookID;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  statusCode: number | null;
  response: string | null;
  retryCount: number;
  nextRetryAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
};

// Coupons
export type CouponType = 'percent' | 'fixed';

export type Coupon = {
  id: CouponID;
  storeId: StoreID;
  code: string; // unique per store
  type: CouponType;
  value: bigint; // percent (0-100) or fixed amount
  usageLimit: number | null;
  usageCount: number;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// Reviews
export type Review = {
  id: ReviewID;
  productId: ProductID;
  transactionId: TransactionID;
  rating: 1 | 2 | 3 | 4 | 5;
  text: string | null;
  merchantReply: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

// Affiliates
export type Affiliate = {
  id: AffiliateID;
  merchantId: MerchantID;
  storeId: StoreID;
  email: string;
  commissionPercent: number; // 0-100
  affiliateWallet: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type AffiliateEarning = {
  id: AffiliateEarningID;
  affiliateId: AffiliateID;
  transactionId: TransactionID;
  amount: MoneyBigInt;
  createdAt: Date;
};

// Subscriptions
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';
export type SubscriptionBillingCycle = 'monthly' | 'quarterly' | 'yearly';

export type Subscription = {
  id: SubscriptionID;
  productId: ProductID;
  buyerEmail: string;
  billingCycle: SubscriptionBillingCycle;
  amount: MoneyBigInt;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Audit Logs
export type AuditLogAction =
  | 'merchant.login'
  | 'merchant.logout'
  | 'merchant.2fa_enable'
  | 'store.create'
  | 'store.update'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'api_key.create'
  | 'api_key.revoke'
  | 'payout.request'
  | 'wallet.update'
  | 'webhook.create'
  | 'webhook.update';

export type AuditLog = {
  id: AuditLogID;
  merchantId: MerchantID;
  action: AuditLogAction;
  resourceType: string;
  resourceId: string;
  changes: Record<string, unknown> | null;
  ipAddress: string;
  userAgent: string | null;
  createdAt: Date;
};
