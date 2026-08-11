# MoonBite Merchant Hub - Ubuntu Server Deployment

Complete guide to deploy MoonBite Merchant Hub on your existing Ubuntu server.

## Prerequisites

- Ubuntu 20.04+ (with sudo access)
- Domain name pointing to server IP
- Existing server with internet connectivity
- ~30 minutes for setup

## Step 1: SSH into Ubuntu Server

```bash
ssh root@YOUR_SERVER_IP
# or
ssh username@YOUR_SERVER_IP
```

## Step 2: Install System Dependencies

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
sudo npm install -g pnpm

# Install PostgreSQL 16
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install nginx (reverse proxy)
sudo apt install -y nginx

# Install git
sudo apt install -y git

# Install build tools
sudo apt install -y build-essential python3

# Verify installations
node --version  # v20.x.x
pnpm --version  # 8.x.x
psql --version  # PostgreSQL 16.x
redis-cli --version  # Redis version 7.x
nginx -v  # nginx/x.x.x
```

## Step 3: Set Up Directories

```bash
# Create app directory
sudo mkdir -p /opt/moonbite/merchant
sudo chown -R $(whoami):$(whoami) /opt/moonbite

# Create logs directory
sudo mkdir -p /var/log/moonbite/merchant
sudo chown -R $(whoami):$(whoami) /var/log/moonbite
```

## Step 4: Clone or Upload Repository

### Option A: Clone from GitHub
```bash
cd /opt/moonbite
git clone https://github.com/moonbitecoin/merchant.git merchant
cd merchant
```

### Option B: Upload Existing Folder
```bash
# From your local machine:
scp -r /path/to/MARCHANT root@YOUR_SERVER_IP:/opt/moonbite/merchant

# Then on server:
cd /opt/moonbite/merchant
```

## Step 5: Install Dependencies

```bash
cd /opt/moonbite/merchant

# Install pnpm dependencies
pnpm install --frozen-lockfile

# Build the project
pnpm build
```

## Step 6: Set Up PostgreSQL Database

```bash
# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER moonbite WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE merchant_prod OWNER moonbite;
ALTER USER moonbite CREATEDB;
\q
EOF

# Run migrations
cd /opt/moonbite/merchant
DATABASE_URL="postgresql://moonbite:your_secure_password_here@localhost:5432/merchant_prod" \
  pnpm --filter=@moonbite/db db:migrate:prod

# Seed demo data
DATABASE_URL="postgresql://moonbite:your_secure_password_here@localhost:5432/merchant_prod" \
  pnpm --filter=@moonbite/db db:seed
```

## Step 7: Set Up Redis

```bash
# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Output: PONG
```

## Step 8: Create Environment File

```bash
cat > /opt/moonbite/merchant/.env.production << 'EOF'
# Environment
NODE_ENV=production
LOG_LEVEL=info

# Server
API_HOST=0.0.0.0
API_PORT=3001
HOST=0.0.0.0
PORT=3001

# Database
DATABASE_URL=postgresql://moonbite:your_secure_password_here@localhost:5432/merchant_prod

# Redis
REDIS_URL=redis://localhost:6379

# Security (use generated secrets from deployment)
JWT_SECRET=yAk83ieldaYDWuSzM4eYmPSADYGWht9MEKUhewLKuBc=
ENCRYPTION_KEY=T7FPuqenC2EmHzvAYp0PKp5Wt4080pcxZP4Thcx9kIU=

# CORS
CORS_ORIGIN=https://merchant.example.com

# Frontend
NEXT_PUBLIC_API_URL=https://merchant.example.com/api

# Email
SMTP_FROM_NAME=MoonBite Merchant
SMTP_FROM_EMAIL=noreply@moonbite.org
MAILPIT_HOST=localhost
MAILPIT_PORT=1025

EOF

# Restrict permissions
chmod 600 /opt/moonbite/merchant/.env.production
```

## Step 9: Create Systemd Service

```bash
sudo tee /etc/systemd/system/moonbite-merchant.service > /dev/null << 'EOF'
[Unit]
Description=MoonBite Merchant Hub API
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

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

# Resource limits
LimitNOFILE=65535
LimitNPROC=65535

[Install]
WantedBy=multi-user.target
EOF

# Replace $USER with actual username
sudo sed -i "s/\$USER/$(whoami)/g" /etc/systemd/system/moonbite-merchant.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable moonbite-merchant.service
sudo systemctl start moonbite-merchant.service

