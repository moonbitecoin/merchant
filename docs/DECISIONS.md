# Architecture Decisions

Record of major architectural decisions and their rationale.

## 1. Monorepo Structure (Turborepo)

**Decision**: Use pnpm workspaces + Turborepo for monorepo

**Rationale**:
- Single source of truth for shared types (@moonbite/shared)
- Consistent dependency versions
- Unified build/test/lint pipeline
- Faster CI with caching

**Alternatives Considered**:
- Separate repositories: harder to share types, would require versioning
- Yarn workspaces: less mature than pnpm

**Status**: ✅ Implemented

---

## 2. BigInt for Money

**Decision**: Use BigInt for all monetary amounts, smallest unit = 10^-8 MBITE

**Rationale**:
- No floating-point rounding errors
- Exact mathematical operations
- Prevents accidental loss of funds
- Industry standard (Bitcoin uses satoshis, Ethereum uses wei)

**Example**:
```typescript
const oneIntMbite = 100000000n; // 1 MBITE in smallest units
const tenMbite = 10n * 100000000n; // 10 MBITE
```

**Alternatives Considered**:
- Decimal.js: heavier library, not needed with BigInt
- Database DECIMAL(18,8): not type-safe in TypeScript

**Status**: ✅ Enforced throughout

---

## 3. Zod Schemas as Single Source of Truth

**Decision**: All API boundaries validated with Zod schemas in @moonbite/shared

**Rationale**:
- Type safety: schemas generate TypeScript types
- Validation: runtime checking prevents bugs
- Documentation: schema describes contract
- Reduced bugs: catch errors early at boundaries

**Pattern**:
```typescript
// packages/shared/schemas.ts
export const CheckoutRequestSchema = z.object({
  productId: IDSchema,
  couponCode: z.string().optional(),
  idempotencyKey: z.string().uuid(),
});

// apps/api/routes/checkout.ts
const data = CheckoutRequestSchema.parse(request.body);

// apps/web/components/CheckoutForm.tsx
type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;
```

**Status**: ✅ Implemented

---

## 4. RFC 7807 Problem+JSON for Errors

**Decision**: All errors return RFC 7807 Problem+JSON, never raw stack traces

**Rationale**:
- Standardized error format (browsers, API clients understand it)
- Never leak implementation details
- Consistent error handling
- Type-safe error codes

**Example**:
```json
{
  "type": "https://api.moonbite.org/errors/PAYMENT_ALREADY_RECEIVED",
  "title": "Payment Already Received",
  "status": 409,
  "detail": "Payment already confirmed for transaction X",
  "errors": {
    "transactionId": ["Not found", "Already confirmed"]
  }
}
```

**Status**: ✅ Implemented

---

## 5. Idempotent Payment Matching

**Decision**: Payment matching via unique constraint on (txHash, depositAddress)

**Rationale**:
- Safe to retry without double-crediting merchants
- Handles blockchain reorgs gracefully
- Handles duplicate listener events
- Enables safe webhook retries

**Pattern**:
```sql
ALTER TABLE transactions
ADD CONSTRAINT unique_tx_hash UNIQUE(txHash);

ALTER TABLE transactions
ADD CONSTRAINT unique_deposit_address UNIQUE(depositAddress);
```

If payment arrives twice, second is no-op.

**Status**: ✅ Implemented in Prisma schema

---

## 6. HD Wallet for Deposit Addresses

