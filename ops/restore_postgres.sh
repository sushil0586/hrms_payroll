#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_FILE:?BACKUP_FILE is required}"

if [ -f "$BACKUP_FILE.sha256" ]; then
  sha256sum -c "$BACKUP_FILE.sha256"
fi

pg_restore "$BACKUP_FILE" --dbname="$DATABASE_URL" --clean --if-exists --no-owner --no-acl
