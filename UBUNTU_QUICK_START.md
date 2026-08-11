# Ubuntu Deployment - 10-Minute Quick Start

Deploy MoonBite Merchant Hub to your existing Ubuntu server in 10 minutes.

## Prerequisites

- Ubuntu 20.04+ server running
- SSH access to server
- Domain name (optional, can test with IP)
- ~10 minutes

## 🚀 Quick Setup

### 1️⃣ SSH into your server (1 min)

```bash
ssh root@YOUR_SERVER_IP
```

### 2️⃣ Run automated setup script (3 min)

```bash
# Download setup script
curl -fsSL https://raw.githubusercontent.com/moonbitecoin/merchant/main/ubuntu-setup.sh -o setup.sh

# Run it
sudo bash setup.sh
```

**What it installs:**
✅ Node.js 20
✅ PostgreSQL 16
✅ Redis 7
✅ Nginx
✅ Create directories & logs

### 3️⃣ Clone or upload merchant folder (2 min)

```bash
# Option A: Clone from GitHub
cd /opt/moonbite
sudo git clone https://github.com/moonbitecoin/merchant.git
cd merchant

# Option B: Or if you already uploaded it
cd /opt/moonbite/merchant
```

### 4️⃣ Install dependencies & build (2 min)

```bash
cd /opt/moonbite/merchant
pnpm install --frozen-lockfile
pnpm build
```

### 5️⃣ Set up database (1 min)

```bash
# Create PostgreSQL user and database
sudo -u postgres psql << EOF
CREATE USER moonbite WITH PASSWORD 'secure_password_123';
CREATE DATABASE merchant_prod OWNER moonbite;
ALTER USER moonbite CREATEDB;
\q
EOF

# Run migrations
DATABASE_URL="postgresql://moonbite:secure_password_123@localhost:5432/merchant_prod" \
  pnpm --filter=@moonbite/db db:migrate:prod

# Seed demo data
DATABASE_URL="postgresql://moonbite:secure_password_123@localhost:5432/merchant_prod" \
  pnpm --filter=@moonbite/db db:seed
```

### 6️⃣ Create environment file (1 min)

```bash
cat > /opt/moonbite/merchant/.env.production << 'EOF'
NODE_ENV=production
LOG_LEVEL=info
API_HOST=0.0.0.0
API_PORT=3001
DATABASE_URL=postgresql://moonbite:secure_password_123@localhost:5432/merchant_prod
REDIS_URL=redis://localhost:6379
JWT_SECRET=yAk83ieldaYDWuSzM4eYmPSADYGWht9MEKUhewLKuBc=
ENCRYPTION_KEY=T7FPuqenC2EmHzvAYp0PKp5Wt4080pcxZP4Thcx9kIU=
CORS_ORIGIN=http://YOUR_SERVER_IP:3001
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:3001/api
SMTP_FROM_NAME=MoonBite Merchant
SMTP_FROM_EMAIL=noreply@moonbite.org
MAILPIT_HOST=localhost
MAILPIT_PORT=1025
EOF

chmod 600 /opt/moonbite/merchant/.env.production
```

## ✅ Start the Server

### Option A: Run directly (quick test)
```bash
cd /opt/moonbite/merchant
pnpm start
```

You should see:
```
✓ Database schema sync completed
🚀 MoonBite API running at http://0.0.0.0:3001
```

Press `Ctrl+C` to stop.

### Option B: Run as background service (permanent)

```bash
# Create systemd service
sudo tee /etc/systemd/system/moonbite-merchant.service > /dev/null << 'EOF'
[Unit]
Description=MoonBite Merchant Hub
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/moonbite/merchant
EnvironmentFile=/opt/moonbite/merchant/.env.production
ExecStart=/usr/local/bin/pnpm start
Restart=on-failure
RestartSec=10
StandardOutput=append:/var/log/moonbite/merchant/api.log
StandardError=append:/var/log/moonbite/merchant/api.log

[Install]
WantedBy=multi-user.target
EOF

# Replace $USER with your actual username
sudo sed -i "s/\$USER/$(whoami)/g" /etc/systemd/system/moonbite-merchant.service

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable moonbite-merchant.service
sudo systemctl start moonbite-merchant.service

# Check status
sudo systemctl status moonbite-merchant.service
```

## 🔍 Test It Works

```bash
# Health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"DemoPassword123!"}'
```

### Expected response:
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "merchant": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "alice@example.com",
    "name": "Alice Smith"
  }
}
```

✅ **If you see this, it's working!**

## 📝 Demo Account

```
Email: alice@example.com
Password: DemoPassword123!
```

## 🌐 Optional: Set Up Nginx Reverse Proxy

If you want to use a domain and SSL:

```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/merchant << 'EOF'
server {
    listen 80;
    server_name YOUR_DOMAIN;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# Enable it
sudo ln -sf /etc/nginx/sites-available/merchant /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test & restart
sudo nginx -t
sudo systemctl restart nginx

# Install SSL (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --nginx -d YOUR_DOMAIN
```

## 🛠️ Common Commands

```bash
# View logs
tail -f /var/log/moonbite/merchant/api.log

# Restart service
sudo systemctl restart moonbite-merchant.service

# Stop service
sudo systemctl stop moonbite-merchant.service

# Start service
sudo systemctl start moonbite-merchant.service

# Check status
sudo systemctl status moonbite-merchant.service

# Update code
cd /opt/moonbite/merchant
git pull origin main
pnpm install
pnpm build
sudo systemctl restart moonbite-merchant.service
```

## 📊 System Info

```bash
# Check Node version
node --version

# Check pnpm version
pnpm --version

# Check PostgreSQL status
sudo systemctl status postgresql

# Check Redis status
sudo systemctl status redis-server

# Check Nginx status
sudo systemctl status nginx

# Check app status
sudo systemctl status moonbite-merchant.service
```

## 🔒 Security Tips

```bash
# Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS

# Check firewall
sudo ufw status
```

## ✨ What's Running Now

| Service | Port | Status |
|---------|------|--------|
| API | 3001 | ✅ Running |
| PostgreSQL | 5432 | ✅ Running |
| Redis | 6379 | ✅ Running |
| Nginx | 80/443 | ✅ Running |

## 📚 Full Documentation

For complete setup guide: `UBUNTU_DEPLOYMENT.md`

---

**🎉 Deployment complete!**

Your MoonBite Merchant Hub is now running on Ubuntu!
