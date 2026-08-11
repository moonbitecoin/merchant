#!/bin/bash
################################################################################
# MoonBite - SSL Setup with DNS Wait
# Waits for DNS to propagate, then generates SSL certificate
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
MAX_WAIT=300  # 5 minutes max wait
WAIT_INTERVAL=10  # Check every 10 seconds

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║   MoonBite - SSL Setup (with DNS Wait)                        ║"
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
# STEP 1: Wait for DNS Propagation
# ============================================================================
echo -e "${YELLOW}[1/5] 🌐 Waiting for DNS propagation...${NC}"
echo "  Domain: $DOMAIN"
echo "  Expected IP: $SERVER_IP"
echo ""

ELAPSED=0
DNS_READY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
    echo -n "Checking DNS... "

    # Try to resolve domain
    RESOLVED_IP=$(nslookup "$DOMAIN" 8.8.8.8 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}' || true)

    if [ "$RESOLVED_IP" = "$SERVER_IP" ]; then
        echo -e "${GREEN}✓ DNS is ready! ($RESOLVED_IP)${NC}"
        DNS_READY=true
        break
    else
        echo -e "${YELLOW}Not ready yet (got: ${RESOLVED_IP:-nothing})${NC}"
        ELAPSED=$((ELAPSED + WAIT_INTERVAL))
        if [ $ELAPSED -lt $MAX_WAIT ]; then
            echo "  Waiting ${WAIT_INTERVAL}s before retry... (${ELAPSED}/${MAX_WAIT}s)"
            sleep $WAIT_INTERVAL
        fi
    fi
done

if [ "$DNS_READY" = false ]; then
    echo -e "${RED}❌ DNS did not propagate after 5 minutes${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check your DNS provider to confirm record is set to: $SERVER_IP"
    echo "2. Try: nslookup $DOMAIN 8.8.8.8"
    echo "3. Try: dig $DOMAIN +short"
    echo "4. DNS can take up to 24 hours to fully propagate"
    echo "5. Once DNS is ready, run: sudo bash setup-ssl-domain.sh $DOMAIN"
    exit 1
fi

echo ""

# ============================================================================
# STEP 2: Generate SSL Certificate
# ============================================================================
echo -e "${YELLOW}[2/5] 🔒 Generating SSL certificate...${NC}"

if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✓ Certificate already exists${NC}"
else
    certbot certonly --nginx \
        --non-interactive \
        --agree-tos \
        --email admin@moonbite.org \
        -d "$DOMAIN"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL certificate generated${NC}"
    else
        echo -e "${RED}❌ Failed to generate certificate${NC}"
        exit 1
    fi
fi

# ============================================================================
# STEP 3: Update Nginx Configuration
# ============================================================================
echo -e "${YELLOW}[3/5] 🌐 Updating Nginx configuration...${NC}"

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
nginx -t > /dev/null
systemctl reload nginx
echo -e "${GREEN}✓ Nginx configured${NC}"

# ============================================================================
# STEP 4: Update Environment File
# ============================================================================
echo -e "${YELLOW}[4/5] 📝 Updating environment configuration...${NC}"

if [ -f "$APP_DIR/.env.production" ]; then
    sed -i "s|CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,http://localhost:3001|g" "$APP_DIR/.env.production"
    sed -i "s|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://$DOMAIN/api|g" "$APP_DIR/.env.production"
    echo -e "${GREEN}✓ Environment updated${NC}"
fi

# ============================================================================
# STEP 5: Restart Services
# ============================================================================
echo -e "${YELLOW}[5/5] 🚀 Restarting services...${NC}"

systemctl restart moonbite-merchant.service
systemctl reload nginx

sleep 2

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

echo -e "${YELLOW}🎉 Your API is now LIVE on:${NC}"
echo -e "${GREEN}  ✓ https://$DOMAIN${NC}"
echo ""

echo -e "${YELLOW}🔒 SSL Certificate Information:${NC}"
CERT_INFO=$(openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -text -noout 2>/dev/null | grep -A1 "Not Before\|Not After" || true)
if [ -n "$CERT_INFO" ]; then
    echo "$CERT_INFO" | sed 's/^/  /'
fi
echo "  Issuer: Let's Encrypt"
echo "  Auto-renewal: Enabled (checks daily)"
echo ""

echo -e "${YELLOW}✅ Test Commands:${NC}"
echo "  Health check:"
echo "    curl https://$DOMAIN/health"
echo ""
echo "  Login test:"
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
echo "  Check SSL: certbot certificates"
echo "  Renew SSL manually: certbot renew --dry-run"
echo ""

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 MoonBite Merchant Hub is LIVE on https://$DOMAIN${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