# Check status
sudo systemctl status moonbite-merchant.service
```

## Step 10: Configure Nginx Reverse Proxy

```bash
sudo tee /etc/nginx/sites-available/merchant.example.com > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name merchant.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name merchant.example.com;

    # SSL certificates (configure after setup)
    ssl_certificate /etc/letsencrypt/live/merchant.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/merchant.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/merchant.access.log;
    error_log /var/log/nginx/merchant.error.log;

    # Proxy to API
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Replace domain name
sudo sed -i 's/merchant.example.com/YOUR_DOMAIN_HERE/g' /etc/nginx/sites-available/merchant.example.com

# Enable site
sudo ln -sf /etc/nginx/sites-available/merchant.example.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## Step 11: Set Up SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate (replace domain)
sudo certbot certonly --nginx \
  --non-interactive \
  --agree-tos \
  --email admin@moonbite.org \
  -d merchant.example.com

# Verify certificate
sudo certbot certificates
```

## Step 12: Verify Deployment

```bash
# Check service status
sudo systemctl status moonbite-merchant.service

# Check logs
tail -f /var/log/moonbite/merchant/api.log

# Test health endpoint
curl https://merchant.example.com/health

# Test login
curl -X POST https://merchant.example.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"DemoPassword123!"}'
```

## Step 13: Set Up Log Rotation

```bash
sudo tee /etc/logrotate.d/moonbite > /dev/null << 'EOF'
/var/log/moonbite/merchant/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 $USER $USER
    sharedscripts
    postrotate
        systemctl reload moonbite-merchant.service > /dev/null 2>&1 || true
    endscript
}
EOF

sudo sed -i "s/\$USER/$(whoami)/g" /etc/logrotate.d/moonbite
```

## Step 14: Set Up Automatic Restarts

```bash
# Add to crontab
crontab -e

# Add these lines:
# Weekly restart (Sunday 2 AM)
0 2 * * 0 sudo systemctl restart moonbite-merchant.service

# Daily database backup (3 AM)
0 3 * * * sudo -u postgres pg_dump merchant_prod | gzip > /var/backups/merchant_$(date +\%Y\%m\%d).sql.gz
```

---

# 📋 Daily Operations

## View Logs
```bash
# Real-time logs
tail -f /var/log/moonbite/merchant/api.log

# Last 100 lines
tail -100 /var/log/moonbite/merchant/api.log

# Search for errors
grep ERROR /var/log/moonbite/merchant/api.log
```

## Restart Service
```bash
sudo systemctl restart moonbite-merchant.service
```

## Check Service Status
```bash
sudo systemctl status moonbite-merchant.service
sudo systemctl is-active moonbite-merchant.service
```

## Database Backup
```bash
sudo -u postgres pg_dump merchant_prod | gzip > /var/backups/merchant_backup.sql.gz
```

## Database Restore
```bash
gunzip < /var/backups/merchant_backup.sql.gz | sudo -u postgres psql merchant_prod
```

## Update Application
```bash
cd /opt/moonbite/merchant
git pull origin main
pnpm install --frozen-lockfile
pnpm build
sudo systemctl restart moonbite-merchant.service
```

---

# 🔒 Security Checklist

- ✅ Use strong PostgreSQL password
- ✅ Enable firewall (UFW)
- ✅ SSH key-based authentication only
- ✅ Regular backups
- ✅ SSL/TLS certificates auto-renewed
- ✅ Rate limiting enabled in app
- ✅ Log monitoring

```bash
# Enable UFW firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

---

# 📊 System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 1 core | 2+ cores |
| RAM | 1 GB | 2+ GB |
| Storage | 10 GB | 50+ GB |
| OS | Ubuntu 20.04+ | Ubuntu 22.04+ |

---

# 🆘 Troubleshooting

## Service won't start
```bash
sudo systemctl status moonbite-merchant.service
journalctl -u moonbite-merchant.service -n 50
```

## Database connection error
```bash
# Test PostgreSQL connection
psql -U moonbite -d merchant_prod -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql
```

## Nginx proxy issues
```bash
# Test nginx
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Redis connection error
```bash
# Test Redis
redis-cli ping

# Check Redis status
sudo systemctl status redis-server
```

---

# 📚 Useful Links

- PostgreSQL: https://www.postgresql.org/docs/
- Redis: https://redis.io/documentation
- Nginx: https://nginx.org/en/docs/
- Certbot: https://certbot.eff.org/
- Ubuntu: https://ubuntu.com/

---

**Deployment complete!** Your MoonBite Merchant Hub is now running on Ubuntu. 🎉
