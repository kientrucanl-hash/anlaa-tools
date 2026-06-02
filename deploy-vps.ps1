# ==========================================================================
# MECALC Next.js Deploy Script
#
# Luong chuan: git push -> GitHub Actions tu dong deploy len VPS.
# Script nay chi de emergency khi CI/CD hong hoac can deploy gap.
#
# Su dung:
#   .\deploy-vps.ps1              -> push len GitHub (CI/CD tu deploy)
#   .\deploy-vps.ps1 -Force       -> SSH thang, git pull + docker restart
#   .\deploy-vps.ps1 -Cutover     -> Chay cutover.sh tren VPS (lan dau)
#   .\deploy-vps.ps1 -Rollback    -> Quay lai app Express cu
# ==========================================================================

param(
    [switch]$Force,
    [switch]$Cutover,
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"
$SERVER   = "ubuntu@51.79.250.113"
$NEW_DIR  = "/home/ubuntu/anlaa-tools-next"
$REPO_URL = "https://github.com/kientrucanl-hash/anlaa-tools-next.git"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   MECALC NEXT.JS DEPLOY — tool.kientrucanl.vn" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# ── Rollback ──────────────────────────────────────────────────────────────

if ($Rollback) {
    Write-Host "[ROLLBACK] Quay lai app Express cu..." -ForegroundColor Red
    ssh -o StrictHostKeyChecking=no $SERVER "bash $NEW_DIR/scripts/cutover.sh --rollback"
    exit 0
}

# ── First-time cutover ────────────────────────────────────────────────────

if ($Cutover) {
    Write-Host "[CUTOVER] Chay cutover SQLite -> PostgreSQL..." -ForegroundColor Yellow
    Write-Host "Qua trinh nay se:" -ForegroundColor Yellow
    Write-Host "  1. Backup SQLite DB"
    Write-Host "  2. Start PostgreSQL + migrate schema"
    Write-Host "  3. Copy data SQLite -> PostgreSQL"
    Write-Host "  4. Start Next.js + Socket.io"
    Write-Host "  5. Cap nhat Nginx"
    Write-Host "  6. Stop app Express cu"
    Write-Host ""
    $confirm = Read-Host "Ban chac chan muon tiep tuc? (yes/no)"
    if ($confirm -ne "yes") { Write-Host "Huy."; exit 0 }

    ssh -o StrictHostKeyChecking=no $SERVER @"
        set -e
        # Clone repo if not exists
        if [ ! -d $NEW_DIR/.git ]; then
          git clone $REPO_URL $NEW_DIR
        fi
        cd $NEW_DIR
        git pull origin main
        chmod +x scripts/cutover.sh
        bash scripts/cutover.sh
"@
    Write-Host "Cutover hoan thanh!" -ForegroundColor Green
    exit 0
}

# ── Emergency force deploy ────────────────────────────────────────────────

if ($Force) {
    Write-Host "[FORCE] SSH truc tiep vao VPS..." -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no $SERVER @"
        set -e
        cd $NEW_DIR
        echo '[1/4] git pull...'
        git pull origin main
        echo '[2/4] docker compose up...'
        docker compose up --build --force-recreate -d
        docker image prune -f
        echo '[3/4] Prisma migrate...'
        docker compose exec -T nextjs npx prisma migrate deploy
        echo '[4/4] Health check...'
        sleep 20
        curl -sf http://127.0.0.1:3000/ > /dev/null && echo 'Next.js OK' || (echo 'FAILED' && docker compose logs --tail=30 nextjs && exit 1)
        curl -sf http://127.0.0.1:4000/health && echo 'Socket OK' || echo 'Socket health endpoint not responding'
"@
    Write-Host "Force deploy thanh cong!" -ForegroundColor Green
    exit 0
}

# ── Standard: push to GitHub → CI/CD deploys ────────────────────────────

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "Branch hien tai: $branch (khong phai main)" -ForegroundColor Red
    Write-Host "Chi deploy tu branch main. Chay: git checkout main" -ForegroundColor Red
    exit 1
}

$unpushed = git log origin/main..HEAD --oneline 2>$null
if (-not $unpushed) {
    Write-Host "Khong co commit moi de push." -ForegroundColor Yellow
    exit 0
}

Write-Host "[1/2] Pushing len GitHub..." -ForegroundColor Yellow
rtk git push origin main
Write-Host "[2/2] Da push. GitHub Actions dang deploy..." -ForegroundColor Green
Write-Host ""
Write-Host "Theo doi tai: https://github.com/kientrucanl-hash/anlaa-tools-next/actions" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
