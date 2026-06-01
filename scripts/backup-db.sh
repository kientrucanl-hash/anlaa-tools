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

# 2. Chay lenh backup an toan ben trong Docker container su dung sqlite3 .backup
echo "Dang tao ban sao luu an toan (atomic backup) trong container..."
docker exec "$CONTAINER_NAME" sqlite3 "$DB_PATH_IN_CONTAINER" ".backup ${TEMP_BACKUP_IN_CONTAINER}"

# 3. Sao chep ban sao luu tu container ra VPS Host
echo "Dang sao chep ban sao luu ra VPS Host..."
docker cp "${CONTAINER_NAME}:${TEMP_BACKUP_IN_CONTAINER}" "/tmp/anlaa_backup_temp.db"

# 4. Nen file backup va xoa file tam
echo "Dang nen ban sao luu..."
tar -czf "$BACKUP_FILE" -C /tmp anlaa_backup_temp.db
rm -f /tmp/anlaa_backup_temp.db

# 5. Xoa file tam trong Docker container
echo "Dang don dep tep tam trong container..."
docker exec "$CONTAINER_NAME" rm -f "$TEMP_BACKUP_IN_CONTAINER"

# 6. Giu lai toi da 30 ban sao luu gan nhat (tu dong xoa ban cu)
echo "Dang don dep cac ban sao luu cu (giu lai 30 ban gan nhat)..."
find "$BACKUP_DIR" -type f -name "mecalc_db_*.tar.gz" -mtime +30 -delete

echo "[$(date)] BACKUP THANH CONG! File sao luu: ${BACKUP_FILE}"
