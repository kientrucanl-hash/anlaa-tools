#!/bin/bash
# =============================================================================
# setup-vps.sh — Chuẩn bị VPS lần đầu cho anlaa-tools-next
#
# Chạy một lần trên VPS mới hoặc khi cần reset:
#   bash setup-vps.sh
# =============================================================================

set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
log()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()   { echo -e "${GREEN}  ✓ $*${NC}"; }

log "=== VPS Setup for anlaa-tools-next ==="

# ── Docker ────────────────────────────────────────────────────────────────────
log "Installing Docker..."
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker ubuntu
  ok "Docker installed"
else
  ok "Docker already installed: $(docker --version)"
fi

# Docker Compose V2
if ! docker compose version &>/dev/null; then
  sudo apt-get install -y docker-compose-plugin
  ok "Docker Compose plugin installed"
else
  ok "Docker Compose: $(docker compose version)"
fi

# ── Nginx ─────────────────────────────────────────────────────────────────────
log "Installing Nginx..."
if ! command -v nginx &>/dev/null; then
  sudo apt-get update -q && sudo apt-get install -y nginx
  ok "Nginx installed"
else
  ok "Nginx already installed"
fi

# ── Certbot ───────────────────────────────────────────────────────────────────
log "Installing Certbot..."
if ! command -v certbot &>/dev/null; then
  sudo apt-get install -y certbot python3-certbot-nginx
  ok "Certbot installed"
else
  ok "Certbot already installed"
fi

# ── SSL cert ──────────────────────────────────────────────────────────────────
DOMAIN="tool.kientrucanl.vn"
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

if [[ ! -f "$CERT_PATH" ]]; then
  log "Obtaining SSL certificate for $DOMAIN..."
  sudo certbot certonly --nginx -d "$DOMAIN" --non-interactive --agree-tos \
    --email "kientruc.anl@gmail.com" --redirect
  ok "SSL certificate obtained"
else
  ok "SSL certificate exists: $CERT_PATH"
fi

# ── Directories ───────────────────────────────────────────────────────────────
log "Creating directories..."
mkdir -p /home/ubuntu/backups
ok "Created /home/ubuntu/backups"

# ── Firewall ──────────────────────────────────────────────────────────────────
log "Configuring UFW firewall..."
if command -v ufw &>/dev/null; then
  sudo ufw allow OpenSSH
  sudo ufw allow 'Nginx Full'
  sudo ufw --force enable
  ok "UFW configured: SSH + HTTP/HTTPS allowed"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}=== VPS Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Add GitHub Secrets to repository:"
echo "     - SSH_PRIVATE_KEY    : private key matching VPS authorized_keys"
echo "     - DATABASE_URL       : postgresql://mecalc:PASSWORD@postgres:5432/mecalc"
echo "     - JWT_SECRET         : $(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || echo '<generate 32+ char secret>')"
echo "     - POSTGRES_PASSWORD  : <strong password>"
echo "     - ALLOWED_ORIGINS    : https://tool.kientrucanl.vn"
echo ""
echo "  2. Push to main branch → GitHub Actions will deploy"
echo "  3. Run cutover: .\\deploy-vps.ps1 -Cutover"
echo ""
echo "  Or for first-time manual deploy:"
echo "    cd /home/ubuntu/anlaa-tools-next"
echo "    cp .env.example .env && nano .env  # fill in secrets"
echo "    bash scripts/cutover.sh"
