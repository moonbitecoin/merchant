# Multi-stage build for MoonBite Merchant Hub

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies required by Prisma and other packages
RUN apk add --no-cache \
  openssl \
  ca-certificates \
  libc6-compat \
  python3 \
  make \
  g++

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json tsconfig.json ./
COPY packages ./packages
COPY apps ./apps

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build packages sequentially to ensure proper dependency ordering
# 1. Generate Prisma client first (db package)
RUN pnpm --filter=@moonbite/db build

# 2. Refresh node_modules to update workspace symlinks after db build
RUN pnpm install --frozen-lockfile

# 3. Build shared utilities and chain adapters
RUN pnpm --filter=@moonbite/shared build || true
RUN pnpm --filter=@moonbite/chain build || true

# 4. Build API (now @moonbite/db is available)
RUN pnpm --filter=@moonbite/api build

# 5. Build web frontend
RUN pnpm --filter=@moonbite/web build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install system dependencies required by Prisma and other packages
RUN apk add --no-cache \
  openssl \
  ca-certificates \
  libc6-compat \
  curl

# Install pnpm
RUN npm install -g pnpm

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/turbo.json ./
COPY --from=builder /app/tsconfig.json ./

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Health check - simple curl-based check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start API and web
EXPOSE 3001
EXPOSE 3000

# Start app (migrations should be run separately via: railway run pnpm db:migrate:prod)
CMD ["pnpm", "start"]
