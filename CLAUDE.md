# MoonBite Merchant Hub — Project Rules

## What this is
A SaaS platform (merchant.moonbite.org) where merchants sell digital goods
(software, eBooks, courses, art) and accept MBITE cryptocurrency payments
with automatic encrypted delivery and instant settlement.

## Tech stack (do not deviate without asking)
- Backend: Node.js 20, TypeScript strict, Fastify, PostgreSQL 16, Prisma, Redis, BullMQ
- Frontend: Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui
- Storage: MinIO (S3-compatible) locally; AES-256-GCM for product files
- Blockchain: PaymentListener interface with a MockChainAdapter for dev
- Auth: Argon2id, JWT access (15m) + rotating refresh tokens, email verification
- Local dev: Docker Compose (postgres, redis, minio, mailpit)

## Monorepo layout
/apps/api        — Fastify backend
/apps/web        — Next.js frontend (dashboard + storefront)
/packages/db     — Prisma schema + client
/packages/shared — Zod schemas, types, constants (single source of truth)
/packages/chain  — PaymentListener interface + adapters

## Hard rules
- Money is ALWAYS BigInt in smallest MBITE unit (1 MBITE = 10^8 units). Never float. Never Number for amounts.
- Every API boundary validated with Zod from packages/shared. No inline schemas.
- No `any`. No `@ts-ignore`. Strict mode stays on.
- All IDs are UUIDv7. No sequential IDs exposed anywhere.
- Errors: RFC 7807 problem+json via a single error handler. Never leak stack traces.
- All POST endpoints accept an Idempotency-Key header and honor it.
- Payment matching MUST be idempotent (unique constraint on tx_hash + safe upsert).
- Product files are private by default. Downloads only via signed, time-limited (24h), IP-bound URLs.
- Secrets only via env vars. Update .env.example whenever a new var is added.
- Webhook payloads HMAC-signed (X-MoonBite-Signature), retried via BullMQ with exponential backoff.

## Commands
- `docker compose up -d` — start infra
- `pnpm dev` — run api + web
- `pnpm db:migrate` / `pnpm db:seed`
- `pnpm test` — Vitest; `pnpm e2e` — Playwright
- `pnpm lint && pnpm typecheck` — must pass before any task is "done"

## Definition of done (every task)
1. Code compiles, lint + typecheck pass
2. Unit tests written for business logic (fee math, matching, signing)
3. App runs end-to-end via docker compose + pnpm dev
4. Brief summary of decisions appended to docs/DECISIONS.md
