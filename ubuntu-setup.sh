#!/bin/bash
# MoonBite Merchant Hub - Ubuntu Setup Script
# Usage: sudo bash ubuntu-setup.sh

set -e

echo "======================================"
echo "MoonBite Merchant Hub - Ubuntu Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
   echo -e "${RED}This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Get non-root user
SUDO_USER=${SUDO_USER:-$(whoami)}
if [ "$SUDO_USER" = "root" ]; then
   echo -e "${RED}Please run this script with sudo as a non-root user${NC}"
   exit 1
fi

echo -e "${YELLOW}Running as user: $SUDO_USER${NC}"
echo ""

# Step 1: Update system
echo -e "${YELLOW}[1/8] Updating system packages...${NC}"
apt update
apt upgrade -y
apt install -y curl wget git build-essential python3

# Step 2: Install Node.js 20
echo -e "${YELLOW}[2/8] Installing Node.js 20...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}Node.js already installed: $NODE_VERSION${NC}"
fi

# Step 3: Install pnpm
echo -e "${YELLOW}[3/8] Installing pnpm...${NC}"
if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm
else
    PNPM_VERSION=$(pnpm --version)
    echo -e "${GREEN}pnpm already installed: $PNPM_VERSION${NC}"
fi

# Step 4: Install PostgreSQL
echo -e "${YELLOW}[4/8] Installing PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
else
    PG_VERSION=$(psql --version)
    echo -e "${GREEN}PostgreSQL already installed: $PG_VERSION${NC}"
fi

# Step 5: Install Redis
echo -e "${YELLOW}[5/8] Installing Redis...${NC}"
if ! command -v redis-cli &> /dev/null; then
    apt install -y redis-server
    systemctl start redis-server
    systemctl enable redis-server
else
    REDIS_VERSION=$(redis-cli --version)
    echo -e "${GREEN}Redis already installed: $REDIS_VERSION${NC}"
fi

# Step 6: Install Nginx
echo -e "${YELLOW}[6/8] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    NGINX_VERSION=$(nginx -v 2>&1)
    echo -e "${GREEN}Nginx already installed: $NGINX_VERSION${NC}"
fi

# Step 7: Create app directories
echo -e "${YELLOW}[7/8] Creating application directories...${NC}"
mkdir -p /opt/moonbite/merchant
mkdir -p /var/log/moonbite/merchant
chown -R $SUDO_USER:$SUDO_USER /opt/moonbite
chown -R $SUDO_USER:$SUDO_USER /var/log/moonbite

# Step 8: Set up log rotation
echo -e "${YELLOW}[8/8] Setting up log rotation...${NC}"
cat > /etc/logrotate.d/moonbite << EOF
/var/log/moonbite/merchant/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 $SUDO_USER $SUDO_USER
    sharedscripts
}
EOF

echo ""
echo -e "${GREEN}✓ Installation complete!${NC}"
echo ""
echo "======================================"
echo "Next Steps:"
echo "======================================"
echo ""
echo "1. Navigate to app directory:"
echo "   cd /opt/moonbite/merchant"
echo ""
echo "2. Install project dependencies:"
echo "   pnpm install --frozen-lockfile"
echo ""
echo "3. Build the project:"
echo "   pnpm build"
echo ""
echo "4. Set up PostgreSQL database:"
echo "   sudo -u postgres psql"
echo "   CREATE USER moonbite WITH PASSWORD 'your_password';"
echo "   CREATE DATABASE merchant_prod OWNER moonbite;"
echo "   \\q"
echo ""
echo "5. Run database migrations:"
echo "   DATABASE_URL=\"postgresql://moonbite:your_password@localhost/merchant_prod\" \\"
echo "   pnpm --filter=@moonbite/db db:migrate:prod"
echo ""
echo "6. Seed demo data:"
echo "   DATABASE_URL=\"postgresql://moonbite:your_password@localhost/merchant_prod\" \\"
echo "   pnpm --filter=@moonbite/db db:seed"
echo ""
echo "7. Create .env.production file (see UBUNTU_DEPLOYMENT.md)"
echo ""
echo "8. Create systemd service (see UBUNTU_DEPLOYMENT.md)"
echo ""
echo "9. Configure Nginx (see UBUNTU_DEPLOYMENT.md)"
echo ""
echo "10. Set up SSL with Let's Encrypt:"
echo "    sudo apt install -y certbot python3-certbot-nginx"
echo "    sudo certbot certonly --nginx -d your-domain.com"
echo ""
echo "Full guide: UBUNTU_DEPLOYMENT.md"
echo "======================================"
