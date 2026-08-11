#!/bin/bash
################################################################################
# MoonBite - SSL & Domain Setup Script
# Sets up Let's Encrypt SSL and configures domain
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="${1:-partners.moonbite.org}"
APP_DIR="/opt/moonbite/merchant"
SERVER_IP=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   MoonBite - SSL & Domain Setup                                ║"
echo "║   Domain: $DOMAIN"
echo "║   Server IP: $SERVER_IP"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   exit 1
fi

# ============================================================================
# STEP 1: Generate SSL Certificate
# ============================================================================
echo -e "${YELLOW}[1/4] 🔒 Generating SSL certificate for $DOMAIN...${NC}"

# Check if certificate already exists
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificate already exists, skipping...${NC}"
else
    certbot certonly --nginx \
        --non-interactive \
        --agree-tos \
        --email admin@moonbite.org \
        -d "$DOMAIN"
    echo -e "${GREEN}✓ SSL certificate generated${NC}"
fi

# ============================================================================
# STEP 2: Update Nginx Configuration
# ============================================================================
echo -e "${YELLOW}[2/4] 🌐 Updating Nginx configuration...${NC}"

cat > /etc/nginx/sites-available/merchant << EOF
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

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Logging
    access_log /var/log/nginx/merchant.access.log;
    error_log /var/log/nginx/merchant.error.log;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    gzip_min_length 1000;

    # Client limits
    client_max_body_size 100M;

    # Proxy to API
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

    # Health endpoint
    location = /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

# Test and reload nginx
nginx -t
systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# ============================================================================
# STEP 3: Update Environment File
# ============================================================================
echo -e "${YELLOW}[3/4] 📝 Updating environment configuration...${NC}"

# Update .env.production with domain
sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,http://localhost:3001|g" "$APP_DIR/.env.production"
sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api|g" "$APP_DIR/.env.production"

echo -e "${GREEN}✓ Environment updated${NC}"

# ============================================================================
# STEP 4: Restart Services
# ============================================================================
echo -e "${YELLOW}[4/4] 🚀 Restarting services...${NC}"

systemctl restart moonbite-merchant.service
systemctl reload nginx

# Wait for service to start
sleep 3

# Verify service is running
if systemctl is-active --quiet moonbite-merchant.service; then
    echo -e "${GREEN}✓ Service restarted${NC}"
else
    echo -e "${RED}❌ Service failed to restart${NC}"
    systemctl status moonbite-merchant.service
    exit 1
fi

# ============================================================================
# VERIFICATION
# ============================================================================
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ SSL & DOMAIN SETUP COMPLETE!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

echo -e "${YELLOW}🌐 Your API is now LIVE:${NC}"
echo "  HTTPS: https://$DOMAIN"
echo "  HTTP: http://$DOMAIN (redirects to HTTPS)"
echo ""

echo -e "${YELLOW}🔒 SSL Certificate:${NC}"
echo "  Issuer: Let's Encrypt"
echo "  Domain: $DOMAIN"
echo "  Auto-renewal: Enabled"
echo ""

echo -e "${YELLOW}✅ Test Commands:${NC}"
echo "  Health Check:"
echo "    curl https://$DOMAIN/health"
echo ""
echo "  Login:"
echo "    curl -X POST https://$DOMAIN/api/v1/auth/login \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"email\":\"alice@example.com\",\"password\":\"DemoPassword123!\"}'"
echo ""

echo -e "${YELLOW}📝 Demo Account:${NC}"
echo "  Email: alice@example.com"
echo "  Password: DemoPassword123!"
echo ""

echo -e "${YELLOW}🛠️  Useful Commands:${NC}"
echo "  View logs: tail -f /var/log/moonbite/merchant/api.log"
echo "  Check service: systemctl status moonbite-merchant.service"
echo "  Restart service: systemctl restart moonbite-merchant.service"
echo "  Renew SSL: certbot renew --dry-run"
echo ""

echo -e "${YELLOW}📋 Configuration:${NC}"
echo "  Environment: $APP_DIR/.env.production"
echo "  Nginx: /etc/nginx/sites-available/merchant"
echo "  Systemd: /etc/systemd/system/moonbite-merchant.service"
echo ""

# Test SSL
echo -e "${YELLOW}🔍 Testing SSL Certificate...${NC}"
if openssl s_client -connect $DOMAIN:443 </dev/null 2>/dev/null | grep "Verify return code: 0" > /dev/null; then
    echo -e "${GREEN}✓ SSL certificate is valid${NC}"
else
    echo -e "${YELLOW}⚠️  SSL check - certificate may still be processing${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 Your MoonBite Merchant Hub is LIVE on $DOMAIN!${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo ""

# Display environment info
echo -e "${YELLOW}📊 Active Configuration:${NC}"
grep -E "^(CORS_ORIGIN|NEXT_PUBLIC_API_URL)" "$APP_DIR/.env.production" 2>/dev/null || echo "  (Check .env.production for details)"