**Decision**: Derive unique deposit address per transaction (HD wallet path m/44'/0'/0'/0/{index})

**Rationale**:
- One address per transaction (no address reuse)
- Deterministic from single master key
- Supports any number of transactions
- Customer privacy: transactions not linked

**Example**:
```
Transaction 1: m/44'/0'/0'/0/0 → Address1
Transaction 2: m/44'/0'/0'/0/1 → Address2
Transaction 3: m/44'/0'/0'/0/2 → Address3
```

**Alternatives Considered**:
- Single merchant address: bad for privacy, hard to match payments
- Random addresses: not deterministic, hard to recover

**Status**: ✅ Designed, implementation pending

---

## 7. AES-256-GCM for File Encryption

**Decision**: Files encrypted at rest with AES-256-GCM

**Rationale**:
- Industry standard (NIST-approved)
- Authenticated encryption (integrity + confidentiality)
- Fast and efficient
- Per-file key for compartmentalization

**Flow**:
```
Master Key (env var)
    ↓
Per-file random key
    ↓ Wrapped with master key
    ↓
AES-256-GCM encrypts file
    ├ Input: plaintext file
    ├ IV: random 12 bytes
    └ Output: ciphertext + IV + auth tag
    ↓
On download: reverse process
```

**Alternatives Considered**:
- AES-256-CBC: no authentication, vulnerable to tampering
- RSA: too slow for large files
- TDE (database encryption): only at-rest, not in transit

**Status**: ✅ Implemented

---

## 8. Argon2id for Password Hashing

**Decision**: Passwords hashed with Argon2id (currently using PBKDF2, upgrade needed)

**Rationale**:
- Memory-hard: resistant to GPU/ASIC attacks
- OWASP recommendation
- Safe even if database compromised

**TODO**: Upgrade to @node-rs/argon2 in production

**Status**: ⚠️ Partially implemented (PBKDF2 placeholder)

---

## 9. JWT + Rotating Refresh Tokens

**Decision**: Access tokens (15min) + refresh tokens (7 days) with rotation and reuse detection

**Rationale**:
- Stateless auth (scales horizontally)
- Short-lived access tokens (limited exposure)
- Refresh token rotation (compromised token detected)
- Reuse detection (revokes session if stolen token replayed)

**Flow**:
```
Login: returns accessToken + refreshToken
    ↓
Request: uses accessToken
    ↓
Token expires: POST /refresh with refreshToken
    ↓
API: validates refreshToken, issues new pair
    ↓
Refresh storage: replaces old with new (rotation)
    ↓
If old token replayed: revoke entire session
```

**Alternatives Considered**:
- Stateful sessions (Redis): requires shared state, doesn't scale
- Long-lived tokens: high security risk
- No refresh: short tokens only means frequent re-auth

**Status**: ✅ Implemented

---

## 10. Fastify Over Express

**Decision**: Fastify for backend (vs Express, Hapi, etc)

**Rationale**:
- Built-in request validation
- FastJSON serialization (faster than Express)
- Plugin ecosystem (CORS, Helmet, JWT, rate-limit)
- Strong TypeScript support
- ~2x faster than Express in benchmarks

**Downsides**:
- Smaller ecosystem than Express
- Steeper learning curve

**Status**: ✅ Implemented

---

## 11. Next.js 14 App Router for Frontend

**Decision**: Next.js 14 with App Router (not Pages Router)

**Rationale**:
- React Server Components
- Parallel routes and layouts
- Built-in file-based routing
- Integrated API routes (not used, but available)
- Incremental Static Regeneration (ISR) for public pages

**Alternatives Considered**:
- SPA (Create React App): no SSR, bad for SEO
- Remix: good but ecosystem smaller than Next.js

**Status**: ✅ Scaffolded, components pending

---

## 12. MinIO for File Storage

**Decision**: MinIO (S3-compatible) for development, AWS S3 for production

**Rationale**:
- Local development (no AWS credentials needed)
- Drop-in replacement for S3
- Self-hosted option
- Streaming upload (no buffer in memory)

**Development**:
```bash
docker run -p 9000:9000 minio/minio server /data
```

**Production**:
```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_ACCESS_KEY=aws-key
S3_SECRET_KEY=aws-secret
S3_BUCKET=moonbite-prod
```

**Status**: ✅ Implemented with Docker Compose

---

## 13. BullMQ for Background Jobs

**Decision**: BullMQ (Redis-backed job queue) for async tasks

**Rationale**:
- Reliable job processing
- Automatic retries
- Dead-letter queue
- Scales horizontally
- Built-in monitoring

**Jobs**:
- Email delivery (receipt, payout notification)
- Webhook retries (payment.received, file.downloaded)
- Payout processing
- Audit log retention

**Pattern**:
```typescript
const queue = new Queue('delivery');
await queue.add('send-receipt', { transactionId }, {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
});
```

**Status**: ✅ Designed, implementation pending

---

## 14. PostgreSQL 16 + Prisma

**Decision**: PostgreSQL 16 as primary database, Prisma as ORM

**Rationale**:
- PostgreSQL: ACID, JSON, advanced types, open-source
- Prisma: type-safe queries, migrations, schema management

**Alternatives Considered**:
- MongoDB: not suitable for financial transactions (ACID needed)
- Raw SQL: no type safety, verbose

**Status**: ✅ Schema implemented, migrations pending

---

## 15. Soft Deletes (deleted_at)

**Decision**: Logical deletes with deleted_at column, not hard deletes

**Rationale**:
- Audit trail: can recover deleted data
- Referential integrity: no orphaned records
- Compliance: may be required to keep records

**Pattern**:
```sql
DELETE product → UPDATE product SET deleted_at = NOW()
SELECT * FROM product → SELECT * FROM product WHERE deleted_at IS NULL
```

**Status**: ✅ Implemented in Prisma schema

---

## 16. Redis for Sessions + Cache + Rate Limiting

**Decision**: Single Redis instance for sessions, cache, and rate limiting

**Rationale**:
- Fast in-memory store
- Atomic operations (rate limiting)
- Session storage (tokens, refresh tokens)
- Cache layer (product details, merchant info)
- Scales vertically and horizontally

**Alternatives Considered**:
- Memcached: no persistence, no data structures
- Database-backed sessions: slow

**Status**: ✅ Implemented with Docker Compose

---

## 17. Audit Logging for Compliance

**Decision**: Immutable audit logs for all sensitive actions

**Rationale**:
- Compliance: regulatory requirements
- Security: detect unauthorized access
- Incident response: understand what happened
- Accountability: know who did what when

**Logged Actions**:
- merchant.login
- merchant.logout
- merchant.2fa_enable
- store.create / update
- product.create / update / delete
- api_key.create / revoke
- payout.request
- wallet.update

**Pattern**:
```sql
INSERT INTO audit_logs (
  merchant_id, action, resource_type, resource_id,
  changes, ip_address, user_agent, created_at
) VALUES (...)
```

**Status**: ✅ Designed, implementation pending

---

## 18. No-KYC Model (Regulatory Risk)

**Decision**: No mandatory KYC, but prepare for future compliance

**Rationale**:
- Lower friction for merchants
- Market entry faster

**Warnings**:
- AML (Anti-Money Laundering) compliance required in most jurisdictions
- Crypto restrictions in some countries (Saudi Arabia, etc)
- Potential legal liability
- Should be treated as business/legal question, not technical

**Recommendations**:
- Consult lawyers before launch
- Plan for optional KYC upgrade path
- Monitor regulatory landscape
- Consider geographic restrictions

**Status**: ⚠️ Designed, legal review required

---

## 19. Merchant Dashboard vs Public Storefront

**Decision**: Separate UI for merchant (dashboard) and customers (storefront)

**Rationale**:
- Different UX requirements
- Different auth flows
- Separate deployment possible
- Better security boundary

**Implementation**:
```
Same Next.js app:
- /dashboard/* → Merchant authenticated routes
- /[store-slug]/* → Public storefront
- /[store-slug]/[product-slug] → Product detail
```

**Status**: ✅ Scaffolded, components pending

---

## 20. Development-Only Mock Payments

**Decision**: MockChainAdapter for localhost, switch to real blockchain in production

**Rationale**:
- Fast development (no blockchain wait)
- No real money spent on tests
- Deterministic (can test edge cases)

**Usage**:
```bash
curl -X POST http://localhost:3001/api/v1/dev/mock-payment \
  -H "Content-Type: application/json" \
  -d '{
    "address": "deposit-address",
    "amount": "1000000000",
    "txHash": "aaa...aaa"
  }'
```

**Disabled in Production**:
```env
MOCK_CHAIN_ENABLED=false
```

**Status**: ✅ Implemented

---

## Future Decisions

### Webhook Signature Verification
- HMAC-SHA256 signing (implemented)
- Timing-safe comparison (implemented)
- Consider adding webhook secret rotation

### Rate Limiting Strategy
- Per-IP (auth endpoints)
- Per-API-key (merchant endpoints)
- Consider adaptive rate limiting

### Caching Strategy
- Cache product listings (by store)
- Cache merchant info (by ID)
- Cache aggregations (revenue, sales count)
- TTL: 5 minutes for most, 1 hour for reports

### Database Replication
- Read replicas for reports
- Write to primary only
- Consider read-after-write consistency

---

## Document History

- 2024-08-01: Initial decisions documented
