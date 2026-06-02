# ==========================================================================
# MECALC Deploy Script
#
# Luong chuan: git push -> GitHub Actions tu dong deploy len VPS.
# Script nay chi de emergency khi CI/CD hong hoac can deploy gap khong qua GitHub.
#
# Su dung:
#   .\deploy-vps.ps1           -> push len GitHub (CI/CD tu deploy)
#   .\deploy-vps.ps1 -Force    -> SSH thang vao VPS, git pull + restart (bypass CI/CD)
# ==========================================================================

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$SERVER = "ubuntu@51.79.250.113"
$REMOTE_DIR = "~/anlaa-tools"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   MECALC DEPLOY — tool.kientrucanl.vn" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

if ($Force) {
    # Emergency: SSH truc tiep vao VPS, git pull + docker restart
    Write-Host "[FORCE] SSH truc tiep vao VPS..." -ForegroundColor Yellow
    ssh -o StrictHostKeyChecking=no $SERVER @"
        set -e
        cd $REMOTE_DIR
        echo '[1/3] git pull...'
        git pull origin main
        echo '[2/3] docker compose up...'
        docker compose up --build --force-recreate -d
        docker image prune -f
        echo '[3/3] Health check...'
        sleep 10
        wget -qO- http://127.0.0.1:4000/health && echo 'OK' || (echo 'FAILED' && docker compose logs --tail=30 anlc && exit 1)
"@
    Write-Host ""
    Write-Host "Deploy (force) thanh cong!" -ForegroundColor Green

} else {
    # Luong chuan: push len GitHub, CI/CD tu deploy
    $branch = git rev-parse --abbrev-ref HEAD
    if ($branch -ne "main") {
        Write-Host "Branch hien tai: $branch (khong phai main)" -ForegroundColor Red
        Write-Host "Chi deploy tu branch main. Chay: git checkout main" -ForegroundColor Red
        exit 1
    }

    $unpushed = git log origin/main..HEAD --oneline
    if (-not $unpushed) {
        Write-Host "Khong co commit moi de push." -ForegroundColor Yellow
        exit 0
    }

    Write-Host "[1/2] Pushing len GitHub..." -ForegroundColor Yellow
    git push origin main
    Write-Host "[2/2] Da push. GitHub Actions dang chay deploy..." -ForegroundColor Green
    Write-Host ""
    Write-Host "Theo doi tai: https://github.com/kientrucanl-hash/anlaa-tools/actions" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
}
