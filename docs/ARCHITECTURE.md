# MoonBite Merchant Hub - Architecture

## System Overview

MoonBite Merchant Hub is a full-stack SaaS platform split into frontend (Next.js), backend (Fastify), and supporting services.

```
┌─────────────────────────────────────────────────────────────┐
│                     Public Internet                          │
└────────────────────────────────┬────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │                         │
              ┌─────▼────────┐         ┌─────▼──────┐
              │  Next.js Web │         │  Fastify   │
              │  (Port 3000) │         │  API       │
              │              │         │  (Port3001)│
              │ • Dashboard  │         │            │
              │ • Storefront │         │ • Auth     │
              │ • Checkout   │         │ • Products │
              └─────┬────────┘         │ • Checkout │
                    │                  │ • Webhooks │
                    └──────────┬────────┴──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────▼──────┐ ┌────▼─────┐ ┌─────▼──────┐
         │ PostgreSQL   │ │  Redis   │ │  MinIO     │
         │ (Port 5432)  │ │ (Port6379)│ (Port 9000) │
         │              │ │          │ │            │
         │ • Merchants  │ │ • Cache  │ │ • Files    │
         │ • Products   │ │ • Queues │ │ • Avatars  │
         │ • Txns       │ │ • Sessions│ │ • Encrypted│
         └──────────────┘ └──────────┘ └────────────┘
                               │
                        ┌──────▴──────┐
                        │   Mailpit   │
                        │ (Port 1025) │
                        │  Test Email │
                        └─────────────┘
                               │
                        ┌──────▴──────┐
                        │  Blockchain │
                        │  (MockChain)│
                        │  Dev Only   │
                        └─────────────┘
```

## Data Flow

### Merchant Registration

```
1. User submits email + password
   ↓
2. API validates input (Zod schema)
   ↓
3. Hash password (Argon2id)
   ↓
4. Create Merchant record
   ↓
5. Generate verification token
   ↓
6. Send email via Mailpit
   ↓
7. Return success (check email message)
```

### Product Upload & Checkout

```
1. Merchant uploads product file
   ↓
2. Stream to MinIO (never buffer in memory)
   ↓
3. Compute SHA-256 hash
   ↓
4. Generate encryption key + wrap with master key
   ↓
5. AES-256-GCM encrypt file at rest
   ↓
6. Store metadata in Prisma
   ↓
7. Customer clicks "Buy"
   ↓
8. API creates Transaction record
   ↓
9. Derive deposit address (HD derivation)
   ↓
10. Generate QR code
    ↓
11. Return checkout details (15min expiry)
```

### Payment Reconciliation (Critical Path)

```
Blockchain Listener
    ↓
Detect deposit at address
    ↓
PaymentListener.onDeposit() callback
    ↓
Find Transaction by deposit_address
    ↓
PaymentMatcher.matchPayment()
  ├─ Check amount (underpaid? overpaid? exact?)
  ├─ Check timing (expired? on time?)
  ├─ Check idempotency (duplicate tx_hash?)
  └─ Return status
    ↓
Update Transaction status (confirmed/underpaid/late/reverted)
    ↓
If confirmed:
  ├─ Calculate settlement (amount - 2% fee)
  ├─ Credit merchant balance
  ├─ Fire payment.received webhook
  ├─ Generate download URL (signed, 24h TTL)
  ├─ Send receipt email
  └─ Enqueue delivery notification
```

## Database Schema

### Core Tables

- **merchants**: User accounts (email, password hash, 2FA)
- **stores**: Merchant-owned stores (name, slug, status)
- **products**: Items for sale (title, price in BigInt, category)
- **product_files**: Encrypted files (minioPath, encryptionKey, iv, tag)
- **transactions**: Payment records (deposit_address UNIQUE, tx_hash UNIQUE)
- **downloads**: Purchase receipts (transaction_id, ip_address, download count)
- **payouts**: Merchant settlement (amount, wallet, status)
- **api_keys**: Merchant API credentials (public + secret hash)
- **webhooks**: Webhook endpoints
- **webhook_deliveries**: Retry log for failed webhooks
- **audit_logs**: Security audit trail

### Key Indexes

```sql
-- Fast lookups
CREATE INDEX transactions_deposit_address ON transactions(deposit_address);
CREATE INDEX transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX products_store_id_active ON products(store_id, status);
CREATE INDEX downloads_transaction_id ON downloads(transaction_id);
```

## API Design

### Request/Response

All requests validated with Zod schemas from `@moonbite/shared`:

```typescript
POST /api/v1/auth/login
Content-Type: application/json
{
  "email": "alice@example.com",
  "password": "...",
  "totpCode": "123456"  // optional if 2FA enabled
}

HTTP/1.1 200 OK
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "merchant": {
    "id": "uuid",
    "email": "alice@example.com",
    "name": "Alice"
  }
}
```

### Error Handling (RFC 7807)

All errors return Problem+JSON:

