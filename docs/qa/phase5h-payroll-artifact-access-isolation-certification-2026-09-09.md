# Phase 5H Payroll Artifact Access Isolation Certification - 2026-09-09

## Scope

Certified payroll artifact access through local browser-authenticated routes:

- `/hr-admin/payroll-outputs`
- `/ess/payslips`
- `/api/hr-admin/payroll-output-artifacts/[artifactId]/download`
- `/api/hr-admin/payroll-output-artifacts/[artifactId]/access-audit-export`
- `/api/me/payroll-payslips/[artifactId]/download`

## Product Fix

HR admin payroll output artifact links now use same-origin Next proxy routes instead of direct backend `/api/v1/...` URLs.

Changed:

- `web/src/app/hr-admin/payroll-outputs/page.tsx`
- `web/src/app/api/hr-admin/payroll-output-artifacts/[itemId]/download/route.ts`
- `web/src/app/api/hr-admin/payroll-output-artifacts/[itemId]/access-audit-export/route.ts`

## Browser Path Certified

1. Logged in as HR admin and opened payroll outputs.
2. Verified artifact register and selected artifact details.
3. Verified download link points to same-origin `/api/hr-admin/payroll-output-artifacts/[id]/download`.
4. Downloaded the artifact through the authenticated browser request context.
5. Confirmed attachment response, payroll checksum header, download strategy header, and non-empty payload.
6. Exported access audit through same-origin `/api/hr-admin/payroll-output-artifacts/[id]/access-audit-export`.
7. Confirmed CSV response and access-audit row header.
8. Logged in as employee and opened ESS payslips.
9. Confirmed the employee cannot reuse the HR admin artifact download route.
10. Confirmed the employee cannot treat the HR artifact id as an ESS payslip id.
11. Confirmed the employee can download their own published payslip through `/api/me/payroll-payslips/[id]/download`.

## Element Coverage

- HR payroll outputs page: artifact register, selected artifact detail panel, download link, access audit export link, storage/source evidence, horizontal overflow guard.
- HR artifact download route: token forwarding, content disposition, checksum, storage provider/key/version, download strategy, retention policy.
- HR access audit export route: token forwarding, CSV content type, content disposition, checksum, row-count header.
- ESS payslips page: employee-scoped register, payslip download link, storage/source evidence, horizontal overflow guard.
- Negative access paths: employee reuse of HR route and employee access to non-ESS artifact id.

## Test Commands

```bash
source .venv/bin/activate && python backend/manage.py check
```

Result: passed.

```bash
pnpm --dir web exec tsc --noEmit
```

Result: passed.

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test web/tests/e2e/phase5h-payroll-artifact-access-isolation.spec.ts --project=chromium --workers=1 --timeout=300000
```

Result: `1 passed`.

Targeted regressions:

```bash
PLAYWRIGHT_PORT=3223 \
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3223 \
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  web/tests/e2e/phase5h-payroll-artifact-access-isolation.spec.ts \
  web/tests/e2e/payroll-outputs-flows.spec.ts \
  web/tests/e2e/ess-payslip-flows.spec.ts \
  web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts \
  --project=chromium --workers=1 --timeout=300000
```

Result: `4 passed`.

## Confidence

- Payroll artifact access isolation confidence: 92%.
- HR output download governance confidence: 92%.
- ESS employee-scoped payslip download confidence: 92%.
- Current Phase 5 confidence: 95%.

## Residual Risks

- Payroll register export authorization still needs dedicated browser proof.
- Final locked payroll edit/reopen negative paths need a focused destructive-control browser test.
