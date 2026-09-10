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

## Launch Audit Note

The local launch-audit data set is not aligned with the already-remediated staging tenant state from Phase 9C and Phase 9D, so the local audit still reports older business-configuration blockers. That is not being used as Phase 9E launch evidence.

The staging launch audit must be rerun after this code is checked in and deployed. Expected staging result after running the Phase 9E browser suite against `https://hrms.accerio.in`:

- `can_launch: true`
- `0` blockers
- `0` warnings, assuming the browser-created primary bank records and provider rehearsal-ready state persist.

## Residual Risks

- Bank account delete/archive is not implemented in this slice. For payroll launch readiness, create/update/primary selection is enough; archive/delete should be added as a later employee-payments governance enhancement.
- Staging certification is pending deployment of this branch and rerun of the Phase 9E browser suite plus launch audit.

## Confidence Update

| Area | Before | After Local Phase 9E | Notes |
|---|---:|---:|---|
| Employee primary-bank readiness | 0% browser-closable | 88% | HR admin can now maintain primary bank data through browser UI. |
| Provider rehearsal readiness | 90% | 94% | Browser suite verifies certification and launch rehearsal actions. |
| Phase 9 launch confidence | 95% pilot-ready | 96% local, staging pending | Needs final deployed evidence before final sign-off. |

## Recommendation

Check in the Phase 9E changes, deploy to staging, run both Phase 9E browser specs against `https://hrms.accerio.in`, then rerun the tenant launch audit for `northstar-foods`.
