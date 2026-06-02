#!/bin/bash
# =============================================================================
# cutover.sh — Chuyển production từ anlaa-tools (SQLite) → anlaa-tools-next (PG)
#
# Chạy trên VPS:  bash /home/ubuntu/anlaa-tools-next/scripts/cutover.sh
#
# Quy trình:
#   1. Kiểm tra prerequisites
#   2. Backup SQLite database
#   3. Start PostgreSQL + run Prisma migrations
#   4. Migrate data SQLite → PostgreSQL
#   5. Build & start Next.js + Socket server
#   6. Cập nhật Nginx → trỏ vào port 3000 (thay vì 4000 của Express cũ)
#   7. Health check
#   8. Stop container cũ (anlaa-tools)
#
# Rollback: bash /home/ubuntu/anlaa-tools-next/scripts/cutover.sh --rollback
# =============================================================================

set -euo pipefail

OLD_DIR="/home/ubuntu/anlaa-tools"
NEW_DIR="/home/ubuntu/anlaa-tools-next"
BACKUP_DIR="/home/ubuntu/backups/anlaa-db-$(date +%Y%m%d-%H%M%S)"
NGINX_CONF="/etc/nginx/sites-available/tool"
LOG_FILE="/home/ubuntu/cutover-$(date +%Y%m%d-%H%M%S).log"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

log()  { echo -e "${CYAN}[$(date +%H:%M:%S)]${NC} $*" | tee -a "$LOG_FILE"; }
ok()   { echo -e "${GREEN}  ✓ $*${NC}" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}  ⚠ $*${NC}" | tee -a "$LOG_FILE"; }
fail() { echo -e "${RED}  ✗ $*${NC}" | tee -a "$LOG_FILE"; exit 1; }

# ── Rollback ──────────────────────────────────────────────────────────────────

if [[ "${1:-}" == "--rollback" ]]; then
  log "=== ROLLBACK: Reverting to old app ==="

  # Stop new containers
  cd "$NEW_DIR" && docker compose down || true

  # Restore Nginx to old config
  sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
server {
    listen 80;
    server_name tool.kientrucanl.vn;
    return 301 https://$host$request_uri;
}
server {
    listen 443 ssl http2;
    server_name tool.kientrucanl.vn;
    ssl_certificate     /etc/letsencrypt/live/tool.kientrucanl.vn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tool.kientrucanl.vn/privkey.pem;
    client_max_body_size 3m;
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_buffering off;
    }
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

  sudo nginx -t && sudo systemctl reload nginx

  # Restart old container
  cd "$OLD_DIR" && docker compose up -d
  ok "Rollback complete — old app is running"
  exit 0
fi

# ── Prerequisites ─────────────────────────────────────────────────────────────

log "=== MECALC Cutover: SQLite → PostgreSQL ==="
log "Log: $LOG_FILE"
echo ""

log "[0/8] Checking prerequisites..."

command -v docker   >/dev/null 2>&1 || fail "docker not found"
command -v psql     >/dev/null 2>&1 || warn "psql not found (optional — install with: apt-get install -y postgresql-client)"
[[ -d "$OLD_DIR" ]]  || fail "Old app directory not found: $OLD_DIR"
[[ -d "$NEW_DIR" ]]  || fail "New app directory not found: $NEW_DIR"
[[ -f "$NEW_DIR/.env" ]] || fail ".env not found in $NEW_DIR — run GitHub Actions deploy first"
ok "Prerequisites OK"

# ── Backup SQLite ─────────────────────────────────────────────────────────────

log "[1/8] Backing up SQLite database..."
mkdir -p "$BACKUP_DIR"

# Copy from Docker volume if running, otherwise direct path
SQLITE_FILE="$OLD_DIR/server/db/anlaa.db"
VOLUME_FILE=""

if docker volume ls | grep -q "anlaa-tools_anlc_data"; then
  # Extract from volume
  docker run --rm \
    -v anlaa-tools_anlc_data:/data \
    -v "$BACKUP_DIR":/backup \
    alpine cp /data/anlaa.db /backup/anlaa.db 2>/dev/null || true
  VOLUME_FILE="$BACKUP_DIR/anlaa.db"
fi

if [[ -f "$VOLUME_FILE" ]]; then
  SQLITE_FILE="$VOLUME_FILE"
  ok "Backed up SQLite from Docker volume: $SQLITE_FILE"
elif [[ -f "$SQLITE_FILE" ]]; then
  cp "$SQLITE_FILE" "$BACKUP_DIR/anlaa.db"
  ok "Backed up SQLite from filesystem: $SQLITE_FILE"
else
  fail "SQLite database not found. Check volume or path."
fi

