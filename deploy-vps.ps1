# ==========================================================================
# MECALC Next.js Deploy Script
#
# Standard flow: git push -> GitHub Actions deploys to VPS.
# Use -Force only when CI/CD is unavailable or an immediate VPS redeploy is needed.
#
# Usage:
#   .\deploy-vps.ps1              -> push to GitHub (CI/CD deploys)
#   .\deploy-vps.ps1 -Force       -> SSH directly, git pull + docker restart
#   .\deploy-vps.ps1 -Cutover     -> run cutover.sh on the VPS
#   .\deploy-vps.ps1 -Rollback    -> rollback to the old Express app
# ==========================================================================

param(
    [switch]$Force,
    [switch]$Cutover,
    [switch]$Rollback
)

$ErrorActionPreference = "Stop"
$SERVER = "ubuntu@51.79.250.113"
$NEW_DIR = "/home/ubuntu/anlaa-tools-next"
$REPO_URL = "https://github.com/kientrucanl-hash/anlaa-tools.git"
$ACTIONS_URL = "https://github.com/kientrucanl-hash/anlaa-tools/actions"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   MECALC NEXT.JS DEPLOY - tool.kientrucanl.vn" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Rollback) {
    Write-Host "[ROLLBACK] Returning to old Express app..." -ForegroundColor Red
    ssh -o StrictHostKeyChecking=no $SERVER "bash $NEW_DIR/scripts/cutover.sh --rollback"
    if ($LASTEXITCODE -ne 0) { throw "Remote rollback failed with exit code $LASTEXITCODE" }
    exit 0
}

if ($Cutover) {
    Write-Host "[CUTOVER] Running SQLite -> PostgreSQL cutover..." -ForegroundColor Yellow
    Write-Host "This will:"
    Write-Host "  1. Backup SQLite DB"
    Write-Host "  2. Start PostgreSQL + migrate schema"
    Write-Host "  3. Copy data SQLite -> PostgreSQL"
    Write-Host "  4. Start Next.js + Socket.io"
    Write-Host "  5. Update Nginx"
    Write-Host "  6. Stop the old Express app"
    Write-Host ""

    $confirm = Read-Host "Continue? (yes/no)"
    if ($confirm -ne "yes") {
        Write-Host "Cancelled."
        exit 0
    }

    $remoteScript = "set -e; if [ ! -d $NEW_DIR/.git ]; then git clone $REPO_URL $NEW_DIR; fi; cd $NEW_DIR; git pull origin main; chmod +x scripts/cutover.sh; bash scripts/cutover.sh"
    ssh -o StrictHostKeyChecking=no $SERVER "bash -lc '$remoteScript'"
    if ($LASTEXITCODE -ne 0) { throw "Remote cutover failed with exit code $LASTEXITCODE" }
    Write-Host "Cutover complete!" -ForegroundColor Green
    exit 0
}

if ($Force) {
    Write-Host "[FORCE] Deploying directly to VPS..." -ForegroundColor Yellow

    $remoteScript = "set -e; cd $NEW_DIR; echo ""[1/4] git pull...""; git pull origin main; echo ""[2/4] docker compose up...""; docker compose up --build --force-recreate -d; docker image prune -f; echo ""[3/4] Prisma migrate...""; docker compose exec -T nextjs npx prisma migrate deploy; echo ""[4/4] Health check...""; sleep 20; curl -sf http://127.0.0.1:3100/ > /dev/null && echo ""Next.js OK"" || (echo ""FAILED"" && docker compose logs --tail=30 nextjs && exit 1); curl -sf http://127.0.0.1:4100/health && echo ""Socket OK"" || echo ""Socket health endpoint not responding"""
    ssh -o StrictHostKeyChecking=no $SERVER "bash -lc '$remoteScript'"
    if ($LASTEXITCODE -ne 0) { throw "Remote force deploy failed with exit code $LASTEXITCODE" }
    Write-Host "Force deploy complete!" -ForegroundColor Green
    exit 0
}

$branch = git rev-parse --abbrev-ref HEAD
if ($branch -ne "main") {
    Write-Host "Current branch: $branch (not main)" -ForegroundColor Red
    Write-Host "Deploy only from main."
    exit 1
}

$unpushed = git log origin/main..HEAD --oneline 2>$null
if (-not $unpushed) {
    Write-Host "No new commits to push." -ForegroundColor Yellow
    exit 0
}

Write-Host "[1/2] Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
if ($LASTEXITCODE -ne 0) { throw "git push failed with exit code $LASTEXITCODE" }
Write-Host "[2/2] Pushed. GitHub Actions is deploying..." -ForegroundColor Green
Write-Host ""
Write-Host "Follow progress at: $ACTIONS_URL" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
