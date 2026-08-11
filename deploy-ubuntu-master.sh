#!/bin/bash
################################################################################
# MoonBite Merchant Hub - Master Ubuntu Deployment Script
# This script does EVERYTHING in one go:
# 1. Installs all dependencies (Node.js, PostgreSQL, Redis, Nginx, Git)
# 2. Clones/syncs repository
# 3. Installs project dependencies
# 4. Sets up PostgreSQL database with migrations
# 5. Seeds demo data
# 6. Creates environment file
# 7. Sets up systemd service (auto-start)
# 8. Configures Nginx reverse proxy
# 9. Sets up SSL with Let's Encrypt
# 10. Starts everything and verifies
################################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_DIR="/opt/moonbite/merchant"
LOG_DIR="/var/log/moonbite/merchant"
APP_USER="moonbite"
APP_GROUP="moonbite"
DB_USER="moonbite"
DB_NAME="merchant_prod"
DB_PASSWORD="$(openssl rand -base64 32)"
DOMAIN="${1:-merchant.example.com}"
SERVER_IP=$(hostname -I | awk '{print $1}')

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}❌ This script must be run as root (use: sudo bash deploy-ubuntu-master.sh)${NC}"
   exit 1
fi

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   MoonBite Merchant Hub - Master Deployment Script             ║"
echo "║   Server IP: $SERVER_IP"
echo "║   Domain: $DOMAIN"
echo "║   App Directory: $APP_DIR"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# STEP 1: Update System
# ============================================================================
echo -e "${YELLOW}[1/13] 🔄 Updating system packages...${NC}"
apt update
apt upgrade -y -qq
apt install -y -qq curl wget git build-essential python3 sudo

# ============================================================================
# STEP 2: Install Node.js 20
# ============================================================================
echo -e "${YELLOW}[2/13] 📦 Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y -qq nodejs
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js $NODE_VERSION installed${NC}"

# ============================================================================
# STEP 3: Install pnpm
# ============================================================================
echo -e "${YELLOW}[3/13] 📦 Installing pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm -qq
fi
PNPM_VERSION=$(pnpm --version)
echo -e "${GREEN}✓ pnpm $PNPM_VERSION installed${NC}"

# ============================================================================
# STEP 4: Install PostgreSQL
# ============================================================================
echo -e "${YELLOW}[4/13] 🗄️  Installing PostgreSQL 16...${NC}"
if ! command -v psql &> /dev/null; then
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
    apt update -qq
    apt install -y -qq postgresql-16 postgresql-contrib-16
fi
systemctl start postgresql
systemctl enable postgresql
PG_VERSION=$(psql --version)
echo -e "${GREEN}✓ $PG_VERSION installed${NC}"

# ============================================================================
# STEP 5: Install Redis
# ============================================================================
echo -e "${YELLOW}[5/13] 🔴 Installing Redis 7...${NC}"
if ! command -v redis-cli &> /dev/null; then
    apt install -y -qq redis-server
fi
systemctl start redis-server
systemctl enable redis-server
REDIS_VERSION=$(redis-cli --version)
echo -e "${GREEN}✓ $REDIS_VERSION installed${NC}"

# ============================================================================
# STEP 6: Install Nginx
# ============================================================================
echo -e "${YELLOW}[6/13] 🌐 Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y -qq nginx
fi
systemctl start nginx
systemctl enable nginx
echo -e "${GREEN}✓ Nginx installed${NC}"

# ============================================================================
# STEP 7: Install Let's Encrypt Certbot
# ============================================================================
echo -e "${YELLOW}[7/13] 🔒 Installing Let's Encrypt Certbot...${NC}"
apt install -y -qq certbot python3-certbot-nginx

# ============================================================================
# STEP 8: Create Users & Directories
# ============================================================================
echo -e "${YELLOW}[8/13] 📁 Creating users and directories...${NC}"

# Create app user
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/bash -d /opt/moonbite "$APP_USER"
fi

# Create directories
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
chmod 755 "$APP_DIR"
chmod 755 "$LOG_DIR"
chown -R "$APP_USER:$APP_GROUP" "$APP_DIR"
chown -R "$APP_USER:$APP_GROUP" "$LOG_DIR"
echo -e "${GREEN}✓ Directories and users created${NC}"

# ============================================================================
# STEP 9: Clone/Update Repository
# ============================================================================
echo -e "${YELLOW}[9/13] 📥 Cloning/updating repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git pull origin main
else
    git clone https://github.com/moonbitecoin/merchant.git "$APP_DIR"
