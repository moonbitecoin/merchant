
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.MerchantScalarFieldEnum = {
  id: 'id',
  email: 'email',
  passwordHash: 'passwordHash',
  name: 'name',
  avatarUrl: 'avatarUrl',
  payoutWallet: 'payoutWallet',
  payoutWalletValidated: 'payoutWalletValidated',
  totpSecret: 'totpSecret',
  totpEnabled: 'totpEnabled',
  emailVerified: 'emailVerified',
  emailVerificationToken: 'emailVerificationToken',
  emailVerificationExpiresAt: 'emailVerificationExpiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.StoreScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  name: 'name',
  slug: 'slug',
  description: 'description',
  logoUrl: 'logoUrl',
  status: 'status',
  publishedAt: 'publishedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  title: 'title',
  slug: 'slug',
  description: 'description',
  category: 'category',
  price: 'price',
  downloadLimit: 'downloadLimit',
  expiryDate: 'expiryDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.ProductFileScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  filename: 'filename',
  mimetype: 'mimetype',
  size: 'size',
  sha256Hash: 'sha256Hash',
  minioPath: 'minioPath',
  encryptionKey: 'encryptionKey',
  iv: 'iv',
  tag: 'tag',
  createdAt: 'createdAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  storeId: 'storeId',
  amount: 'amount',
  expectedAmount: 'expectedAmount',
  platformFeeAmount: 'platformFeeAmount',
  merchantAmount: 'merchantAmount',
  depositAddress: 'depositAddress',
  txHash: 'txHash',
  confirmedAt: 'confirmedAt',
  confirmationCount: 'confirmationCount',
  status: 'status',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DownloadScalarFieldEnum = {
  id: 'id',
  transactionId: 'transactionId',
  productFileId: 'productFileId',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  downloadedAt: 'downloadedAt',
  createdAt: 'createdAt'
};

exports.Prisma.PayoutScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  amount: 'amount',
  status: 'status',
  txHash: 'txHash',
  requestedAt: 'requestedAt',
  processedAt: 'processedAt',
  failureReason: 'failureReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.APIKeyScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  publicKey: 'publicKey',
  secretKeyHash: 'secretKeyHash',
  lastUsedAt: 'lastUsedAt',
  createdAt: 'createdAt',
  revokedAt: 'revokedAt'
};

exports.Prisma.WebhookScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  url: 'url',
  events: 'events',
  status: 'status',
  secret: 'secret',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookDeliveryScalarFieldEnum = {
  id: 'id',
  webhookId: 'webhookId',
  event: 'event',
  payload: 'payload',
  statusCode: 'statusCode',
  response: 'response',
  retryCount: 'retryCount',
  nextRetryAt: 'nextRetryAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt'
};

exports.Prisma.CouponScalarFieldEnum = {
  id: 'id',
  storeId: 'storeId',
  code: 'code',
  type: 'type',
  value: 'value',
  usageLimit: 'usageLimit',
  usageCount: 'usageCount',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.CouponProductScalarFieldEnum = {
  couponId: 'couponId',
  productId: 'productId'
};

exports.Prisma.ReviewScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  transactionId: 'transactionId',
  rating: 'rating',
  text: 'text',
  merchantReply: 'merchantReply',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AffiliateScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  storeId: 'storeId',
  email: 'email',
  commissionPercent: 'commissionPercent',
  affiliateWallet: 'affiliateWallet',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt'
};

exports.Prisma.AffiliateEarningScalarFieldEnum = {
  id: 'id',
  affiliateId: 'affiliateId',
  transactionId: 'transactionId',
  amount: 'amount',
  createdAt: 'createdAt'
};

exports.Prisma.SubscriptionScalarFieldEnum = {
  id: 'id',
  productId: 'productId',
  transactionId: 'transactionId',
  buyerEmail: 'buyerEmail',
  billingCycle: 'billingCycle',
  amount: 'amount',
  status: 'status',
  currentPeriodStart: 'currentPeriodStart',
  currentPeriodEnd: 'currentPeriodEnd',
  cancelledAt: 'cancelledAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  merchantId: 'merchantId',
  action: 'action',
  resourceType: 'resourceType',
  resourceId: 'resourceId',
  changes: 'changes',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  createdAt: 'createdAt'
};

exports.Prisma.IdempotencyKeyScalarFieldEnum = {
  key: 'key',
  merchantId: 'merchantId',
  result: 'result',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Merchant: 'Merchant',
  Store: 'Store',
  Product: 'Product',
  ProductFile: 'ProductFile',
  Transaction: 'Transaction',
  Download: 'Download',
  Payout: 'Payout',
  APIKey: 'APIKey',
  Webhook: 'Webhook',
  WebhookDelivery: 'WebhookDelivery',
  Coupon: 'Coupon',
  CouponProduct: 'CouponProduct',
  Review: 'Review',
  Affiliate: 'Affiliate',
  AffiliateEarning: 'AffiliateEarning',
  Subscription: 'Subscription',
  AuditLog: 'AuditLog',
  IdempotencyKey: 'IdempotencyKey'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
