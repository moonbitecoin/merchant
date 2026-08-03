# MoonBite Merchant Hub - Production Deployment Guide

## Current Status
✅ Code pushed to GitHub: https://github.com/moonbitecoin/merchant
✅ GitHub Actions CI/CD configured
✅ Docker image building automatically
⏳ Awaiting Railway deployment

---

## 🚀 Quick Deploy to Railway (5 minutes)

### Step 1: Create Railway Account
1. Go to https://railway.app
2. Sign up with GitHub account
3. Authorize Railway to access your GitHub repos

### Step 2: Create New Project
1. Click **New Project**
2. Select **GitHub Repo**
3. Search for `moonbitecoin/merchant`
4. Click **Deploy**
5. Railway will auto-detect the `railway.json` config

### Step 3: Add Services

**PostgreSQL 16:**
- Click **Add Service** → **Database** → **PostgreSQL**
- Railway creates service and auto-links `DATABASE_URL`

**Redis 7:**
- Click **Add Service** → **Database** → **Redis**
- Railway creates service and auto-links `REDIS_URL`

### Step 4: Add Environment Variables

Click on the **web** service → **Variables** tab, paste these:

```
JWT_SECRET=484e5b76594d193596e2b24d07df4d44d6b621628880d51f98c8f8e6567deb47
ENCRYPTION_MASTER_KEY=3a667a65e4a3763bf8e248483c95a62e73bdd594004e248867f8a1766dbd0157
CORS_ORIGIN=https://merchant.moonbite.org
MINIO_ENDPOINT=https://minio.moonbite.org
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
SENDGRID_API_KEY=SG.your_key_here
LOG_LEVEL=info
NODE_ENV=production
PORT=3001
```

**Then** click on the **api** service and add the same variables (except PORT changes to 3001 for api)

### Step 5: Get GitHub Personal Token (for auto-deploy)

1. Go to https://railway.app/dashboard
2. Click Account (top-right) → **Tokens**
3. Click **Create Token**
4. Copy the token

### Step 6: Add Railway Token to GitHub Secrets

1. Go to https://github.com/moonbitecoin/merchant/settings/secrets/actions
2. Click **New repository secret**
3. **Name:** `RAILWAY_TOKEN`
4. **Value:** (paste token from Step 5)
5. Click **Add secret**

### Step 7: Run Database Migrations

Once PostgreSQL is ready in Railway:

1. Copy the `DATABASE_URL` from Railway PostgreSQL service
2. In your local terminal:
   ```bash
   cd "C:\Users\usman\Desktop\MARCHANT"
   export DATABASE_URL="postgresql://username:password@host:port/railway"
   pnpm db:migrate:deploy
   ```

### Step 8: Deploy

Make a test commit to trigger auto-deployment:

```bash
cd "C:\Users\usman\Desktop\MARCHANT"
git commit --allow-empty -m "Deploy to Railway"
git push origin main
```

Check GitHub Actions: https://github.com/moonbitecoin/merchant/actions
- Workflow runs: lint → typecheck → test → build → deploy
- Watch for all jobs to turn ✅ green

### Step 9: Access Your Live App

Once deployed:
1. Go to Railway dashboard
2. Click the **web** service
3. Go to **Deployment** tab
4. Copy the Railway domain (e.g., `https://moonbite-web-prod.railway.app`)
5. Open it in browser

---

## 🔐 Production Environment Variables

**Critical Secrets** (already generated, keep secure):
```
JWT_SECRET=484e5b76594d193596e2b24d07df4d44d6b621628880d51f98c8f8e6567deb47
ENCRYPTION_MASTER_KEY=3a667a65e4a3763bf8e248483c95a62e73bdd594004e248867f8a1766dbd0157
```

**Configure these with your actual values:**
- `MINIO_ENDPOINT` - Your MinIO S3 storage URL
- `MINIO_ACCESS_KEY` - MinIO access key
- `MINIO_SECRET_KEY` - MinIO secret key
- `SENDGRID_API_KEY` - SendGrid email service key
- `CORS_ORIGIN` - Your production domain

---

## 📋 Pre-Deployment Checklist

- [ ] GitHub repository created: https://github.com/moonbitecoin/merchant
- [ ] Code pushed to `main` branch
- [ ] GitHub Actions workflow passing (test, build jobs green)
- [ ] Railway account created
- [ ] PostgreSQL & Redis services created in Railway
- [ ] Environment variables added to both **web** and **api** services
- [ ] `RAILWAY_TOKEN` added to GitHub secrets
- [ ] Database migrations run successfully
- [ ] Test commit pushed to trigger auto-deploy
- [ ] Deployment job completed in GitHub Actions
- [ ] App accessible at Railway domain
- [ ] Custom domain configured (optional, use Railway subdomain for now)

---

## 🧪 Verification Steps

After deployment completes:

1. **Check API Health:**
   ```bash
   curl https://your-railway-domain/health
   ```
   Expected: `{"status":"ok"}`

2. **Check Dashboard:**
   Open `https://your-railway-domain` in browser
   Should see login page

3. **Check GitHub Actions:**
   https://github.com/moonbitecoin/merchant/actions
   All jobs should be green ✅

4. **Check Railway Logs:**
   Railway dashboard → **web** service → **Logs**
   Should see: "Listening on port 3000" (frontend) and "API ready on port 3001" (backend)

---

## 🚨 Troubleshooting

**Build fails with "pnpm: command not found"**
- Node.js version: GitHub Actions uses Node 20+, Railway uses latest from Dockerfile
- Solution: Verify `Dockerfile` has correct Node version (should be `node:20-alpine`)

**Database connection fails**
- Check `DATABASE_URL` format: `postgresql://user:password@host:5432/dbname`
- Ensure PostgreSQL service is running in Railway
- Check environment variables are set on **both** web and api services

**Deployment gets stuck**
- Check Railway logs for errors
- Verify `RAILWAY_TOKEN` has correct permissions
- Try manual re-deploy: Railway dashboard → **Deploy** button

**App doesn't respond**
- Check if services are running: Railway dashboard → services should show "Running"
- Check if correct PORT is set (3001 for api, 3000 for web)
- Look at Railway logs for startup errors

---

## 📞 Support

- GitHub Actions docs: https://docs.github.com/actions
- Railway docs: https://docs.railway.app
- Deployment logs available in:
  - GitHub Actions: https://github.com/moonbitecoin/merchant/actions
  - Railway: Dashboard → Service → Logs

---

**Status**: Ready for Railway deployment
**Last Updated**: 2026-08-03