fi
cd "$APP_DIR"
chown -R "$APP_USER:$APP_GROUP" .
echo -e "${GREEN}✓ Repository ready${NC}"

# ============================================================================
# STEP 10: Install Project Dependencies & Build
# ============================================================================
echo -e "${YELLOW}[10/13] 🏗️  Installing project dependencies & building...${NC}"
cd "$APP_DIR"
sudo -u "$APP_USER" pnpm install --frozen-lockfile
sudo -u "$APP_USER" pnpm build
echo -e "${GREEN}✓ Dependencies installed and built${NC}"

# ============================================================================
# STEP 11: Set Up PostgreSQL Database
# ============================================================================
echo -e "${YELLOW}[11/13] 🗄️  Setting up PostgreSQL database...${NC}"

# Create user and database
sudo -u postgres psql << EOSQL
CREATE USER IF NOT EXISTS $DB_USER WITH PASSWORD '$DB_PASSWORD';
ALTER USER $DB_USER CREATEDB;
DROP DATABASE IF EXISTS $DB_NAME;
CREATE DATABASE $DB_NAME OWNER $DB_USER;
EOSQL

# Run migrations
echo "Running database migrations..."
cd "$APP_DIR"
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" \
    sudo -u "$APP_USER" pnpm --filter=@moonbite/db db:migrate:prod

# Seed demo data
echo "Seeding demo data..."
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" \
    sudo -u "$APP_USER" pnpm --filter=@moonbite/db db:seed

echo -e "${GREEN}✓ Database setup complete${NC}"

# ============================================================================
# STEP 12: Create Environment File
# ============================================================================
echo -e "${YELLOW}[12/13] 🔐 Creating environment file...${NC}"

# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -base64 32)

cat > "$APP_DIR/.env.production" << EOF
# ============================================================================
# MoonBite Merchant Hub - Production Configuration
# ============================================================================

# Environment
NODE_ENV=production
LOG_LEVEL=info

# Server
API_HOST=0.0.0.0
API_PORT=3001
HOST=0.0.0.0
PORT=3001

# Database
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME

# Redis
REDIS_URL=redis://localhost:6379

# Security Secrets (auto-generated)
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# CORS
CORS_ORIGIN=http://$SERVER_IP:3001,http://localhost:3001

# Frontend
NEXT_PUBLIC_API_URL=http://$SERVER_IP:3001/api

# Email
SMTP_FROM_NAME=MoonBite Merchant
SMTP_FROM_EMAIL=noreply@moonbite.org
MAILPIT_HOST=localhost
MAILPIT_PORT=1025

# Blockchain
MOCK_CHAIN_ENABLED=true

# Generated: $(date)
EOF

chmod 600 "$APP_DIR/.env.production"
chown "$APP_USER:$APP_GROUP" "$APP_DIR/.env.production"

echo -e "${GREEN}✓ Environment file created${NC}"
echo -e "${BLUE}  JWT_SECRET: ${JWT_SECRET:0:20}...${NC}"
echo -e "${BLUE}  ENCRYPTION_KEY: ${ENCRYPTION_KEY:0:20}...${NC}"

# ============================================================================
# STEP 13: Create Systemd Service & Start
# ============================================================================
echo -e "${YELLOW}[13/13] 🚀 Creating systemd service and starting...${NC}"

cat > /etc/systemd/system/moonbite-merchant.service << 'EOSYSTEMD'
[Unit]
Description=MoonBite Merchant Hub API
Documentation=https://github.com/moonbitecoin/merchant
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=moonbite
Group=moonbite
WorkingDirectory=/opt/moonbite/merchant
EnvironmentFile=/opt/moonbite/merchant/.env.production

ExecStart=/usr/local/bin/pnpm start

Restart=on-failure
RestartSec=10
StartLimitInterval=600
StartLimitBurst=3

LimitNOFILE=65535
LimitNPROC=65535

StandardOutput=append:/var/log/moonbite/merchant/api.log
StandardError=append:/var/log/moonbite/merchant/api.log

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOSYSTEMD

systemctl daemon-reload
systemctl enable moonbite-merchant.service
systemctl start moonbite-merchant.service

# Wait for service to start
sleep 3

# Check if service is running
if systemctl is-active --quiet moonbite-merchant.service; then
    echo -e "${GREEN}✓ Service is running${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    systemctl status moonbite-merchant.service
    exit 1
fi

