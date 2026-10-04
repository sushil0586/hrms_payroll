#!/usr/bin/env bash
set -Eeuo pipefail

BACKEND_ENV="${BACKEND_ENV:-/var/www/hrms-payroll-saas/shared/backend.env}"
BEGIN_MARKER="# BEGIN HRMS STAGE CONTRACT GATES"
END_MARKER="# END HRMS STAGE CONTRACT GATES"

fail() {
  printf '[stage-contract-env] ERROR: %s\n' "$*" >&2
  exit 1
}

as_root() {
  if [[ "${EUID:-$(id -u)}" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

[[ -f "$BACKEND_ENV" ]] || fail "Missing backend env file: $BACKEND_ENV"

backup_path="${BACKEND_ENV}.bak.stage-contract.$(date -u +%Y%m%d%H%M%S)"
tmp_file="$(mktemp)"
trap 'rm -f "$tmp_file"' EXIT

as_root cp "$BACKEND_ENV" "$backup_path"
sed "/^${BEGIN_MARKER}$/,/^${END_MARKER}$/d" "$BACKEND_ENV" > "$tmp_file"

cat >> "$tmp_file" <<'EOF'
# BEGIN HRMS STAGE CONTRACT GATES
# Non-secret staging declarations. These unblock QA/stage verification while
# real provider and object-storage credentials remain production backlog items.
HRMS_ENVIRONMENT=staging
HRMS_ENABLE_DEMO_DATA=false
HRMS_NOTIFICATION_WORKER_ENABLED=true
HRMS_PAYROLL_PROVIDER_WORKER_ENABLED=true
HRMS_ENTERPRISE_IDENTITY_STATUS=not_in_scope
PAYROLL_ARTIFACT_STORAGE_CONTROL_VERIFICATION_MODE=strict
HRMS_PAYROLL_PROVIDER_CREDENTIALS_JSON='{"stage:provider/contract/runtime":{"enabled":true,"source_ref":"stage-verification://sandbox-provider","use_sandbox":true,"credentials":{},"metadata":{"environment":"staging","contract_only":true}}}'
HRMS_PAYROLL_ARTIFACT_STORAGE_CREDENTIALS_JSON='{"stage:storage/s3/contract-runtime":{"enabled":true,"provider_family":"s3","source_ref":"stage-verification://object-storage-contract","use_default_credentials":true,"credentials":{},"metadata":{"environment":"staging","contract_only":true}}}'
HRMS_PAYROLL_ARTIFACT_STORAGE_POLICIES_JSON='{"stage:storage_policy/payroll/contract/v1":{"enabled":true,"allowed_provider_families":["s3"],"allowed_provider_refs":["payroll.storage.s3.private.v1"],"allowed_credential_refs":["stage:storage/s3/contract-runtime"],"metadata":{"environment":"staging","contract_only":true,"control_verification_mode":"strict"}}}'
# END HRMS STAGE CONTRACT GATES
EOF

as_root install -m 0640 -o "$(stat -c '%U' "$BACKEND_ENV")" -g "$(stat -c '%G' "$BACKEND_ENV")" "$tmp_file" "$BACKEND_ENV"
printf '[stage-contract-env] Updated %s\n' "$BACKEND_ENV"
printf '[stage-contract-env] Backup: %s\n' "$backup_path"
