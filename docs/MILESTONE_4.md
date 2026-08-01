# Milestone 4: Delivery & Webhooks with Job Queue

## Overview

Milestone 4 implements reliable async job processing, secure downloads, and webhook delivery with retries. Uses BullMQ + Redis for production-grade reliability.

## Implemented Features

### Job Queue Service (BullMQ)

**Queues** (4):
- **Email Queue**: Send receipts, verification emails, password resets
- **Webhook Queue**: Deliver webhooks with automatic retry
- **Payout Queue**: Process merchant payouts
- **Cleanup Queue**: Maintenance jobs (delete expired data)

### Email Jobs

```
Type: 'payment-receipt'
  → Send purchase confirmation + download link
  → Triggered: On payment confirmed
  → Retry: 5 attempts (exponential backoff, 2s start)

Type: 'verification'
  → Send email verification link
  → Triggered: On registration
  → TTL: 24 hours

Type: 'password-reset'
  → Send password reset link
  → Triggered: On password reset request
  → TTL: 1 hour

Type: 'payout-notification'
  → Send payout confirmation
  → Triggered: On payout completed
```

### Webhook Delivery

**Retry Strategy**:
```
Attempt 1: Immediate (0s)
Attempt 2: After 1 minute
Attempt 3: After 5 minutes
Attempt 4: After 30 minutes
Attempt 5: After 2 hours
Failed: Dead-letter queue → Manual review
```

**Payload Format**:
```json
{
  "event": "payment.received",
  "timestamp": "2024-08-01T12:34:56Z",
  "data": {
    "transactionId": "uuid",
    "amount": "1000000000",
    "merchantAmount": "980000000",
    "platformFeeAmount": "20000000"
  }
}
```

**Security**:
- HMAC-SHA256 signature in `X-MoonBite-Signature` header
- Timing-safe comparison prevents timing attacks
- Merchant verifies signature on their side

### Downloads (Secure)

**Features**:
- ✅ Signature verification (HMAC)
- ✅ Download limit enforcement (1x, 3x, UNLIMITED)
- ✅ IP rate limiting (5 per IP per day)
- ✅ Automatic download logging
- ✅ AES-256-GCM decryption
- ✅ Streaming (never load full file in memory)

**Flow**:
```
1. Get signed download URL from checkout
   - Valid for 24 hours
   - Bound to customer's IP address
   - HMAC-signed (tamper-proof)

2. Customer requests download
   GET /api/v1/downloads/{transactionId}?sig={hmac}&expires={timestamp}

3. Server validates:
   ✓ Signature valid
   ✓ Not expired (24h)
   ✓ IP matches download request
   ✓ Download count < limit
   ✓ Transaction confirmed

4. Stream file:
   ✓ Retrieve encrypted file from MinIO
   ✓ Get encryption key + IV + tag from DB
   ✓ Unwrap key with master key
   ✓ AES-256-GCM decrypt on-stream
   ✓ Send plaintext to customer

5. Log download:
   - Record IP, timestamp, user agent
   - Increment download counter
   - Fire webhook: 'file.downloaded'
```

### Endpoints (5 New)

**Downloads**:
- `GET /api/v1/downloads/:transactionId` - Download file (with signature)
- `GET /api/v1/transactions/:transactionId/downloads` - Get download stats
- `GET /api/v1/analytics/downloads` - Download history (merchant only)

**Queue Monitoring**:
- `GET /api/v1/admin/queue/stats` - Queue job counts (admin only)

## Services

### JobQueueService
```typescript
queueEmail(type, recipient, data)       // Queue email job
queueWebhookDelivery(...)               // Queue webhook delivery
queuePayout(payoutId, amount, wallet)   // Queue payout
queueCleanup(type, data)                // Queue cleanup job
getStats()                              // Get queue stats
```

### DownloadService
```typescript
prepareDownload(transactionId, ipAddress)  // Verify + log download
verifyDownloadSignature(...)               // Validate HMAC signature
getDownloadStats(transactionId)            // Download limit info
getDownloadHistory(merchantId, storeId)    // Download analytics
```

## Database

### New/Updated Tables

**Download** (New):
```typescript
{
  id: UUID,
  transactionId: UUID,
  productFileId: UUID,
  ipAddress: string,
  userAgent?: string,
  downloadedAt: DateTime,  // Auto-logged on download
  createdAt: DateTime
}
```

**WebhookDelivery** (Enhanced):
- `statusCode`: HTTP response code (if sent)
- `response`: Response body or error message
- `retryCount`: Number of attempts made
- `nextRetryAt`: When to retry
- `completedAt`: Success timestamp

## Features

### Email Service

```
FROM: noreply@moonbite.org
SUBJECT: Payment Confirmation

Dear Customer,

Thank you for your purchase!

Product: Advanced TypeScript Course
Amount: 10 MBITE

Your download link (valid 24h):
https://merchant.moonbite.org/download?token=signed...

The link is restricted to your IP address.

---
MoonBite Merchant Hub
```

### Webhook Retry Logic