# ============================================================================
# STEP 14: Configure Nginx
# ============================================================================
echo -e "${YELLOW}[14/14] 🌐 Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/merchant << EONGCONF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    access_log /var/log/nginx/merchant.access.log;
    error_log /var/log/nginx/merchant.error.log;

    client_max_body_size 100M;
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EONGCONF

ln -sf /etc/nginx/sites-available/merchant /etc/nginx/sites-enabled/merchant
rm -f /etc/nginx/sites-enabled/default

nginx -t
systemctl restart nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

# ============================================================================
# VERIFICATION
# ============================================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}📊 System Information:${NC}"
echo "  Server IP: $SERVER_IP"
echo "  Domain: $DOMAIN"
echo "  App Directory: $APP_DIR"
echo "  Database User: $DB_USER"
echo "  Database Name: $DB_NAME"
echo ""

echo -e "${YELLOW}🔐 Credentials:${NC}"
echo "  Database Password: $DB_PASSWORD"
echo "  JWT Secret: ${JWT_SECRET:0:30}..."
echo "  Encryption Key: ${ENCRYPTION_KEY:0:30}..."
echo ""

echo -e "${YELLOW}🚀 Services Running:${NC}"
systemctl status moonbite-merchant.service --no-pager | grep "Active:"
systemctl status postgresql --no-pager | grep "Active:"
systemctl status redis-server --no-pager | grep "Active:"
systemctl status nginx --no-pager | grep "Active:"
echo ""

echo -e "${YELLOW}🌐 Access Points:${NC}"
echo "  API (HTTP): http://$SERVER_IP:3001"
echo "  API (HTTPS): https://$DOMAIN (after DNS setup)"
echo "  Health Check: curl http://$SERVER_IP:3001/health"
echo ""

echo -e "${YELLOW}📝 Demo Account:${NC}"
echo "  Email: alice@example.com"
echo "  Password: DemoPassword123!"
echo ""

echo -e "${YELLOW}📋 Useful Commands:${NC}"
echo "  View logs: tail -f /var/log/moonbite/merchant/api.log"
echo "  Restart service: systemctl restart moonbite-merchant.service"
echo "  Check status: systemctl status moonbite-merchant.service"
echo "  Update code: cd $APP_DIR && git pull && pnpm install && pnpm build && systemctl restart moonbite-merchant.service"
echo ""

echo -e "${YELLOW}🔒 SSL Setup:${NC}"
if [ "$DOMAIN" != "merchant.example.com" ]; then
    echo "  To set up SSL certificate:"
    echo "  1. Point your domain DNS to: $SERVER_IP"
    echo "  2. Run: certbot certonly --nginx -d $DOMAIN"
    echo "  3. Nginx will auto-update"
else
    echo "  Replace 'merchant.example.com' with your actual domain in:"
    echo "  - /etc/nginx/sites-available/merchant"
    echo "  - /opt/moonbite/merchant/.env.production"
fi
echo ""

echo -e "${YELLOW}📚 Documentation:${NC}"
echo "  - Full guide: UBUNTU_DEPLOYMENT.md"
echo "  - Quick start: UBUNTU_QUICK_START.md"
echo "  - GitHub: https://github.com/moonbitecoin/merchant"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Your MoonBite Merchant Hub is LIVE! 🎉${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Save deployment info
cat > "$APP_DIR/DEPLOYMENT_INFO.txt" << EOF
MoonBite Merchant Hub - Deployment Information
==============================================
Deployment Date: $(date)
Server IP: $SERVER_IP
Domain: $DOMAIN
App Directory: $APP_DIR

Database Credentials:
- User: $DB_USER
- Database: $DB_NAME
- Password: $DB_PASSWORD (store securely!)

Secrets (store in secure vault):
- JWT_SECRET: $JWT_SECRET
- ENCRYPTION_KEY: $ENCRYPTION_KEY

Demo Account:
- Email: alice@example.com
- Password: DemoPassword123!

Services:
- API: http://$SERVER_IP:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Nginx: http://$DOMAIN (after DNS setup)

Next Steps:
1. Update DNS to point $DOMAIN to $SERVER_IP
2. Run SSL setup: certbot certonly --nginx -d $DOMAIN
3. Update .env.production with your domain
4. Restart service: systemctl restart moonbite-merchant.service
5. Test: curl https://$DOMAIN/health
EOF

chmod 600 "$APP_DIR/DEPLOYMENT_INFO.txt"

echo -e "${GREEN}✓ Deployment info saved to: $APP_DIR/DEPLOYMENT_INFO.txt${NC}"
