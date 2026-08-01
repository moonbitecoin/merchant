# MoonBite Merchant Hub

Enterprise-grade SaaS platform for selling digital goods (software, eBooks, courses, art) with MBITE cryptocurrency payments, automatic encrypted delivery, and instant settlement.

## ✨ Features

- **Merchant Dashboard**: Manage stores, products, transactions, and payouts
- **Public Storefront**: Customer-facing product showcase with checkout
- **Cryptocurrency Payments**: Accept MBITE with automatic payment verification
- **Encrypted Delivery**: AES-256-GCM encryption for product files
- **Instant Settlement**: No escrow, direct merchant payouts
- **API v1**: Public API for integration
- **Security**: Argon2id auth, JWT tokens, TOTP 2FA, HMAC webhooks
- **Audit Logs**: Complete audit trail for compliance

## 🏗️ Tech Stack

**Backend**: Node.js 20, TypeScript, Fastify, PostgreSQL 16, Prisma, Redis, BullMQ
**Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui
**Storage**: MinIO (S3-compatible), AES-256-GCM encryption
**Blockchain**: PaymentListener interface with MockChainAdapter for dev

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- pnpm 8+

### Setup

1. **Clone and configure**:
```bash
git clone <repo>
cd moonbite-hub
cp .env.example .env.local
```

2. **Install dependencies**:
```bash
pnpm install
```

3. **Start infrastructure**:
```bash
docker compose up -d
```

4. **Initialize database**:
```bash
pnpm db:migrate
pnpm db:seed
```

5. **Start development servers**:
```bash
pnpm dev
```

This starts:
- API: http://localhost:3001
- Web: http://localhost:3000
- MinIO Console: http://localhost:9001
- Mailpit (test email): http://localhost:8025

### Test Accounts

After seeding:
- alice@example.com / securepassword123
- bob@example.com / securepassword456

## 📦 Monorepo Structure

```
moonbite-hub/
├── apps/
│   ├── api/              # Fastify backend
│   └── web/              # Next.js dashboard + storefront
├── packages/
│   ├── db/               # Prisma schema
│   ├── shared/           # Zod schemas, types, constants
│   └── chain/            # Payment listener interface
├── docker-compose.yml    # Local development infrastructure
├── CLAUDE.md             # Project rules & constraints
└── docs/                 # Architecture & API documentation
```

## 🔑 Key Commands

```bash
# Development
pnpm dev                  # Start all apps
pnpm dev --filter @moonbite/api  # Start only API

# Building
pnpm build               # Build all apps
pnpm typecheck          # Type check everything
pnpm lint               # Lint code

# Testing
pnpm test               # Run all tests
pnpm e2e                # Run end-to-end tests
pnpm test:coverage      # Generate coverage

# Database
pnpm db:migrate         # Run migrations
pnpm db:seed            # Seed test data
pnpm db:studio          # Open Prisma Studio

# Utilities
docker compose down -v  # Stop and clean infrastructure
```

## 💰 Money Handling

**CRITICAL**: All money is stored as BigInt in smallest MBITE unit.
- 1 MBITE = 10^8 units
- Never use float for money operations
- Platform fee: 200 basis points (2%)

Example:
```typescript
const oneIntMbite = 100000000n; // BigInt, smallest unit
const amountInMbite = 5n * 100000000n; // 5 MBITE
```

## 🔐 Security

- ✅ Passwords: Argon2id hashing
- ✅ Auth: JWT access (15min) + rotating refresh tokens
- ✅ Encryption: AES-256-GCM for product files
- ✅ Webhooks: HMAC-SHA256 signatures
- ✅ Rate limiting: Sliding window via Redis
- ✅ Audit logs: All sensitive actions logged
- ✅ CORS: Strict origin checking
- ✅ No stack traces: RFC 7807 problem+json errors

## 📋 API Documentation

OpenAPI 3.1 documentation available at:
- Development: http://localhost:3001/docs

### Core Endpoints

**Authentication**:
- POST `/api/v1/auth/register` - Register merchant
- POST `/api/v1/auth/login` - Login
- POST `/api/v1/auth/refresh` - Refresh token

**Stores**:
- GET `/api/v1/stores` - List stores
- POST `/api/v1/stores` - Create store
- PUT `/api/v1/stores/:id` - Update store

**Products**:
- GET `/api/v1/products` - List products
- POST `/api/v1/products` - Create product
- PUT `/api/v1/products/:id` - Update product

**Checkout**:
- POST `/api/v1/checkout` - Create checkout (get deposit address)
- GET `/api/v1/checkout/:id` - Get checkout status
- POST `/api/v1/dev/mock-payment` - Simulate payment (dev only)

**Downloads**:
- GET `/api/v1/downloads/:id` - Download product file (signed URL)

**Webhooks**:
- POST `/api/v1/webhooks` - Create webhook
- GET `/api/v1/webhooks` - List webhooks

## 🧪 Testing

```bash
# Unit tests (payment matcher, fee math, etc)
pnpm test

# End-to-end tests (register → verify → checkout → payment → download)
pnpm e2e

# Coverage report
pnpm test:coverage
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - Project rules and constraints
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design
- [docs/PAYMENT_FLOW.md](./docs/PAYMENT_FLOW.md) - Payment reconciliation
- [docs/SECURITY.md](./docs/SECURITY.md) - Security considerations
- [docs/DECISIONS.md](./docs/DECISIONS.md) - Architecture decisions

## ⚖️ Legal & Compliance

**Warning**: The no-KYC model carries regulatory risk:
- AML (Anti-Money Laundering) compliance required in most jurisdictions
- Crypto payment restrictions in some countries (e.g., Saudi Arabia)
- Treat as legal question before launch, not a marketing feature

## 🐛 Development

### Viewing Emails

Test emails sent to Mailpit:
```bash
open http://localhost:8025
```

### Viewing Database

```bash
pnpm db:studio
```

### Debugging API

Set log level:
```bash
LOG_LEVEL=debug pnpm dev
```

### Mock Payments

In development, simulate crypto payments:
```bash
curl -X POST http://localhost:3001/api/v1/dev/mock-payment \
  -H "Content-Type: application/json" \
  -d '{
    "address": "MerchantDepositAddress123456",
    "amount": "4900000000",
    "txHash": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  }'
```

## 🚢 Deployment

For production deployment:
1. Update `.env` with real secrets
2. Use production database (RDS/Managed PostgreSQL)
3. Use production Redis (ElastiCache/Memorystore)
4. Configure real MinIO or AWS S3
5. Set up real blockchain adapter (not MockChainAdapter)
6. Enable HTTPS and configure CORS for production domain
7. Set `MOCK_CHAIN_ENABLED=false`

## 📞 Support

For issues or questions:
- Check [CLAUDE.md](./CLAUDE.md) for project rules
- Review [docs/](./docs/) for detailed architecture
- Check [docs/DECISIONS.md](./docs/DECISIONS.md) for design rationale

## 📄 License

Proprietary - MoonBite Inc.
