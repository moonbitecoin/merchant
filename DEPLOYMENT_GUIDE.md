# MoonBite Merchant Hub - Production Deployment Guide

## Current Status
- ✅ Docker image built successfully
- ✅ Project deployed to Railway
- ✅ Postgres database online
- ✅ Redis cache online
- ⚠️ Service returning 502 (missing database/cache configuration)

## Deployment URL
**Live:** https://moonbite-merchant-production.up.railway.app

## Next Steps to Get Production Live

### 1. Complete Railway Configuration
Go to: https://railway.app/project/909f9572-212c-4ab4-8025-4c98dcfa3180

#### Link Database Service
1. Click **Variables** for the `moonbite-merchant` service
2. Click **Add Variable**
3. Enter: `DATABASE_URL`
4. For value, use the reference: Click the database icon and select `Postgres` → `DATABASE_URL`
5. Save

#### Link Redis Service  
1. Click **Add Variable** again
2. Enter: `REDIS_URL`
3. For value, use reference: Click the database icon and select `Redis` → `REDIS_URL`
4. Save

### 2. Required Environment Variables (Already Set)
- `NODE_ENV`: production
- `JWT_SECRET`: configured
- `ENCRYPTION_MASTER_KEY`: configured
- `CORS_ORIGIN`: https://merchant.moonbite.org
- `LOG_LEVEL`: info

### 3. Optional Environment Variables
Add these if using MinIO for file storage:
- `MINIO_ENDPOINT`: your-minio-endpoint
- `MINIO_ACCESS_KEY`: your-access-key
- `MINIO_SECRET_KEY`: your-secret-key

### 4. Run Database Migrations
Once variables are linked:

```bash
railway run pnpm db:migrate:prod
```

Or from Railway dashboard:
1. Go to project
2. Select `moonbite-merchant` service
3. Click **Run Command**
4. Execute: `pnpm db:migrate:prod`

### 5. Verify Deployment
```bash
curl https://moonbite-merchant-production.up.railway.app/health
```

Should return 200 OK with health status.

## Admin Credentials (Demo Account)

After deployment, create an admin account:

```bash
railway run pnpm db:seed
```

Or access: https://moonbite-merchant-production.up.railway.app/admin

## Troubleshooting

### 502 Bad Gateway
- Check DATABASE_URL is linked
- Check REDIS_URL is linked
- Check logs: `railway logs -f`

### Database Migration Failed
- Ensure Postgres is online: `railway status`
- Check DATABASE_URL is correct
- Run: `railway run pnpm db:migrate:prod`

### Can't Connect to Redis
- Ensure Redis is online: `railway status`
- Check REDIS_URL format
- Verify port is accessible

## Architecture

- **Frontend**: Next.js (port 3000)
- **Backend API**: Fastify (port 3001)
- **Database**: PostgreSQL 16
- **Cache**: Redis
- **Storage**: MinIO (S3-compatible)
- **Blockchain**: MockChainAdapter (testnet)

## GitHub Actions CI/CD

Automatic deployment on push to main:
1. Runs tests (non-blocking)
2. Builds Docker image
3. Pushes to GHCR
4. Deploys to Railway (requires RAILWAY_TOKEN)

## Support

For issues or questions about the deployment, check:
- Railway logs: `railway logs -f`
- Application health: `https://moonbite-merchant-production.up.railway.app/health`
- GitHub Actions: https://github.com/moonbitecoin/merchant/actions
