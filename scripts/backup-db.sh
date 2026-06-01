#!/bin/bash
# ==========================================================================
# MECALC Automated SQLite Database Backup Script
#
# Chay script nay qua Cronjob VPS de tu dong sao luu hang ngay.
# Vi du: 0 2 * * * /home/ubuntu/anlaa-tools/scripts/backup-db.sh >> /home/ubuntu/backups/backup.log 2>&1
# ==========================================================================
set -e

CONTAINER_NAME="anlaa-tools-anlc-1"
DB_PATH_IN_CONTAINER="/app/server/db/anlaa.db"
TEMP_BACKUP_IN_CONTAINER="/app/server/db/anlaa_backup_temp.db"
BACKUP_DIR="/home/ubuntu/backups/mecalc"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/mecalc_db_${TIMESTAMP}.tar.gz"

echo "[$(date)] Khoi dong tien trinh backup..."

# 1. Tao thu muc backup tren VPS neu chua co
mkdir -p "$BACKUP_DIR"

# 2. Tao thu muc tam tren VPS Host
TEMP_DIR="/tmp/mecalc_backup_temp"
rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# 3. Sao chep truc tiep cac tep database tu container ra thu muc tam tren VPS Host
echo "Dang sao chep cac tep database tu container..."
docker cp "${CONTAINER_NAME}:/app/server/db/." "$TEMP_DIR/"

# 4. Nen thu muc backup va xoa thu muc tam
echo "Dang nen cac tep sao luu..."
tar -czf "$BACKUP_FILE" -C "$TEMP_DIR" .
rm -rf "$TEMP_DIR"

# 6. Giu lai toi da 30 ban sao luu gan nhat (tu dong xoa ban cu)
echo "Dang don dep cac ban sao luu cu (giu lai 30 ban gan nhat)..."
find "$BACKUP_DIR" -type f -name "mecalc_db_*.tar.gz" -mtime +30 -delete

echo "[$(date)] BACKUP THANH CONG! File sao luu: ${BACKUP_FILE}"