```typescript
// Exponential backoff: 1000ms initial delay
const delays = [1000, 60000, 300000, 1800000, 7200000]; // 1m, 5m, 30m, 2h

// BullMQ handles retries automatically
// On failure: queued for next retry with backoff
// After 5 failures: moved to dead-letter queue

// Dead-letter monitoring:
// GET /api/v1/admin/queue/stats → shows failed jobs
// Manual intervention: Retry or discard
```

### Rate Limiting

**IP-based download limit**:
```
5 downloads per IP per day
24-hour sliding window
Applies globally (not per-product)
Prevents abuse: E.g., bulk downloads to share
```

**Prevents**:
- One IP downloading 100 products in an hour
- Coordinated download attacks
- Unauthorized resale

### Audit Logging

**Sensitive actions logged**:
```
- User login/logout
- 2FA enable/disable
- API key created/revoked
- Store created/updated
- Product published
- Payout requested
- Download (file.downloaded webhook fired)
```

## Testing

### Email Jobs
```bash
# Queue email
curl -X POST http://localhost:3001/api/v1/admin/queue/test-email \
  -d '{"recipient":"user@example.com","type":"payment-receipt"}'

# Check Mailpit
open http://localhost:8025
```

### Webhook Delivery
```bash
# Create webhook
curl -X POST http://localhost:3001/api/v1/webhooks \
  -H "Authorization: Bearer $JWT" \
  -d '{
    "url":"https://example.com/webhook",
    "events":["payment.received"]
  }'

# Simulate payment (triggers webhook)
curl -X POST http://localhost:3001/api/v1/dev/mock-payment \
  -d '{"address":"...","amount":"1000000000","txHash":"aaa..."}'

# Check delivery
curl http://localhost:3001/api/v1/webhooks/{id}/deliveries \
  -H "Authorization: Bearer $JWT"
```

### Downloads
```bash
# Get download stats
curl http://localhost:3001/api/v1/transactions/{id}/downloads

# Download file (with signature from checkout)
curl "http://localhost:3001/api/v1/downloads/{transactionId}?sig={hmac}&expires={ts}" \
  -o file.pdf

# Check download history
curl http://localhost:3001/api/v1/analytics/downloads \
  -H "Authorization: Bearer $JWT"
```

## Redis & BullMQ

### Connection
```
URL: redis://localhost:6379
Queues: email, webhook, payout, cleanup
```

### Monitoring (Production)
```bash
# Use BullMQ UI (requires bull-board package)
# GET http://localhost:3001/admin/queues

# Or Redis CLI:
redis-cli
> KEYS bull:*
> LLEN bull:email:delayed
```

### Cleanup Jobs

**Auto-run daily** (optional):
- Delete pending transactions > 24h old
- Delete expired idempotency keys
- Archive audit logs > 90 days old

## Error Handling

**Download errors**:
- No transaction: 404 NOT_FOUND
- Not confirmed: 400 VALIDATION_ERROR
- Download limit exceeded: 409 CONFLICT
- IP rate limit: 429 TOO_MANY_REQUESTS
- Invalid signature: 400 INVALID_REQUEST
- Expired link: 400 INVALID_REQUEST

**Webhook delivery errors**:
- Network timeout: Retry
- HTTP 5xx: Retry
- HTTP 4xx: Fail permanently (don't retry)
- Invalid URL: Fail permanently

## Production Checklist

- [ ] Redis running (managed service in production)
- [ ] BullMQ dependency installed
- [ ] Email service configured (SendGrid/SES, not Mailpit)
- [ ] Job processors running (separate worker process or embedded)
- [ ] Dead-letter queue monitoring enabled
- [ ] Webhook delivery timeout set (10s)
- [ ] Download log retention policy set (90 days?)
- [ ] IP rate limit monitoring (alert on abuse)

## Metrics to Track

**Email Queue**:
- Jobs queued
- Jobs failed (retried vs dead-letter)
- Average delivery time

**Webhook Queue**:
- Delivery success rate (target: >99%)
- Retry rate
- Dead-letter queue size

**Downloads**:
- Total downloads
- Download success rate
- IP rate limit hits
- Average file size downloaded

## Architecture

```
Payment Confirmed
  ↓
Emit 'payment.received' event
  ↓
Queue webhook delivery (BullMQ)
Queue email receipt (BullMQ)
  ↓
BullMQ Workers:
  ├→ EmailWorker sends via EmailService
  ├→ WebhookWorker POSTs to merchant URLs
  └→ PayoutWorker processes blockchain
  ↓
Customer downloads file
  ↓
DownloadService:
  ├ Verify signature
  ├ Check limits (count + IP rate)
  ├ Log download
  ├ Get encrypted file from MinIO
  ├ Decrypt with key from DB
  └ Stream to customer
  ↓
Queue 'file.downloaded' webhook
```

## Next: Milestone 5 (Dashboard)

With payment flow and delivery complete, Milestone 5 will build:
- Revenue charts (30/90 day)
- Sales count & conversion rate
- Top 5 products table
- Filterable transaction log
- Payout request flow
- Coupon manager
- Settings (API keys, webhooks, wallet)

Complete end-to-end payment system ready! 🚀
