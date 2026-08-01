# Security Considerations

OWASP Top 10 review and security hardening checklist for MoonBite Merchant Hub.

## Overview

This document covers:
1. Security architecture
2. OWASP Top 10 mitigations
3. Cryptographic practices
4. Deployment security checklist
5. Incident response guidelines

## 1. Authentication & Authorization (OWASP #5: Broken Access Control)

### Implemented Controls

✅ **Strong Password Requirements**:
- Minimum 12 characters
- Hashed with Argon2id (PBKDF2 interim)
- Never stored in plaintext
- No password hints

✅ **JWT Authentication**:
- Access tokens: 15-minute TTL
- Refresh tokens: 7-day TTL
- Rotation on each refresh
- Reuse detection (invalidate session if old token replayed)

✅ **2FA (TOTP)**:
- Time-based one-time password
- 6-digit codes
- 30-second window with ±2 window tolerance
- Optional per merchant, mandatory for high-value operations

✅ **Rate Limiting**:
- Auth endpoints: 10 req/min/IP
- API endpoints: 100 req/min/key
- Sliding window via Redis
- Exponential backoff

✅ **Session Management**:
- HttpOnly cookies (no JavaScript access)
- Secure flag (HTTPS only)
- SameSite=Lax (CSRF protection)

### Remaining Work

- [ ] Implement refresh token rotation strictly
- [ ] Add IP whitelist for high-risk operations
- [ ] Implement device fingerprinting for suspicious login detection
- [ ] Add login notifications via email

---

## 2. Data Encryption (OWASP #2: Cryptographic Failures)

### In Transit

✅ **HTTPS Only**:
- All traffic over TLS 1.2+
- HSTS header: `Strict-Transport-Security: max-age=31536000`
- Certificate pinning (optional for mobile clients)

✅ **API Communication**:
- All requests: application/json + HTTPS
- Sensitive headers: `Authorization`, `X-MoonBite-Signature`
- No credentials in URL parameters

### At Rest

✅ **Product Files**:
- AES-256-GCM encryption
- Per-file random key
- Key wrapped with master key (env var)
- Stored in MinIO with IV + auth tag
- Decrypted only on download

✅ **Database**:
- PostgreSQL TDE (Transparent Data Encryption) in production
- Encrypted backups
- Field-level encryption for sensitive data (future)

✅ **Secrets Management**:
- Environment variables only (no hardcoded secrets)
- Git-ignored `.env.local`
- Vault integration (production)
- Key rotation on schedule

### Cryptographic Standards

```
Hashing:
- Passwords: Argon2id (2^16 time, 512MB memory)
- API secrets: SHA-256 (HMAC)
- Files: SHA-256 (integrity)

Encryption:
- Files: AES-256-GCM (authenticated)
- Master key: 256-bit random

Signing:
- Webhooks: HMAC-SHA256
- JWTs: HS256 (symmetric)
- Downloads: HMAC-SHA256

Random:
- All crypto.randomBytes() from Node.js
- Never use Math.random() for security
```

---

## 3. Injection Attacks (OWASP #3: Injection)

### SQL Injection

✅ **Mitigated with Prisma**:
- Parameterized queries
- No raw SQL
- Type-safe query builder
- All user input goes through Zod validation

### Command Injection

✅ **Mitigated**:
- No shell execution
- No `exec()`, `eval()`, `spawn()` with user input
- File operations isolated to MinIO

### NoSQL Injection

✅ **Not applicable**:
- Using PostgreSQL (SQL database)
- Not using MongoDB

### Code Examples (Safe)

```typescript
// ✅ SAFE: Parameterized query
const user = await prisma.merchant.findUnique({
  where: { email: userInput }, // Parameterized
});

// ❌ UNSAFE: Raw SQL (never do this)
const user = db.query(`SELECT * FROM merchants WHERE email = '${userInput}'`);

// ✅ SAFE: Zod validation before use
const data = RegisterRequestSchema.parse(userInput);
const merchant = await prisma.merchant.create({
  data,
});
```

---

## 4. XSS (Cross-Site Scripting) (OWASP #7)

### Frontend Protection