```json
{
  "type": "https://api.moonbite.org/errors/PAYMENT_ALREADY_RECEIVED",
  "title": "Payment Already Received",
  "status": 409,
  "detail": "Payment already confirmed for this transaction",
  "instance": "/api/v1/checkout/tx-id"
}
```

Never leak stack traces in responses.

## Authentication

### JWT Flow

```
1. User logs in → POST /auth/login
2. API returns: accessToken (15min) + refreshToken (7 days)
3. Client stores both in HttpOnly cookies
4. Client uses accessToken for all requests
5. Authorization header: "Bearer eyJ..."
6. When accessToken expires → POST /auth/refresh
7. API validates refreshToken, generates new pair
8. Rotate refreshToken (new refresh token on each refresh)
9. Reuse detection: if old refreshToken used again, invalidate all tokens
```

### 2FA (TOTP)

```
1. Merchant enables 2FA → GET /auth/2fa/enable
2. API generates TOTP secret + QR code
3. Merchant scans QR in authenticator app
4. Merchant confirms with 6-digit code
5. 2FA enabled, stored in database
6. On login: if 2FA enabled, require totp_code
7. Verify with speakeasy.totp.verify()
```

## Encryption

### Product Files

```
Master Key (32 bytes, from environment)
        ↓
Per-file Data Key (32 bytes, random)
        ↓
Wrap Data Key with Master Key (RSA-OAEP or similar)
        ↓
When storing file:
- Generate IV (12 bytes for GCM)
- AES-256-GCM encrypt data
- Store ciphertext + IV + auth tag in MinIO
- Store wrapped data key + metadata in Prisma
        ↓
When downloading:
- Retrieve encrypted file + IV + tag from MinIO
- Retrieve wrapped data key from Prisma
- Unwrap data key with Master Key
- AES-256-GCM decrypt with IV and tag
- Stream plaintext to client
```

### Webhook Signatures

```
Payload: {"event":"payment.received","transaction_id":"..."}
Secret: "webhook_secret_from_db"
        ↓
Signature = HMAC-SHA256(Payload, Secret)
        ↓
Header: X-MoonBite-Signature: hex_signature
        ↓
Receiver validates with timing-safe comparison
```

## Background Jobs (BullMQ)

Jobs queued and processed asynchronously:

- **delivery**: Send encrypted download link via email
- **webhook**: POST to merchant webhook (with retries)
- **payout**: Process merchant payout request
- **cleanup**: Delete expired transactions, old logs

Retry strategy:
```
Attempt 1: Immediate
Attempt 2: +1 minute
Attempt 3: +5 minutes
Attempt 4: +30 minutes
Attempt 5: +2 hours
Failed: Dead-letter queue
```

## Rate Limiting

Redis-based sliding window:

```
Auth endpoints: 10 requests / 60 seconds / IP
API endpoints: 100 requests / 60 seconds / API key
```

## Deployment Considerations

### Production Checklist

- [ ] Real database (RDS/Managed PostgreSQL)
- [ ] Real Redis (ElastiCache/Memorystore)
- [ ] Real S3 or managed MinIO
- [ ] Real blockchain adapter (Bitcoin/Ethereum/etc)
- [ ] HTTPS + domain name
- [ ] Environment variables (JWT_SECRET, ENCRYPTION_KEY, etc)
- [ ] Email service (not Mailpit)
- [ ] Monitoring & logging (Datadog/CloudWatch)
- [ ] Backup strategy (automated daily)
- [ ] CDN for static assets
- [ ] WAF and DDoS protection
- [ ] Security audit (OWASP Top 10)

### Scaling

- Horizontal scaling: Stateless API instances behind load balancer
- Database: Read replicas for reports
- Cache: Redis cluster for sessions/cache
- Files: S3 for unlimited storage
- Email: SES/Sendgrid instead of Mailpit
- Webhooks: Dead-letter queue for failed deliveries

## Monitoring

Key metrics to track:

- Payment confirmation rate (should be >99%)
- Webhook delivery success rate
- API response times (p50, p95, p99)
- Failed payment reconciliations (should be ~0)
- Database connection pool usage
- Redis memory usage
- MinIO storage growth
- Email delivery failures

## Security Boundaries

### Public Endpoints (no auth)

- GET `/api/v1/:store_slug` - Storefront
- GET `/api/v1/:store_slug/:product_slug` - Product details
- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET `/api/v1/checkout/:id` - Checkout status (anyone can check)

### Authenticated Endpoints (Bearer token)

- All merchant dashboard endpoints
- Product management
- Store settings
- Payout requests

### API Key Authenticated (Signature)

- POST `/api/v1/products` - Create product via API
- GET `/api/v1/sales` - Sales reports via API

## Testing Strategy

1. **Unit Tests**: Payment matcher, fee calculations, URL signing
2. **Integration Tests**: Database operations, encryption/decryption
3. **E2E Tests**: Full flow (register → verify → checkout → payment → download)
4. **Security Tests**: SQL injection, XSS, CSRF, timing attacks
