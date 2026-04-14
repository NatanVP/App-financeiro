#!/usr/bin/env bash
# Daily PostgreSQL backup
# Local retention: 7 days
# Remote retention: 30 days (Backblaze B2 via rclone)
#
# Cron (set up by setup.sh):
#   0 3 * * * /opt/financa/infra/backup.sh >> /var/log/financa-backup.log 2>&1
set -euo pipefail

BACKUP_DIR=/opt/financa/backups
COMPOSE_DIR=/opt/financa/infra
LOCAL_RETENTION_DAYS=7
REMOTE_RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="financa_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

# Source .env for credentials
# shellcheck disable=SC1091
source "$COMPOSE_DIR/.env"

echo "[$(date -Iseconds)] Starting backup: $FILENAME"

# ── 1. Local dump ──────────────────────────────────────────────────────────────
docker compose -f "$COMPOSE_DIR/docker-compose.yml" exec -T postgres \
    pg_dump -U "${POSTGRES_USER:-financa}" "${POSTGRES_DB:-financa}" \
    | gzip > "$BACKUP_DIR/$FILENAME"

# Verify the backup is non-empty
SIZE=$(stat -c%s "$BACKUP_DIR/$FILENAME")
if [ "$SIZE" -lt 1024 ]; then
    echo "[$(date -Iseconds)] ERROR: Backup too small ($SIZE bytes), aborting."
    rm -f "$BACKUP_DIR/$FILENAME"
    exit 1
fi
echo "[$(date -Iseconds)] Local backup OK: $SIZE bytes"

# ── 2. Remote upload via rclone → Backblaze B2 ────────────────────────────────
RCLONE_REMOTE="${RCLONE_REMOTE:-b2financa}"

if command -v rclone &>/dev/null && [ -n "${B2_KEY_ID:-}" ]; then
    echo "[$(date -Iseconds)] Uploading to ${RCLONE_REMOTE}:${B2_BUCKET_NAME:-financa-backups}/"
    rclone copy \
        "$BACKUP_DIR/$FILENAME" \
        "${RCLONE_REMOTE}:${B2_BUCKET_NAME:-financa-backups}/" \
        --b2-hard-delete \
        2>&1

    # Remove remote files older than REMOTE_RETENTION_DAYS
    rclone delete \
        "${RCLONE_REMOTE}:${B2_BUCKET_NAME:-financa-backups}/" \
        --min-age "${REMOTE_RETENTION_DAYS}d" \
        2>&1

    echo "[$(date -Iseconds)] Remote upload done."
else
    echo "[$(date -Iseconds)] rclone/B2 not configured — skipping remote upload."
fi

# ── 3. Local rotation (keep LOCAL_RETENTION_DAYS) ─────────────────────────────
find "$BACKUP_DIR" -name "financa_*.sql.gz" -mtime +"$LOCAL_RETENTION_DAYS" -delete
echo "[$(date -Iseconds)] Local rotation done (>${LOCAL_RETENTION_DAYS}d deleted). Current backups:"
ls -lh "$BACKUP_DIR"