✅ **Content-Security-Policy**:
```
script-src 'self';
style-src 'self' 'unsafe-inline'; // Needed for Tailwind
img-src 'self' https:;
connect-src 'self' https:;
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

✅ **Output Encoding**:
- React automatically escapes text content
- DOMPurify for markdown (product descriptions)
- No `dangerouslySetInnerHTML` unless sanitized

✅ **Input Validation**:
- Zod validates all inputs
- Length limits on text fields
- Email/URL validation

### Example (Safe)

```typescript
// ✅ SAFE: React escapes automatically
<div>{userProvidedText}</div>

// ❌ UNSAFE: Never do this
<div dangerouslySetInnerHTML={{__html: userProvidedHtml}} />

// ✅ SAFE: Sanitized markdown
import DOMPurify from 'isomorphic-dompurify';
const sanitized = DOMPurify.sanitize(markdown);
<div dangerouslySetInnerHTML={{__html: sanitized}} />
```

---

## 5. CSRF (Cross-Site Request Forgery) (OWASP #8)

### Backend Protection

✅ **Implemented**:
- SameSite=Lax cookies
- CORS: Accept only known origins
- State-changing operations: POST/PUT/DELETE only
- Idempotency keys: Prevent duplicate submissions

✅ **Frontend Protection**:
- POST forms: Include CSRF token (if using forms)
- API requests: Automatic with fetch + credentials: 'include'
- No cross-origin image tags loading endpoints

### Example

```typescript
// ✅ SAFE: CORS allows only origin
app.register(cors, {
  origin: ['https://merchant.moonbite.org'],
  credentials: true,
});

// ✅ SAFE: State change via POST
app.post('/api/v1/stores', async (request, reply) => {
  // Only POST allows state changes
});

// ✅ SAFE: Idempotency key prevents retries from creating duplicates
const response = await fetch('/api/v1/checkout', {
  method: 'POST',
  headers: {
    'Idempotency-Key': uuidv4(),
  },
  body: JSON.stringify({...}),
});
```

---

## 6. Broken Authentication (OWASP #7, covered in #1)

### Additional Controls

✅ **Email Verification**:
- Required before merchant can accept payments
- 24-hour token TTL
- Token invalidated after use
- Resend option rate-limited

✅ **Password Reset**:
- Secure token sent via email (not SMS)
- 1-hour TTL
- Can only be used once
- IP validation (optional)

✅ **Suspicious Activity Detection**:
- Login from new IP: send verification email
- Multiple failed login attempts: lock account briefly
- Unusual payout requests: require 2FA confirmation

---

## 7. Sensitive Data Exposure (OWASP #1/2)

### Logging

✅ **Safe Logging**:
- Never log passwords or tokens
- Never log full API secrets
- Sanitize email addresses in logs (anonymize)
- REDACT_PATTERNS in place

```typescript
// ✅ SAFE: Sensitive data masked
logger.info('User login', {
  email: maskSensitive(email),
  ipAddress: ipAddress,
});

// ❌ UNSAFE: Never log full secret
logger.info('API key created', { secretKey });

// ✅ SAFE: Log prefix only
logger.info('API key created', { publicKeyPrefix: secret.substring(0, 10) });
```

### Error Messages

✅ **User-Friendly Errors**:
- Production: No stack traces exposed
- Development: Stack traces in logs, not API responses
- Generic messages: "Invalid email or password" (don't leak user existence)

### Data Minimization

✅ **Only Store Necessary Data**:
- No storing full payment cards (crypto, not relevant)
- No storing passwords recovery questions
- No PII beyond email + name (optional)
- Right to be forgotten: implement data deletion API

---

## 8. Broken Object Level Access (OWASP #5)

### Authorization Checks

✅ **All Endpoints Verify Ownership**:

```typescript
// ✅ SAFE: Verify merchant owns this store
const store = await prisma.store.findUniqueOrThrow({
  where: { id: storeId },
});

if (store.merchantId !== authenticatedMerchantId) {
  throw createAppError(ERROR_CODES.UNAUTHORIZED, 'Not your store');
}

