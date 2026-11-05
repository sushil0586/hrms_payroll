#!/usr/bin/env bash
set -euo pipefail

: "${HRMS_BACKUP_BUCKET:?HRMS_BACKUP_BUCKET is required}"
: "${HRMS_BACKUP_KMS_KEY_ID:?HRMS_BACKUP_KMS_KEY_ID is required}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
POSTGRES_CONTAINER="${HRMS_POSTGRES_CONTAINER:-hrms-staging-postgres-1}"
MEDIA_VOLUME="${HRMS_MEDIA_VOLUME:-hrms-staging_media-data}"
BACKUP_PREFIX="${HRMS_BACKUP_PREFIX:-hrms/staging/scheduled}"
STATE_DIR="${HRMS_BACKUP_STATE_DIR:-/var/lib/hrms-backup}"
LOCAL_RETENTION_DAYS="${HRMS_BACKUP_LOCAL_RETENTION_DAYS:-3}"
OBJECT_RETENTION_DAYS="${HRMS_BACKUP_OBJECT_RETENTION_DAYS:-30}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RUN_DIR="$STATE_DIR/runs/$STAMP"
S3_PREFIX="$BACKUP_PREFIX/$STAMP"
OBJECT_RETAIN_UNTIL="$(date -u -d "+$OBJECT_RETENTION_DAYS days" +%Y-%m-%dT%H:%M:%SZ)"

mkdir -p "$RUN_DIR"
exec 9>"$STATE_DIR/backup.lock"
flock -n 9 || { echo "another HRMS backup is running" >&2; exit 1; }

cleanup_failed_run() {
  status=$?
  if [ "$status" -ne 0 ]; then
    printf '{"status":"failed","completed_at":"%s","run_id":"%s"}\n' \
      "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$STAMP" >"$STATE_DIR/last-failure.json"
  fi
  exit "$status"
}
trap cleanup_failed_run EXIT

docker inspect "$POSTGRES_CONTAINER" >/dev/null
docker volume inspect "$MEDIA_VOLUME" >/dev/null

docker exec "$POSTGRES_CONTAINER" sh -lc \
  'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  >"$RUN_DIR/postgres.dump"

docker run --rm --network none -v "$MEDIA_VOLUME:/source:ro" alpine:3.20 \
  tar -C /source -czf - . >"$RUN_DIR/private-media.tar.gz"

docker exec "$POSTGRES_CONTAINER" sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -F "|" -c "select (select count(*) from tenants_tenant),(select count(*) from iam_tenantmembership),(select count(*) from documents_employeedocument),(select count(*) from documents_documentlifecycleauditevent),(select count(*) from django_migrations);"' \
  >"$RUN_DIR/counts.txt"

IFS='|' read -r tenant_count membership_count document_count document_audit_count migration_count <"$RUN_DIR/counts.txt"
media_entry_count="$(tar -tzf "$RUN_DIR/private-media.tar.gz" | wc -l | tr -d ' ')"
postgres_version="$(docker exec "$POSTGRES_CONTAINER" sh -lc 'pg_dump --version' | sed 's/"/\\"/g')"

cat >"$RUN_DIR/metadata.json" <<JSON
{
  "run_id": "$STAMP",
  "source_environment": "staging",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "postgres_version": "$postgres_version",
  "media_entry_count": $media_entry_count,
  "counts": {
    "tenants": $tenant_count,
    "memberships": $membership_count,
    "employee_documents": $document_count,
    "document_lifecycle_audit_events": $document_audit_count,
    "django_migrations": $migration_count
  }
}
JSON

(cd "$RUN_DIR" && sha256sum postgres.dump private-media.tar.gz metadata.json >SHA256SUMS)

for file in postgres.dump private-media.tar.gz metadata.json SHA256SUMS; do
  aws s3api put-object \
    --bucket "$HRMS_BACKUP_BUCKET" \
    --key "$S3_PREFIX/$file" \
    --body "$RUN_DIR/$file" \
    --region "$AWS_REGION" \
    --server-side-encryption aws:kms \
    --ssekms-key-id "$HRMS_BACKUP_KMS_KEY_ID" \
    --object-lock-mode GOVERNANCE \
    --object-lock-retain-until-date "$OBJECT_RETAIN_UNTIL" \
    >/dev/null
  aws s3api head-object \
    --bucket "$HRMS_BACKUP_BUCKET" \
    --key "$S3_PREFIX/$file" \
    --region "$AWS_REGION" \
    --query '{encryption:ServerSideEncryption,kms:SSEKMSKeyId,lock:ObjectLockMode,retain_until:ObjectLockRetainUntilDate}' \
    >"$RUN_DIR/$file.s3.json"
  jq -e --arg kms "$HRMS_BACKUP_KMS_KEY_ID" --arg retain "$OBJECT_RETAIN_UNTIL" \
    '.encryption == "aws:kms" and .kms == $kms and .lock == "GOVERNANCE" and
     ((.retain_until | sub("\\+00:00$"; "Z") | fromdateiso8601) >= ($retain | fromdateiso8601))' \
    "$RUN_DIR/$file.s3.json" >/dev/null
done

cat >"$STATE_DIR/last-success.json" <<JSON
{
  "status": "passed",
  "completed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "run_id": "$STAMP",
  "s3_prefix": "s3://$HRMS_BACKUP_BUCKET/$S3_PREFIX/",
  "manifest_sha256": "$(sha256sum "$RUN_DIR/SHA256SUMS" | cut -d ' ' -f1)"
}
JSON

find "$STATE_DIR/runs" -mindepth 1 -maxdepth 1 -type d -mtime "+$LOCAL_RETENTION_DAYS" -exec rm -rf -- {} +
trap - EXIT
echo "s3://$HRMS_BACKUP_BUCKET/$S3_PREFIX/"
