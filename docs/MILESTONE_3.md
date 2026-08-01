# Milestone 3: Payments & Checkout (Critical Path)

## Overview

Milestone 3 implements the complete payment flow with idempotent payment matching, settlement logic, and webhook delivery. This is the most critical and complex milestone—**all money operations use BigInt only** and all 5 edge cases are tested.

## Implemented Endpoints

### Checkout (3 core + 8 webhook endpoints)

**Public (No Auth)**:
- `POST /api/v1/checkout` - Create checkout (get deposit address + QR code)
- `GET /api/v1/checkout/:id` - Poll checkout status
- `POST /api/v1/dev/mock-payment` - Simulate payment (dev only)

**Authenticated**:
- `GET /api/v1/transactions/:id` - Get transaction details

**Webhook Management** (Merchant):
- `POST /api/v1/webhooks` - Create webhook endpoint
- `GET /api/v1/webhooks` - List webhooks
- `PUT /api/v1/webhooks/:id` - Update webhook
- `DELETE /api/v1/webhooks/:id` - Delete webhook
- `GET /api/v1/webhooks/:id/deliveries` - Get delivery history

## Services

### CheckoutService
```typescript
createCheckout(merchantId, input)           // Create transaction + deposit address
getCheckoutStatus(transactionId)            // Poll status (pending→confirmed)
processPaymentConfirmation(...)             // Match payment to transaction
getDownloadURL(transactionId, ipAddress)    // Get signed download URL
getTransaction(transactionId, merchantId?)  // Get transaction details
```

### WebhookService
```typescript
createWebhook(merchantId, url, events)      // Register webhook endpoint
listWebhooks(merchantId)                    // List merchant's webhooks
updateWebhook(webhookId, merchantId, data)  // Update webhook
deleteWebhook(webhookId, merchantId)        // Delete webhook
fireWebhook(merchantId, event, data)        // Create delivery job
sendDelivery(deliveryId, url, sig, payload) // Send HTTP POST to webhook
retryDelivery(deliveryId)                   // Retry failed delivery
getDeliveryHistory(webhookId, merchantId)   // View delivery log
```

### PaymentMatcher (Tested, Existing)
```typescript
matchPayment(input, confirmationsRequired)  // Match payment to transaction
validateAmount(actual, expected)            // Check: exact/under/over
calculateSettlement(expectedAmount)         // Calculate fee + merchant amount
isTransactionExpired(expiresAt)             // Check expiry
```

## Payment Flow (Complete)

### 1. Customer Initiates Checkout

```
Customer clicks "Buy" on storefront
    ↓
POST /api/v1/checkout
{
  "productId": "uuid",
  "couponCode": "optional",
  "idempotencyKey": "uuid"  // Prevents duplicate charges
}
```

### 2. Server Creates Transaction

```
Checkout Service receives request
    ↓
Verify product:
  ✓ Exists and is active
  ✓ Store is active
  ✓ Not expired

Apply coupon (if provided):
  ✓ Validate coupon exists
  ✓ Check not expired
  ✓ Check usage limit
  ✓ Apply discount

Calculate final amount:
  amount = product.price - coupon_discount

Derive deposit address (HD wallet):
  index = current transaction count
  address = deriveDepositAddress(storeId, index)

Create transaction:
  {
    id: uuid,
    productId: uuid,
    storeId: uuid,
    depositAddress: derived,
    expectedAmount: amount (BigInt),
    status: 'pending',
    expiresAt: now + 15 minutes
  }

Generate QR code:
  data = depositAddress
  qrCode = QRCode.toDataURL(data)

Store idempotency key:
  [idempotencyKey → result (cached 24h)]

Return to customer:
  {
    transactionId,
    depositAddress,
    amount,
    qrCode,
    expiresAt,
    expiresIn (seconds)
  }
```

### 3. Customer Sends Payment

```
Customer scans QR code with wallet
  ↓
Sends expectedAmount to depositAddress
  ↓
Payment appears on blockchain
```

### 4. Payment Listener Detects Deposit

```
PaymentListener (MockChainAdapter in dev):
  ✓ watchAddress(depositAddress) is subscribed
  ✓ Detects payment: {
      txHash,
      toAddress: depositAddress,
      amount,
      timestamp,
      blockHeight
    }
  ↓
Call onDeposit callback
```

### 5. Payment Matching (IDEMPOTENT)

```
Backend receives payment event
  ↓
PaymentMatcher.matchPayment({
  txHash,
  toAddress: depositAddress,
  amount,
  timestamp,
  confirmations
}, confirmationsRequired=2)
  ↓
Find transaction by depositAddress
  ↓
CRITICAL CHECKS:
  1. Exact payment?     amount == expected → 'exact'
  2. Underpayment?      amount < expected → 'underpaid' (no delivery)
  3. Overpayment?       amount > expected → 'overpaid' (deliver, record surplus)
  4. Late payment?      timestamp > expiresAt → 'late' (flag review)
  5. Duplicate event?   txHash exists → return cached result (idempotent!)

Calculate settlement (if confirmed):
  platformFee = expectedAmount * 200 / 10000  (2% in basis points)
  merchantAmount = expectedAmount - platformFee

Return: { status, platformFee, merchantAmount }
```