// ❌ UNSAFE: Directly use user input without verification
const store = await prisma.store.findUnique({
  where: { id: userProvidedStoreId }, // Could be anyone's!
});
```

### API Key Access

✅ **API Keys Tied to Merchant**:
- When merchant calls API with key, identify which merchant
- Can only access own data
- Can't access other merchants' data

---

## 9. Security Misconfiguration (OWASP #5)

### Dependency Management

✅ **Implemented**:
- `pnpm audit` runs in CI
- `npm ci` (not `npm install`) in production
- Snyk integration (optional)
- Dependabot for updates

### Framework Security

✅ **Helmet.js**:
```typescript
await app.register(helmet, {
  contentSecurityPolicy: true,
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
});
```

✅ **Environment Configuration**:
- Development: debug logs, mock payments enabled
- Production: no logs, mock payments disabled
- Staging: same as production, but different secrets

---

## 10. Insufficient Logging & Monitoring (OWASP #9)

### Audit Logging

✅ **All Sensitive Actions Logged**:
- merchant.login / logout
- merchant.2fa_enable
- store.create / update
- product.create / update / delete
- api_key.create / revoke
- payout.request
- wallet.update

```sql
INSERT INTO audit_logs (
  merchant_id, action, resource_type, resource_id,
  changes, ip_address, user_agent, created_at
) VALUES (...)
```

### Monitoring & Alerting

✅ **Metrics to Monitor**:
- Failed login attempts (threshold: 5 per minute)
- Payment confirmation failures (target: >99%)
- API errors (threshold: <1%)
- Database connection pool (alert: >80% full)
- Memory usage (alert: >85%)
- Disk space (alert: >90% full)

---

## Security Deployment Checklist

### Development

- [ ] HTTPS disabled (localhost only)
- [ ] Mock payments enabled
- [ ] Debug logs enabled
- [ ] Swagger UI enabled
- [ ] Database: local PostgreSQL

### Staging

- [ ] HTTPS enabled
- [ ] Mock payments disabled
- [ ] Debug logs disabled
- [ ] Real blockchain adapter
- [ ] Database: managed PostgreSQL (backup enabled)
- [ ] Redis: managed Redis
- [ ] Email service: real (SendGrid/SES)

### Production

- [ ] HTTPS enforced (HSTS)
- [ ] Mock payments disabled
- [ ] Debug logs disabled
- [ ] Rate limiting enabled
- [ ] Database: managed + encrypted + backed up
- [ ] Redis: cluster mode
- [ ] MinIO: backed up to S3
- [ ] Firewall: restrict to known IPs
- [ ] WAF: CloudFlare/AWS WAF
- [ ] DDoS protection enabled
- [ ] Security audit: OWASP Top 10 review
- [ ] Penetration testing: annual
- [ ] Bug bounty program: optional

---

## Incident Response

### Data Breach

1. **Immediate (0 minutes)**:
   - Stop application
   - Preserve evidence (logs, memory, database dumps)
   - Notify on-call security team

2. **1 hour**:
   - Determine scope: what data was accessed?
   - Determine time: when was breach discovered?
   - Rotate all secrets (JWT_SECRET, ENCRYPTION_KEY, database password)

3. **4 hours**:
   - Audit logs: find unauthorized access patterns
   - Email merchants: "We've detected a security incident"
   - Password reset: force for all affected merchants

4. **24 hours**:
   - Full investigation report
   - Root cause analysis
   - Fix deployed
   - Post-mortem scheduled

### Compromised API Key

1. Immediately revoke the key
2. Audit: What did the attacker access?
3. If merchant uses it: email notification
4. Reset merchant's password (force new login)
5. Optional: require phone verification for that merchant

### DDoS Attack

1. Enable CloudFlare/AWS WAF
2. Increase rate limits (short-term)
3. Add allowlist for known good IPs
4. Monitor: CPU, network, database connections
5. Contact hosting provider for support
6. Post-attack: analyze traffic patterns

---

## Security Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Regular Security Tasks

- **Weekly**: Review new security advisories (npm audit)
- **Monthly**: Review audit logs for suspicious activity
- **Quarterly**: Security training for team
- **Annually**: Penetration testing, security audit
- **On-demand**: Security incidents, data breaches

---

## Document History

- 2024-08-01: Initial security review
