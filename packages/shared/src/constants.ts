/**
 * Global constants and configuration
 */

// ============================================================================
// Money Constants (BigInt, smallest unit = 1 MBITE unit where 10^8 = 1 MBITE)
// ============================================================================

export const MBITE_DECIMAL_PLACES = 8n;
export const SMALLEST_UNIT_PER_MBITE = 10n ** MBITE_DECIMAL_PLACES;

// Platform fee in basis points (200 basis points = 2%)
export const PLATFORM_FEE_BASIS_POINTS = 200n;

// ============================================================================
// Payment Configuration
// ============================================================================

export const DEFAULT_CONFIRMATIONS_REQUIRED = 2;
export const CHECKOUT_EXPIRY_MINUTES = 15;
export const DOWNLOAD_URL_TTL_HOURS = 24;
export const DOWNLOAD_URL_TTL_MS = DOWNLOAD_URL_TTL_HOURS * 60 * 60 * 1000;
export const DOWNLOADS_PER_IP_PER_DAY = 5;

// ============================================================================
// Authentication Configuration
// ============================================================================

export const JWT_ALGORITHM = 'HS256';
export const JWT_EXPIRY_MINUTES = 15;
export const REFRESH_TOKEN_EXPIRY_DAYS = 7;
export const REFRESH_TOKEN_REUSE_DETECTION_ENABLED = true;

// ============================================================================
// Rate Limiting
// ============================================================================

export const RATE_LIMIT_AUTH_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_AUTH_MAX = 10; // 10 requests per minute
export const RATE_LIMIT_API_WINDOW_MS = 60 * 1000; // 1 minute
export const RATE_LIMIT_API_MAX = 100; // 100 requests per minute

// ============================================================================
// Webhook Configuration
// ============================================================================

export const WEBHOOK_RETRY_INTERVALS_MS = [1 * 60 * 1000, 5 * 60 * 1000, 30 * 60 * 1000, 2 * 60 * 60 * 1000]; // 1m, 5m, 30m, 2h
export const WEBHOOK_MAX_RETRIES = 5;
export const WEBHOOK_TIMEOUT_MS = 10 * 1000; // 10 seconds

// ============================================================================
// File Upload Configuration
// ============================================================================

export const MAX_FILE_SIZE_BYTES = 2n * 1024n * 1024n * 1024n; // 2 GB
export const UPLOAD_CHUNK_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB chunks
export const ALLOWED_MIMETYPES = [
  'application/x-msdownload', // .exe
  'application/x-msdos-program', // .com, .bat
  'application/zip', // .zip
  'application/x-rar-compressed', // .rar
  'application/x-7z-compressed', // .7z
  'application/pdf', // .pdf
  'application/epub+zip', // .epub
  'text/plain', // .txt
  'application/json', // .json
  'audio/mpeg', // .mp3
  'audio/wav', // .wav
  'video/mp4', // .mp4
  'video/mpeg', // .mpeg
  'image/jpeg', // .jpg
  'image/png', // .png
  'image/gif', // .gif
  'image/webp', // .webp
];

// ============================================================================
// Database Configuration
// ============================================================================

export const SOFT_DELETE_ENABLED = true;
export const AUDIT_LOG_ENABLED = true;

// ============================================================================
// Encryption Configuration
// ============================================================================

export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
export const ENCRYPTION_KEY_SIZE_BYTES = 32; // 256 bits
export const ENCRYPTION_IV_SIZE_BYTES = 12; // 96 bits for GCM
export const ENCRYPTION_AUTH_TAG_SIZE_BYTES = 16; // 128 bits

// ============================================================================
// Pagination
// ============================================================================

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// ============================================================================
// Product Categories
// ============================================================================

export const PRODUCT_CATEGORIES = ['SOFTWARE', 'EBOOK', 'ART', 'COURSE', 'OTHER'] as const;

// ============================================================================
// Download Limits
// ============================================================================

export const DOWNLOAD_LIMITS = ['1', '3', 'UNLIMITED'] as const;

// ============================================================================
// Store Validation
// ============================================================================

export const STORE_SLUG_MIN_LENGTH = 2;
export const STORE_SLUG_MAX_LENGTH = 50;
export const STORE_NAME_MIN_LENGTH = 2;
export const STORE_NAME_MAX_LENGTH = 100;

// ============================================================================
// Error Codes (RFC 7807)
// ============================================================================

export const ERROR_CODES = {
  // Authentication (400-401)
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  MFA_REQUIRED: 'MFA_REQUIRED',
  INVALID_MFA_CODE: 'INVALID_MFA_CODE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Validation (400)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_SLUG: 'DUPLICATE_SLUG',
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',

  // Not Found (404)
  NOT_FOUND: 'NOT_FOUND',
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  STORE_NOT_FOUND: 'STORE_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // Business Logic (400-409)
  DOWNLOAD_LIMIT_EXCEEDED: 'DOWNLOAD_LIMIT_EXCEEDED',
  IP_RATE_LIMIT_EXCEEDED: 'IP_RATE_LIMIT_EXCEEDED',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_USAGE_LIMIT_EXCEEDED: 'COUPON_USAGE_LIMIT_EXCEEDED',
  STORE_SUSPENDED: 'STORE_SUSPENDED',
  PRODUCT_NOT_ACTIVE: 'PRODUCT_NOT_ACTIVE',
  PRODUCT_EXPIRED: 'PRODUCT_EXPIRED',
  TRANSACTION_EXPIRED: 'TRANSACTION_EXPIRED',
  PAYMENT_ALREADY_RECEIVED: 'PAYMENT_ALREADY_RECEIVED',
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT',
  WALLET_NOT_SET: 'WALLET_NOT_SET',

  // Server (500)
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  ENCRYPTION_ERROR: 'ENCRYPTION_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  WEBHOOK_DELIVERY_FAILED: 'WEBHOOK_DELIVERY_FAILED',
} as const;

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Webhook Events
// ============================================================================

export const WEBHOOK_EVENTS = ['payment.received', 'file.downloaded', 'payout.completed'] as const;

// ============================================================================
// API Key Prefixes
// ============================================================================

export const API_KEY_PUBLIC_PREFIX_LIVE = 'pk_live_';
export const API_KEY_PUBLIC_PREFIX_TEST = 'pk_test_';
export const API_KEY_SECRET_PREFIX_LIVE = 'sk_live_';
export const API_KEY_SECRET_PREFIX_TEST = 'sk_test_';

// ============================================================================
// Environment
// ============================================================================

export const ENV_PROD = 'production';
export const ENV_STAGING = 'staging';
export const ENV_DEV = 'development';
export const ENV_TEST = 'test';
