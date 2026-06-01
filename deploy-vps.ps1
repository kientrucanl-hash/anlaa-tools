# ==========================================================================
# [EMERGENCY ONLY] MECALC Manual Deploy Script
#
# DO NOT run this script under normal circumstances.
# Primary deployment = CI/CD via GitHub Actions (push to main branch).
#
# Chi chay khi: CI/CD bi hong hoac can deploy code chua commit gap.
# Sau khi chay xong: commit + push ngay de CI/CD va VPS dong bo lai.
# ==========================================================================

$ErrorActionPreference = "Stop"
$SERVER = "ubuntu@51.79.250.113"
$REMOTE_DIR = "~/anlaa-tools"
$ARCHIVE = "deploy.tar.gz"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   MECALC AUTO-DEPLOY TO tool.kientrucanl.vn (51.79.250.113)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compress workspace securely
Write-Host "[1/5] Dong goi ma nguon sach (loai bo node_modules)..." -ForegroundColor Yellow
if (Test-Path $ARCHIVE) {
    Remove-Item $ARCHIVE -Force
}

# Su dung tar co san tren Windows 10/11 de nen nhanh
tar --exclude="node_modules" --exclude="server/node_modules" --exclude="server/db/*.db" --exclude=".git" --exclude="logs" --exclude="ACCOUNTS.local.md" --exclude="*.local.*" --exclude="server/.env" --exclude=".env" --exclude="deploy.tar.gz" -czf $ARCHIVE *

$fileSize = (Get-Item $ARCHIVE).Length / 1KB
Write-Host "Dong goi thanh cong! Kich thuoc file nen: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Green

# 2. SCP Upload to VPS /tmp
Write-Host "[2/5] Dang upload file nen len VPS qua SCP..." -ForegroundColor Yellow
scp -o StrictHostKeyChecking=no -o ConnectTimeout=15 $ARCHIVE "${SERVER}:/tmp/${ARCHIVE}"
Write-Host "Upload file nen len VPS thanh cong!" -ForegroundColor Green

# 3. Extract on VPS
Write-Host "[3/5] Dang giai nen ma nguon de len thu muc $REMOTE_DIR tren VPS..." -ForegroundColor Yellow
$extractCmd = "mkdir -p $REMOTE_DIR && tar -xzf /tmp/$ARCHIVE -C $REMOTE_DIR && rm /tmp/$ARCHIVE"
ssh -o StrictHostKeyChecking=no $SERVER $extractCmd
Write-Host "Giai nen tren VPS thanh cong!" -ForegroundColor Green

# 4. Rebuild & Restart Docker Compose on VPS, then run DB migration
Write-Host "[4/5] Dang kich hoat build va tai khoi dong Docker Container tren VPS..." -ForegroundColor Yellow
$dockerCmd = "cd $REMOTE_DIR && docker compose up -d --build --force-recreate && docker image prune -f"
ssh -o StrictHostKeyChecking=no $SERVER $dockerCmd
Write-Host "Khoi dong Docker Container trên VPS thanh cong!" -ForegroundColor Green

Write-Host "[4b] Chay DB migration..." -ForegroundColor Yellow
$migrateCmd = "cd $REMOTE_DIR && docker compose exec -T anlc node server/db/migrate.js"
ssh -o StrictHostKeyChecking=no $SERVER $migrateCmd
Write-Host "Migration hoan tat!" -ForegroundColor Green

# 5. Clean up local archive
Write-Host "[5/5] Don dep tep tam local..." -ForegroundColor Yellow
if (Test-Path $ARCHIVE) {
    Remove-Item $ARCHIVE -Force
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DEPLOY THANH CONG LEN tool.kientrucanl.vn!" -ForegroundColor Green
Write-Host "   Vui long truy cap trang web va kiem tra ket qua." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
