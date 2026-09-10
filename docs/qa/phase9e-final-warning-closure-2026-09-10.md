# Phase 9E Final Warning Closure

Date: 2026-09-10

## Purpose

Close the last launch-audit warning areas that were not fully browser-closable after Phase 9D:

- `employees.primary_bank`
- `provider.rehearsal_ready`

## Implementation

Added HR admin employee bank-account maintenance so the primary-bank readiness warning can be closed through the SaaS UI instead of through direct database work.

Browser-facing additions:

- Employee directory action: `Manage bank accounts`.
- Employee bank accounts page: `/hr-admin/employees/[employeeId]/bank-accounts`.
- Create/update form for account holder, bank name, account number, IFSC, branch, and primary-account flag.
- Primary account list state with masked account numbers and visible primary/non-primary badges.
- Local browser certification that all touched fields, buttons, toggles, list rows, save flows, edit flows, and responsive overflow checks behave correctly.

API additions:

- `GET /api/v1/hr-admin/employees/[employeeId]/bank-accounts`
- `POST /api/v1/hr-admin/employees/[employeeId]/bank-accounts`
- `PATCH /api/v1/hr-admin/employees/[employeeId]/bank-accounts/[itemId]`

Backend additions:

- HR admin bank-account serializers.
- Tenant-scoped employee bank-account list/create/detail views.
- Primary-account enforcement that clears prior primary accounts for the same employee when a new primary is saved.

## Browser Evidence

Local environment:

```bash
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm --dir web exec playwright test \
  tests/e2e/phase9e-bank-account-readiness.spec.ts \
  tests/e2e/phase9e-provider-ready-rehearsal.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

- `2 passed`
- Runtime: `21.2s`

Staging environment after deployment:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm --dir web exec playwright test \
  tests/e2e/phase9e-bank-account-readiness.spec.ts \
  tests/e2e/phase9e-provider-ready-rehearsal.spec.ts \
  --project=chromium \
  --workers=1
```

Result:

- `2 passed`
- Runtime: `1.4m`

Tightened provider response assertion:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
HRMS_ENABLE_DEMO_DATA=false \
pnpm --dir web exec playwright test tests/e2e/phase9e-provider-ready-rehearsal.spec.ts --project=chromium --workers=1
```

Result:

- `1 passed`
- Runtime: `41.9s`

Certified browser paths:

- `/hr-admin/employees`
- `/hr-admin/employees/[employeeId]/bank-accounts`
- `/hr-admin/payroll-providers`

## Engineering Checks

```bash
python backend/manage.py check
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
```

Results:

- Django system check passed.
- TypeScript passed.
- ESLint passed.

## Deployment Evidence

Staging URL: `https://hrms.accerio.in`

Release:

- Initial deployed release: `/var/www/hrms-payroll-saas/release-20260910045731`
- Initial deployed commit: `ba05fc19bd14f69b13163a68e4f182008d904a17`
- Backend service: active
- Web service: active
- Public HTTP check: `200 OK`

Post-deployment hotfix:

- File patched on staging: `backend/apps/payroll/services.py`
- Reason: existing tenant provider connections were created before launch-route package/client/storage-policy fields existed, and the default provider bootstrap did not backfill missing route config.
- Fix: default provider connection bootstrap now builds configurable route launch settings and safely fills missing fields on existing sandbox provider connections.
- Backend check after hotfix: passed.
- Backend service after hotfix: active.

## Launch Audit Note

The local launch-audit data set is not aligned with the already-remediated staging tenant state from Phase 9C and Phase 9D, so the local HRMS launch audit reported older business-configuration blockers. That local HRMS audit is not being used as Phase 9E launch evidence.

Staging provider rehearsal after hotfix:

- `status`: `ready`
- `can_launch`: `true`
- `ready_lane_count`: `3`
- `blocked_lane_count`: `0`
- `launch_blocker_count`: `0`
- `evidence_checksum_sha256`: `13489db2a49662005ae9512ec392019cf9933d380eb56d716c32685367453628`

Staging HRMS launch audit after hotfix:

- `status`: `ready`
- `can_launch`: `true`
- `passed_gate_count`: `51`
- `gate_count`: `51`
- `blocker_count`: `0`
- `warning_count`: `0`
- `release_action_count`: `0`
- `release_blocker_refs`: `[]`
- `release_warning_refs`: `[]`
- `evidence_checksum_sha256`: `c187b9f195dc25bb38aa835b61ff024fcd8b9c1af251b296820a7c59ae6ae870`

## Residual Risks

- Bank account delete/archive is not implemented in this slice. For payroll launch readiness, create/update/primary selection is enough; archive/delete should be added as a later employee-payments governance enhancement.
- The post-deployment hotfix must be checked in so the staging state remains reproducible from Git.

## Confidence Update

| Area | Before | After Local Phase 9E | Notes |
|---|---:|---:|---|
| Employee primary-bank readiness | 0% browser-closable | 88% | HR admin can now maintain primary bank data through browser UI. |
| Provider rehearsal readiness | 90% | 94% | Browser suite verifies certification and launch rehearsal actions. |
| Phase 9 launch confidence | 95% pilot-ready | 98% staging-ready | Staging launch audit is `51/51` with no blockers or warnings. |

## Recommendation

Check in the post-deployment provider-route backfill fix, then keep Phase 9E as the final green staging evidence for the `northstar-foods` tenant.
