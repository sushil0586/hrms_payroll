#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

: "${PLAYWRIGHT_LIVE_SEED_PASSWORD:=Password@123}"
: "${HRMS_API_BASE_URL:=https://hrms.accerio.in/api/v1}"
: "${PLAYWRIGHT_BASE_URL:=https://hrms.accerio.in}"

export PLAYWRIGHT_LIVE_SEED_PASSWORD
export HRMS_API_BASE_URL
export PLAYWRIGHT_BASE_URL

SAFE_SPECS=(
  "tests/e2e/tenant-admin-roles-certification.spec.ts"
  "tests/e2e/hr-admin-leave-attendance-rbac-certification.spec.ts"
  "tests/e2e/mss-rbac-approver-certification.spec.ts"
  "tests/e2e/payroll-statutory-rbac-certification.spec.ts"
  "tests/e2e/payroll-lifecycle-rbac-certification.spec.ts"
)

echo "RBAC-9 staging sweep"
echo "Base URL: ${PLAYWRIGHT_BASE_URL}"
echo "API URL:  ${HRMS_API_BASE_URL}"
echo

for spec in "${SAFE_SPECS[@]}"; do
  echo "==> Running ${spec}"
  npx playwright test "$spec" --project=chromium --workers=1
done

cat <<'EOF'

Safe RBAC-9 staging sweep complete.

Note:
- The shared staging sweep intentionally leaves HRMS_ENABLE_RBAC_LOCKOUT_BROWSER_PROOF unset.
- Run the destructive last-admin lockout browser proof only on a disposable tenant/environment:

  HRMS_ENABLE_RBAC_LOCKOUT_BROWSER_PROOF=1 npx playwright test tests/e2e/tenant-admin-roles-certification.spec.ts --project=chromium --workers=1 --grep "last-admin lockout"
EOF
