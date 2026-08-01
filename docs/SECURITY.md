# MoonBite Merchant Hub - Security Guide

## Overview

This document outlines the security architecture, threats mitigated, and hardening measures implemented in MoonBite Merchant Hub.

## Security Architecture

### Layers

```
┌─────────────────────────────────────────────┐
│  Client (Browser/Mobile)                    │
│  - HTTPS only (TLS 1.3+)                   │
│  - CSRF protection (SameSite cookies)      │
│  - CSP headers                              │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  API Layer                                  │
│  - Rate limiting (100 req/min per key)     │
│  - CORS validation                          │
│  - Helmet security headers                  │
│  - Input validation (Zod schemas)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Authentication                             │
│  - JWT (15m access token)                  │
│  - API keys (long-lived, revocable)       │
│  - 2FA (TOTP, 30s window)                  │
│  - Refresh token rotation                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Business Logic                             │
│  - Idempotency keys (prevent double-charge)│
│  - Permission checks (merchant ownership)  │
│  - Data validation (types, ranges)         │
│  - Audit logging (all actions)             │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Data Layer                                 │
│  - Encrypted at rest (AES-256-GCM)        │
│  - HMAC signatures (no tampering)          │
│  - Unique constraints (no duplicates)      │
│  - Soft deletes (audit trail)              │
└─────────────────────────────────────────────┘
```

## OWASP Top 10 Coverage

| Threat | Mitigation |
|--------|-----------|
| Broken Access Control | JWT + merchant ownership checks |
| Cryptographic Failures | AES-256-GCM + TLS 1.3+ |
| Injection | Prisma ORM + Zod validation |
| Insecure Design | Threat modeling + idempotency |
| Security Misconfiguration | Helmet + CSP + CORS config |
| Vulnerable Components | Dependabot + npm audit |
| Authentication Failures | 2FA + JWT rotation |
| Software/Data Integrity | HMAC + idempotency keys |
| Logging/Monitoring | Audit logs + rate limit tracking |
| SSRF | URL validation + webhook TLS |

## Implemented Security Controls

### 1. Cryptography

- **Passwords**: Argon2id (100ms+ hashing)
- **Tokens**: HMAC-SHA256 (timing-safe)
- **Files**: AES-256-GCM (per-file keys)
- **Signatures**: HMAC-SHA256 (download URLs, webhooks)

### 2. Authentication

- **Access Tokens**: 15-minute JWT
- **Refresh Tokens**: 7-day with rotation
- **API Keys**: Long-lived, revocable
- **2FA**: TOTP with 30-second window

### 3. Authorization

- Merchant ownership verification
- Soft-deleted resource exclusion
- API key scoping
- Permission checks

### 4. Input Validation

- Zod schemas on all API boundaries
- Type checking (TypeScript strict)
- Range validation (amounts, strings)
- Format validation (emails, URLs)

### 5. Rate Limiting

- 100 requests/minute per API key
- 5 downloads/day per IP
- In-memory tracking (Redis in production)
- Rate limit headers on responses

### 6. Secure Headers

```
Strict-Transport-Security: max-age=31536000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### 7. CORS Configuration

- Whitelist specific origins
- Restrict HTTP methods
- HttpOnly cookies only
- Credentials allowed

### 8. Idempotency

- Idempotency-Key header required
- Prevents double-charging
- 24-hour cache retention
- RFC 7231 compliant

### 9. Audit Logging

- User logins/logouts
- 2FA changes
- API key operations
- Store/product changes
- Payout requests
- Downloads

### 10. Data Protection

- Encrypted at rest (AES-256)
- HTTPS only (TLS 1.3+)
- Soft deletes (audit trail)
- 90-day log retention

## Production Hardening Checklist

- [ ] WAF (Web Application Firewall)
- [ ] DDoS protection service
- [ ] API gateway rate limiting
- [ ] Secrets vault (HashiCorp/AWS)
- [ ] Database encryption at rest
- [ ] TLS certificate automation
- [ ] Log aggregation (ELK/Splunk)
- [ ] Intrusion detection system
- [ ] Security monitoring (SIEM)
- [ ] Incident response plan

## Secrets Management

**Required Environment Variables**:
- DATABASE_URL (PostgreSQL connection)
- JWT_SECRET (32+ bytes)
- ENCRYPTION_MASTER_KEY (32-byte hex)
- SENDGRID_API_KEY (email sending)
- REDIS_URL (job queue)
- MINIO_* (file storage)
- CORS_ORIGIN (frontend URL)

**Best Practices**:
- Never commit secrets to git
- Use .gitignore for .env
- Pre-commit hooks to scan
- Rotate secrets regularly
- Use different secrets per environment
- Mask secrets in logs

## Incident Response

**Report Security Issues**:
```
Email: security@moonbite.org
DO NOT open public GitHub issues
Include: description, steps, impact, fix
```

**Response Timeline**:
- 24h: Acknowledge
- 72h: Assessment
- 5d: Security update
- 10d: Disclosure

## Dependency Management

**Regular Updates**:
```bash
npm audit              # Check vulnerabilities
npm audit fix          # Auto-fix
npm outdated          # Check versions
npm update            # Update safely
```

**Automated Scanning**:
- Dependabot pull requests
- GitHub security advisories
- Container scanning
- Static code analysis

## Compliance

- ✅ OWASP Top 10
- ✅ NIST Cybersecurity Framework
- ✅ CWE Top 25
- ⚠️ PCI DSS (subset)
- 🔄 SOC 2 (in progress)

## Monitoring

**Key Metrics**:
- Failed login attempts
- API error rates
- Rate limit hits
- Database connection pool
- Disk/memory usage
- Latency percentiles

**Alerts**:
- > 5 failed logins/min
- > 1% error rate
- > 100 rate limit hits/hour
- > 90% resource usage

## References

- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
- [API Security](https://owasp.org/www-project-api-security/)
- [Cryptography Primer](https://cheatsheetseries.owasp.org/)

---

**Last Updated**: August 2024
**Version**: 1.0.0
**Status**: Production-Ready