### 6. Update Transaction Status

```
Update Transaction record:
  {
    status: 'confirmed' | 'underpaid' | 'late' | 'reverted',
    txHash: "abc123...",
    amount: actualAmount (BigInt),
    platformFeeAmount: calculated,
    merchantAmount: calculated,
    confirmationCount: confirmations,
    confirmedAt: now (if confirmed)
  }
```

### 7. If Confirmed: Fire Webhooks

```
For each webhook subscribed to 'payment.received':
  Create WebhookDelivery:
    {
      webhookId,
      event: 'payment.received',
      payload: {
        event: 'payment.received',
        timestamp: ISO8601,
        data: {
          transactionId,
          amount,
          merchantAmount,
          platformFeeAmount
        }
      },
      status: 'pending',
      nextRetryAt: now (deliver immediately)
    }

Sign payload:
    signature = HMAC-SHA256(payload, webhook.secret)

Queue for delivery (BullMQ in production):
    POST webhook.url
    Headers: {
      'Content-Type': 'application/json',
      'X-MoonBite-Signature': signature
    }
    Body: payload

Retry on failure:
    1m → 5m → 30m → 2h → dead-letter
```

### 8. Customer Gets Download Link

```
Customer polls checkout status:
  GET /api/v1/checkout/{transactionId}

Response (when confirmed):
  {
    status: 'confirmed',
    amount,
    txHash,
    confirmationCount,
    confirmedAt
  }

Frontend generates download URL:
  GET /api/v1/downloads/{transactionId}?sig=...

Server validates signature + transaction confirmed
  ↓
Generate signed URL (24h TTL, IP-bound):
  {
    url: "/api/v1/downloads/{id}?sig=hmac..."
  }

Send to customer via email + link
```

### 9. Customer Downloads File

```
GET /api/v1/downloads/{transactionId}?sig={signature}

Verify:
  ✓ Transaction confirmed
  ✓ Signature valid
  ✓ Not expired (24h)
  ✓ IP matches (IP-bound)
  ✓ Download count < limit

Decrypt file:
  ✓ Get encryptionKey (wrapped in master key)
  ✓ Get IV, tag from database
  ✓ Retrieve encrypted file from MinIO
  ✓ AES-256-GCM decrypt
  ✓ Stream plaintext to customer

Log download:
  {
    transactionId,
    ipAddress,
    downloadedAt,
    downloadCount: increment
  }

Fire webhook:
  event: 'file.downloaded'
  data: { transactionId, downloadCount }
```

## Data Models

### Transaction
```typescript
{
  id: UUID,
  productId: UUID,
  storeId: UUID,
  amount: BigInt,              // Actual amount received
  expectedAmount: BigInt,      // Expected from checkout
  platformFeeAmount: BigInt,   // 2% fee (calculated on confirm)
  merchantAmount: BigInt,      // expectedAmount - fee
  depositAddress: string,      // Unique, derived from HD wallet
  txHash: string,              // Blockchain tx hash (UNIQUE!)
  confirmedAt: Date,           // When payment confirmed
  confirmationCount: number,   // Blockchain confirmations
  status: 'pending' | 'underpaid' | 'confirmed' | 'reverted' | 'late' | 'failed',
  expiresAt: Date,             // 15 minute checkout TTL
  createdAt: Date,
  updatedAt: Date
}
```

### Webhook
```typescript
{
  id: UUID,
  merchantId: UUID,
  url: string,                 // HTTPS only
  events: string[],            // ['payment.received', 'file.downloaded', ...]
  secret: string,              // For signing payloads
  status: 'active' | 'disabled' | 'deleted',
  createdAt: Date
}
```

### WebhookDelivery
```typescript
{
  id: UUID,
  webhookId: UUID,
  event: string,               // Event type
  payload: JSON,               // Full webhook payload
  statusCode: number,          // HTTP response (if sent)
  response: string,            // Response body or error
  retryCount: number,          // Attempts made
  nextRetryAt: Date,           // When to retry
  completedAt: Date,           // If successful
  createdAt: Date
}
```

## All 5 Edge Cases (Tested)

### ✅ Edge Case 1: Exact Payment
- Customer sends expected amount
- Status: `confirmed`
- Merchant gets: expectedAmount - 2%
- Delivery: YES
- Test: `should confirm exact payment`

