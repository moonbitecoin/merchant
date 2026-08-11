# MoonBite on DigitalOcean - 5-Minute Quick Start

## 1️⃣ Generate Secrets (2 min)

Run these commands to generate secure values:

```bash
# Copy & run these in your terminal:
echo "JWT_SECRET: $(openssl rand -base64 32)"
echo "ENCRYPTION_KEY: $(openssl rand -base64 32)"
```

**Save the output** - you'll paste these into DigitalOcean.

## 2️⃣ Create DigitalOcean App (3 min)

### Via DigitalOcean Console:

1. Go to https://cloud.digitalocean.com
2. Click **Create** → **Apps** → **GitHub**
3. Select Repository:
   - Owner: `moonbitecoin`
   - Repo: `merchant`
   - Branch: `main`
4. Click **Next**

### DigitalOcean Auto-Detects:
✅ Dockerfile for building
✅ PostgreSQL & Redis databases
✅ API service configuration

## 3️⃣ Add Environment Secrets

In "Environment" tab, add these 2 secrets:

| Key | Value |
|-----|-------|
| `JWT_SECRET` | Paste output from step 1 |
| `ENCRYPTION_KEY` | Paste output from step 1 |

**How:** Click "Add a Secret" → Paste → Enable "Encrypt this value"

## 4️⃣ Deploy

1. Click **Create App**
2. Wait for build & deployment (~8-10 min)
3. You'll see:
   - ✅ Build succeeded
   - ✅ Databases created (postgres, redis)
   - ✅ API running
   - ✅ SSL certificate issued

## 5️⃣ Test It Works

```bash
# Get your app URL from DigitalOcean console
# Then run:

# Health check
curl https://moonbite-merchant-xxxxx.ondigitalocean.app/health

# Login test
curl -X POST https://moonbite-merchant-xxxxx.ondigitalocean.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"DemoPassword123!"}'
```

### Expected Response:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "merchant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "alice@example.com",
    "name": "Alice Smith - Software Developer"
  }
}
```

## ✅ Done!

Your MoonBite Merchant Hub is **LIVE** on DigitalOcean! 🎉

### What's Running:
- 🔵 **API**: Fastify backend on Node.js 20
- 🟢 **Database**: PostgreSQL 16 (managed)
- 🔴 **Cache**: Redis 7 (managed)
- 🔒 **SSL**: Auto-configured & renewed

### Demo Account:
```
Email: alice@example.com
Password: DemoPassword123!
```

### Next Steps:
1. **Custom Domain**: Update DNS to point to your DO app
2. **Frontend**: Deploy Next.js app to separate DigitalOcean App
3. **Monitoring**: Enable alerts in DigitalOcean console
4. **Backups**: Already enabled (14-day retention)

---

**Need Help?** See `DEPLOYMENT_DIGITALOCEAN.md` for detailed guide.