# ── Start PostgreSQL + migrations ─────────────────────────────────────────────

log "[2/8] Starting PostgreSQL..."
cd "$NEW_DIR"

# Start only postgres first
docker compose up -d postgres
sleep 5

# Wait for postgres to be healthy
MAX_WAIT=60
ELAPSED=0
while ! docker compose exec -T postgres pg_isready -U mecalc >/dev/null 2>&1; do
  sleep 2; ELAPSED=$((ELAPSED+2))
  [[ $ELAPSED -ge $MAX_WAIT ]] && fail "PostgreSQL did not become healthy after ${MAX_WAIT}s"
done
ok "PostgreSQL is ready"

log "[3/8] Running Prisma migrations..."
# Run migrations inside a temporary container with the app image
# Build nextjs first to get prisma client
docker compose build nextjs 2>&1 | tail -5
docker compose run --rm --no-deps nextjs npx prisma migrate deploy
ok "Migrations applied"

# ── Data migration ────────────────────────────────────────────────────────────

log "[4/8] Migrating data SQLite → PostgreSQL..."

# Export SQLITE_DB_PATH so seed.ts can find the file
export SQLITE_DB_PATH="$SQLITE_FILE"

# Run migration via docker (nextjs container has tsx + better-sqlite3)
docker compose run --rm --no-deps \
  -e SQLITE_DB_PATH="$SQLITE_FILE" \
  -v "$SQLITE_FILE":/tmp/anlaa.db:ro \
  nextjs \
  npx tsx prisma/seed.ts

ok "Data migration complete"

# Verify row counts
PG_USERS=$(docker compose exec -T postgres psql -U mecalc -d mecalc -t -c "SELECT COUNT(*) FROM \"User\";" 2>/dev/null | tr -d ' ')
SQLITE_USERS=$(docker run --rm -v "$SQLITE_FILE":/db.sqlite alpine:latest \
  sh -c "apk add -q sqlite && sqlite3 /db.sqlite 'SELECT COUNT(*) FROM users;'" 2>/dev/null || echo "?")
log "  Users: SQLite=$SQLITE_USERS, PostgreSQL=$PG_USERS"

# ── Start all services ────────────────────────────────────────────────────────

log "[5/8] Starting all services..."
docker compose up -d
sleep 20

# Check containers
docker compose ps
ok "Containers started"

# ── Update Nginx ──────────────────────────────────────────────────────────────

log "[6/8] Updating Nginx config..."
sudo cp "$NEW_DIR/scripts/nginx-tool.conf" "$NGINX_CONF"
sudo nginx -t 2>&1 | tee -a "$LOG_FILE" || fail "Nginx config invalid"
sudo systemctl reload nginx
ok "Nginx updated → proxy to Next.js :3000 + Socket.io :4000"

# ── Health checks ─────────────────────────────────────────────────────────────

log "[7/8] Running health checks..."
sleep 5

# Check Next.js via Nginx (HTTPS)
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" https://tool.kientrucanl.vn/ || echo "000")
if [[ "$HTTP_CODE" =~ ^(200|301|302|307|308)$ ]]; then
  ok "HTTPS: https://tool.kientrucanl.vn → $HTTP_CODE"
else
  warn "HTTPS returned $HTTP_CODE — checking containers..."
  docker compose logs --tail=30 nextjs | tee -a "$LOG_FILE"
  fail "Next.js health check failed"
fi

# Check Socket.io
SOCKET_HEALTH=$(curl -sk http://127.0.0.1:4000/health | grep -o '"ok"' || echo "fail")
if [[ "$SOCKET_HEALTH" == '"ok"' ]]; then
  ok "Socket.io health: OK"
else
  warn "Socket.io health endpoint returned: $SOCKET_HEALTH"
fi

# ── Stop old container ────────────────────────────────────────────────────────

log "[8/8] Stopping old Express app..."
if [[ -d "$OLD_DIR" ]]; then
  cd "$OLD_DIR"
  docker compose down || warn "Could not stop old container (may already be stopped)"
  ok "Old Express app stopped"
fi

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  CUTOVER COMPLETE!                                            ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e "  Site:       ${CYAN}https://tool.kientrucanl.vn${NC}"
echo -e "  Next.js:    ${CYAN}http://127.0.0.1:3000${NC}"
echo -e "  Socket.io:  ${CYAN}http://127.0.0.1:4000${NC}"
echo -e "  Backup:     ${YELLOW}$BACKUP_DIR${NC}"
echo -e "  Log:        ${YELLOW}$LOG_FILE${NC}"
echo ""
echo -e "  Rollback:   ${YELLOW}bash $NEW_DIR/scripts/cutover.sh --rollback${NC}"
echo -e "${GREEN}================================================================${NC}"
