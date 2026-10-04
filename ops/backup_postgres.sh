#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
BACKUP_DIR="${BACKUP_DIR:-ops/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

pg_dump "$DATABASE_URL" --format=custom --no-owner --no-acl --file="$BACKUP_DIR/hrms-$STAMP.dump"
sha256sum "$BACKUP_DIR/hrms-$STAMP.dump" > "$BACKUP_DIR/hrms-$STAMP.dump.sha256"
echo "$BACKUP_DIR/hrms-$STAMP.dump"
