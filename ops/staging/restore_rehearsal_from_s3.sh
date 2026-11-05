#!/usr/bin/env bash
set -euo pipefail

: "${HRMS_BACKUP_BUCKET:?HRMS_BACKUP_BUCKET is required}"

AWS_REGION="${AWS_REGION:-ap-south-1}"
BACKUP_PREFIX="${HRMS_BACKUP_PREFIX:-hrms/staging/scheduled}"
STATE_DIR="${HRMS_BACKUP_STATE_DIR:-/var/lib/hrms-backup}"
POSTGRES_IMAGE="${HRMS_RESTORE_POSTGRES_IMAGE:-postgres:16}"
RUN_ID="${HRMS_RESTORE_RUN_ID:-$(aws s3api list-objects-v2 --bucket "$HRMS_BACKUP_BUCKET" --prefix "$BACKUP_PREFIX/" --region "$AWS_REGION" --query 'reverse(sort_by(Contents[?ends_with(Key, `metadata.json`)], &LastModified))[0].Key' --output text | awk -F/ '{print $(NF-1)}')}"

if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "None" ]; then
  echo "no scheduled backup is available" >&2
  exit 1
fi

WORK_DIR="$STATE_DIR/restores/$RUN_ID-$(date -u +%Y%m%dT%H%M%SZ)"
CONTAINER="hrms-restore-${RUN_ID,,}"
CONTAINER="${CONTAINER//[^a-z0-9_.-]/-}"
mkdir -p "$WORK_DIR"
exec 9>"$STATE_DIR/restore.lock"
flock -n 9 || { echo "another HRMS restore rehearsal is running" >&2; exit 1; }

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for file in postgres.dump private-media.tar.gz metadata.json SHA256SUMS; do
  aws s3 cp "s3://$HRMS_BACKUP_BUCKET/$BACKUP_PREFIX/$RUN_ID/$file" "$WORK_DIR/$file" \
    --region "$AWS_REGION" --only-show-errors
done
(cd "$WORK_DIR" && sha256sum --check SHA256SUMS)

docker run -d --name "$CONTAINER" --network none \
  -e POSTGRES_USER=restore -e POSTGRES_PASSWORD=restore-only -e POSTGRES_DB=hrms_restore \
  "$POSTGRES_IMAGE" >/dev/null

for _ in $(seq 1 60); do
  ready_events="$(docker logs "$CONTAINER" 2>&1 | grep -c 'database system is ready to accept connections' || true)"
  if [ "$ready_events" -ge 2 ] && \
    docker exec "$CONTAINER" psql -U restore -d hrms_restore -Atqc 'select 1' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker exec "$CONTAINER" psql -U restore -d hrms_restore -Atqc 'select 1' >/dev/null

started_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
started_epoch="$(date +%s)"
docker cp "$WORK_DIR/postgres.dump" "$CONTAINER:/tmp/postgres.dump"
docker exec "$CONTAINER" pg_restore -U restore -d hrms_restore --exit-on-error --no-owner --no-acl /tmp/postgres.dump

actual_counts="$(docker exec "$CONTAINER" psql -U restore -d hrms_restore -At -F '|' -c 'select (select count(*) from tenants_tenant),(select count(*) from iam_tenantmembership),(select count(*) from documents_employeedocument),(select count(*) from documents_documentlifecycleauditevent),(select count(*) from django_migrations);')"
expected_counts="$(jq -r '[.counts.tenants,.counts.memberships,.counts.employee_documents,.counts.document_lifecycle_audit_events,.counts.django_migrations] | join("|")' "$WORK_DIR/metadata.json")"
if [ "$actual_counts" != "$expected_counts" ]; then
  echo "restored row-count invariants do not match metadata" >&2
  echo "expected=$expected_counts actual=$actual_counts" >&2
  exit 1
fi

media_entry_count="$(tar -tzf "$WORK_DIR/private-media.tar.gz" | wc -l | tr -d ' ')"
expected_media_entry_count="$(jq -r '.media_entry_count' "$WORK_DIR/metadata.json")"
if [ "$media_entry_count" != "$expected_media_entry_count" ]; then
  echo "private-media entry count does not match metadata" >&2
  exit 1
fi

completed_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
duration_seconds="$(( $(date +%s) - started_epoch ))"
cat >"$STATE_DIR/last-restore-success.json" <<JSON
{
  "status": "passed",
  "backup_run_id": "$RUN_ID",
  "started_at": "$started_at",
  "completed_at": "$completed_at",
  "duration_seconds": $duration_seconds,
  "counts": "$actual_counts",
  "private_media_entry_count": $media_entry_count
}
JSON

rm -rf "$WORK_DIR"
echo "$STATE_DIR/last-restore-success.json"
