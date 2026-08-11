# MoonBite Merchant Hub - DigitalOcean App Platform Deployment

Complete guide to deploy MoonBite Merchant Hub on DigitalOcean App Platform with managed PostgreSQL and Redis.

## Prerequisites

- DigitalOcean account ([sign up](https://digitalocean.com))
- GitHub account with forked/pushed repository
- Domain name (optional, can use `*.digitalocean.app`)
- ~15 minutes to complete setup

## Step 1: Generate Required Secrets

Before deploying, generate secure values for:

```bash
# Generate JWT_SECRET (256-bit random)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (256-bit random for AES-256-GCM)
openssl rand -base64 32
```

Save these values - you'll need them in the DigitalOcean console.

**Example Output:**
```
JWT_SECRET: K2nr9vL8pQ3xY5zM1bJ6kW4cD9eF2hI7uR8sT0aB3
ENCRYPTION_KEY: aB9cD2eF4gH6iJ8kL0mN2oP4qR6sT8uV0wX2yZ4aB
```

## Step 2: Create DigitalOcean App

1. Go to [DigitalOcean Console](https://cloud.digitalocean.com)
2. Click **Create** → **Apps**
3. Select **GitHub** repository:
   - Repo: `moonbitecoin/merchant`
   - Branch: `main`
4. Click **Next**

## Step 3: Configure Services

The app.yaml file is already created. DigitalOcean will auto-detect:
- **Service**: API (Node.js + Fastify)
- **Databases**: PostgreSQL 16 + Redis 7
- **Jobs**: Database migrations & seeding

### Edit Resource Allocation

In the DigitalOcean console, adjust:

| Component | Recommended |
|-----------|-------------|
| API Service | Basic (512 MB) |
| PostgreSQL | Basic ($15/mo, 1GB) |
| Redis | Basic ($15/mo, 256MB) |
| **Total** | **~$30/month** |

## Step 4: Set Environment Variables

In DigitalOcean console, add these secrets:

### Database Secrets (Auto-Generated)
```
db.connection_string = (auto-populated)
redis.connection_string = (auto-populated)
```

### Required Manual Secrets

| Key | Value | Example |
|-----|-------|---------|
| `JWT_SECRET` | Your generated secret (32 bytes base64) | `K2nr9vL8pQ3x...` |
| `ENCRYPTION_KEY` | Your generated encryption key (32 bytes base64) | `aB9cD2eF4gH6...` |

**How to add secrets in DO:**
1. In "Environment" section
2. Click **"Add a Secret"**
3. Paste key and value
4. Mark as "Encrypt this value"

## Step 5: Configure Custom Domain (Optional)

### Option A: Use DigitalOcean's Free Domain
- Auto-assigned: `moonbite-merchant-xxxxx.ondigitalocean.app`
- No additional setup needed

### Option B: Use Custom Domain

1. In DigitalOcean console, click **Settings** → **Domains**
2. Add your domain (e.g., `merchant.moonbite.org`)
3. Add DNS records:
   ```
   Type: CNAME
   Name: merchant
   Value: moonbite-merchant-xxxxx.ondigitalocean.app
   ```
4. Wait for DNS propagation (~5-10 minutes)

## Step 6: Deploy

1. Click **Create App**
2. DigitalOcean will:
   - Build Docker image from Dockerfile
   - Provision PostgreSQL and Redis
   - Run database migrations
   - Seed demo data
   - Deploy API service
   - Issue SSL certificate (automatic)
3. Monitor progress in **Deployment** tab (~8-10 minutes)

### First Deployment Status Checks

```bash
# Check health endpoint
curl https://moonbite-merchant-xxxxx.ondigitalocean.app/health

# Test login (demo account)
curl -X POST https://moonbite-merchant-xxxxx.ondigitalocean.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"DemoPassword123!"}'
```

## Step 7: Configure Frontend (Next.js)

If deploying frontend separately:

1. Create second DigitalOcean App for `apps/web`
2. Set environment:
   ```
   NEXT_PUBLIC_API_URL=https://api.moonbite.org
   NODE_ENV=production
   ```
3. Build command: `pnpm install && pnpm --filter=@moonbite/web build`
4. Start command: `pnpm --filter=@moonbite/web start`

## Post-Deployment Checklist

- ✅ Health check returns `{"status":"ok"}`
- ✅ Demo login works (alice@example.com)
- ✅ JWT tokens issued correctly
- ✅ SSL certificate active (green lock in browser)
- ✅ Database backups configured
- ✅ Logs accessible in DigitalOcean console

## Database Management

### Access PostgreSQL

```bash
# Connect from DO console (App → Database → Settings)
# Or use cloud shell:
psql -U doadmin -h merchant-db-prod.ondigitalocean.com -d merchant_prod
```

### Backup & Recovery

DigitalOcean automatically:
- Creates daily backups (14-day retention)
- Point-in-time recovery available
- Access via console: Database → Backups

### Run Database Commands

To run migrations or seeds after deployment:

1. DigitalOcean console → **Jobs**
2. Click `db-migrate` or `db-seed`
3. Click **Run Now**

## Monitoring & Logs

### View Application Logs

```bash
# Via DigitalOcean Console:
# Apps → moonbite-merchant → Runtime logs

# Key logs to watch:
# - "[INFO] Syncing database schema..."
# - "[INFO] Database schema sync completed"
# - "🚀 MoonBite API running at"
```

### View Database Logs

```bash
# Via DigitalOcean Console:
# Databases → postgres → Logs
```

### Set Up Alerts

1. DigitalOcean console → **Monitoring**
2. Configure alerts for:
   - CPU usage > 80%
   - Memory usage > 90%
   - Database connections > 80%

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Runtime mode | `production` |
| `JWT_SECRET` | Token signing key | (32 bytes base64) |
| `ENCRYPTION_KEY` | File encryption key | (32 bytes base64) |
| `DATABASE_URL` | PostgreSQL connection | (auto from DB) |
| `REDIS_URL` | Redis connection | (auto from Redis) |
| `CORS_ORIGIN` | Allowed origins | `https://merchant.moonbite.org` |
| `NEXT_PUBLIC_API_URL` | Frontend API endpoint | `https://api.moonbite.org` |
| `SMTP_FROM_EMAIL` | Email sender | `noreply@moonbite.org` |

## Troubleshooting

### "Cannot connect to database"
- Check DATABASE_URL is correct
- Verify PostgreSQL is running (console → Database)
- Check inbound rules allow app connection

### "Module not found errors"
- Ensure `pnpm-lock.yaml` is in repository
- Check Node version (20.x required)
- See build logs in DigitalOcean console

### "502 Bad Gateway"
- App is still starting (wait 2-3 min)
- Check health endpoint: `/health`
- View logs: Apps → Runtime logs

### "Schema sync failed"
- Database migrations/push may have failed
- Check job logs: Apps → Jobs → db-migrate
- Manually run via console if needed

## Cost Breakdown

| Component | Cost | Notes |
|-----------|------|-------|
| API (Basic) | $6/mo | 512 MB RAM, auto-scaling |
| PostgreSQL (Basic) | $15/mo | 1 GB, 1 CPU, daily backups |
| Redis (Basic) | $15/mo | 256 MB RAM |
| **Total** | **$36/mo** | Less than Railway comparable |

### Cost Optimization Tips

- Start with "Starter" plan and scale up if needed
- Use DigitalOcean's free tier for development
- PostgreSQL can be downgraded to $12/mo if storage is low

## Scaling Beyond Basic

When you need more capacity:

1. **CPU/Memory**: Upgrade App Spec (Basic → Professional)
2. **Database**: PostgreSQL Managed Database → upgrade plan
3. **Caching**: Redis → Cluster (for high traffic)
4. **CDN**: Add DigitalOcean Spaces (static assets)

## Next Steps

1. **Domain Setup**: Point your custom domain to DO app
2. **Monitoring**: Set up Slack/email alerts
3. **Backups**: Configure automated database backups
4. **Frontend**: Deploy Next.js frontend to separate App
5. **Email**: Configure real SMTP server (Mailgun/SendGrid)

## Support

- DigitalOcean Docs: https://docs.digitalocean.com/products/app-platform/
- GitHub Issues: https://github.com/moonbitecoin/merchant/issues
- Status: Check /health endpoint

---

**Deployment successful!** 🚀
Your MoonBite Merchant Hub is now live on DigitalOcean App Platform.