### ✅ Edge Case 2: Underpayment
- Customer sends 900 MBITE for 1000 MBITE product
- Status: `underpaid`
- Merchant gets: 0 MBITE
- Delivery: NO
- Flag: Manual review required
- Test: `should detect underpayment`

### ✅ Edge Case 3: Overpayment
- Customer sends 1100 MBITE for 1000 MBITE product
- Status: `confirmed`
- Merchant gets: 1000 - 2% = 980 MBITE (based on expected)
- Surplus: 100 MBITE (recorded for reconciliation)
- Delivery: YES
- Test: `should still deliver on overpayment`

### ✅ Edge Case 4: Late Payment
- Checkout expires at T+15min
- Payment arrives at T+20min
- Status: `late`
- Merchant gets: Settlement calculated, but flagged
- Delivery: NO (manual review)
- Test: `should flag late payment`

### ✅ Edge Case 5: Duplicate Events (Idempotency)
- Payment listener sees same txHash twice
- Second call is idempotent (no double-credit)
- Status: Returns cached result
- Unique constraint on txHash prevents duplicates
- Test: `should handle duplicate payment events`

## Money Math (Critical)

```typescript
// ALWAYS BigInt, NEVER float

const expectedAmount = 1000000000n; // 10 MBITE in smallest units

// Calculate fee (200 basis points = 2%)
const platformFee = (expectedAmount * 200n) / 10000n;
// = (10^9 * 200) / 10000
// = 20000000n (0.2 MBITE)

const merchantAmount = expectedAmount - platformFee;
// = 10^9 - 2*10^7
// = 980000000n (9.8 MBITE)

// Verify no money lost
assert(platformFee + merchantAmount === expectedAmount);
// 20000000 + 980000000 = 1000000000 ✓
```

## Development/Testing

### Mock Payment (Dev Only)

```bash
# Start checkout
curl -X POST http://localhost:3001/api/v1/checkout \
  -d '{"productId":"...","idempotencyKey":"..."}'

# Returns: { transactionId, depositAddress, ... }

# Simulate payment
curl -X POST http://localhost:3001/api/v1/dev/mock-payment \
  -d '{
    "address": "deposit_...",
    "amount": "1000000000",
    "txHash": "aaa...aaa"
  }'

# Returns: { status: "confirmed", confirmations: 2, ... }

# Check status
curl http://localhost:3001/api/v1/checkout/{transactionId}
# Returns: { status: "confirmed", txHash, confirmedAt, ... }
```

### Webhook Testing

```bash
# Create webhook
curl -X POST http://localhost:3001/api/v1/webhooks \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "url": "https://example.com/webhook",
    "events": ["payment.received", "file.downloaded"]
  }'

# List deliveries
curl http://localhost:3001/api/v1/webhooks/{id}/deliveries \
  -H "Authorization: Bearer $JWT"

# Retry failed delivery
curl -X POST http://localhost:3001/api/v1/webhooks/{id}/retry/{deliveryId} \
  -H "Authorization: Bearer $JWT"
```

## Unique Constraints (Idempotency)

```sql
-- Prevent duplicate payments for same txHash
ALTER TABLE transactions
ADD CONSTRAINT unique_tx_hash UNIQUE(tx_hash);

-- Prevent duplicate deposits to same address
ALTER TABLE transactions
ADD CONSTRAINT unique_deposit_address UNIQUE(deposit_address);
```

## Database Indexes

```sql
-- Fast lookups
CREATE INDEX transactions_deposit_address ON transactions(deposit_address);
CREATE INDEX transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX transactions_status ON transactions(status);
CREATE INDEX transactions_expires_at ON transactions(expires_at);

-- Webhook delivery retries
CREATE INDEX webhook_deliveries_next_retry ON webhook_deliveries(next_retry_at);
CREATE INDEX webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
```

## Error Codes

```
PRODUCT_NOT_FOUND           (404)
PRODUCT_NOT_ACTIVE          (400)
PRODUCT_EXPIRED             (400)
STORE_SUSPENDED             (403)
TRANSACTION_NOT_FOUND       (404)
TRANSACTION_EXPIRED         (400)
COUPON_EXPIRED              (400)
COUPON_USAGE_LIMIT_EXCEEDED (409)
PAYMENT_ALREADY_RECEIVED    (409)  (Idempotent: OK to retry)
VALIDATION_ERROR            (422)
ENCRYPTION_ERROR            (500)
STORAGE_ERROR               (500)
```

## Next: Milestone 4 (Delivery & Webhooks)

With payments working, Milestone 4 will complete:
1. BullMQ job queue for reliable delivery
2. Email service integration (payment receipts)
3. Webhook retry logic with exponential backoff
4. Download count enforcement
5. IP rate limiting (5 downloads per IP per day)
6. Audit logging for sensitive operations

Ready for E2E testing (register → checkout → payment → download)?
