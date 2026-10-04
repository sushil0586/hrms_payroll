#!/usr/bin/env bash
set -euo pipefail

: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"
: "${RESTORE_DATABASE_URL:?RESTORE_DATABASE_URL is required}"

BACKUP_DIR="${BACKUP_DIR:-ops/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_FILE="$BACKUP_DIR/hrms-restore-rehearsal-$STAMP.dump"
EVIDENCE_FILE="${EVIDENCE_FILE:-$BACKUP_DIR/hrms-restore-rehearsal-$STAMP.json}"
mkdir -p "$BACKUP_DIR"

pg_dump "$SOURCE_DATABASE_URL" --format=custom --no-owner --no-acl --file="$BACKUP_FILE"
sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
pg_restore "$BACKUP_FILE" --dbname="$RESTORE_DATABASE_URL" --clean --if-exists --no-owner --no-acl

TABLE_COUNT="$(psql "$RESTORE_DATABASE_URL" -Atc "select count(*) from information_schema.tables where table_schema='public';")"
if [ "${TABLE_COUNT:-0}" -le 0 ]; then
  echo "restore produced no public tables" >&2
  exit 1
fi

CHECKSUM="$(cut -d ' ' -f1 "$BACKUP_FILE.sha256")"
cat > "$EVIDENCE_FILE" <<JSON
{
  "status": "passed",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "backup_file": "$BACKUP_FILE",
  "backup_sha256": "$CHECKSUM",
  "restored_public_table_count": $TABLE_COUNT
}
JSON

echo "$EVIDENCE_FILE"
