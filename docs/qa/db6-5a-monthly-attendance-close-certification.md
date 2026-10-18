# DB-6.5A Monthly Attendance Close Certification

Date: 2026-10-17  
Environment: disposable PostgreSQL 16 database and production-built local browser application  
Decision: **PASS** for DB-6.5A; production readiness is not claimed.

## Scope And Result

DB6-05-004 and DB6-05-005 were originally `Blocked` in DB-6.5 because DBR-015 was a confirmed capability gap. Historical blocked evidence remains in the DB-6.5 report and execution logs. Both frozen scenarios now have executed passing outcomes:

| Scenario | Before | Current | Evidence |
|---|---|---|---|
| DB6-05-004 monthly close blocks late mutation/payroll drift | Blocked | Passed | `011`, `015`, `023`, `025` |
| DB6-05-005 governed reopen retains history | Blocked | Passed | `015`, `018`, `021`, `022`, `023` |

DB-6.5 current result is therefore 6 Passed, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Run. Across the frozen 92-scenario DB-6 register the current totals are 37 Passed, 5 Blocked, 50 Not Run.

## Implemented Controls

- Added tenant/legal-entity/period/version-scoped `AttendancePeriodClose` and append-only `AttendancePeriodCloseEvent` records.
- Added Draft, Submitted, Approved, Closed, and Reopened transitions with row locking, idempotency keys, actor/timestamp attribution, and mandatory reopen reason.
- Reconciliation stores employee rows, status counts, payable units, LOP units, blockers, and a SHA-256 evidence hash.
- Close locks attendance rows and re-derives the snapshot under row locks. A changed hash rejects stale close attempts.
- PostgreSQL triggers reject ORM, bulk, and raw INSERT/UPDATE/DELETE against closed attendance periods and reject event mutation.
- Added tenant-scoped APIs and `attendance.close.manage` / `attendance.close.approve` permissions.
- Added compact HR Admin workbench with local pending, success, validation error, Retry, lifecycle controls, and audit history.
- Payroll input snapshots now retain a protected reference to the exact matching closed attendance version. Existing historical snapshots remain nullable and unchanged.
- New payroll snapshots are blocked when a matching attendance reconciliation exists but is not closed. Validation reads current close status from PostgreSQL rather than trusting cached ORM state.

No payroll formula, leave rule, statutory rule, tenant scope, or historical payroll row was changed.

## Source Changes

- `backend/apps/attendance/models.py`, `services.py`, and migration `0011_monthly_attendance_close.py`
- `backend/apps/common/attendance_close_api.py` and `api_urls.py`
- `backend/apps/iam/permission_catalog.py`
- `backend/apps/payroll/models.py`, `backend/apps/common/api_serializers.py`, `api_views.py`, and migration `0040_attendance_close_reference.py`
- `backend/tests/test_db6_attendance_close_integrity.py`
- `web/src/app/api/hr-admin/attendance-closes/*`
- `web/src/app/hr-admin/attendance-close/*`
- `web/tests/e2e/db6-attendance-close.spec.ts`
- DB-6 matrix, execution register, and DBR risk register

## Payroll Reconciliation

The browser fixture reconciled one employee and one attendance row for 2029-01 with `1.00` payable and `0.00` LOP. The same evidence hash remained on reconciled, submitted, approved, closed, and reopened events. A separate PostgreSQL test proved a payroll input snapshot auto-linked the matching closed version and rejected subsequent mutable snapshot save after governed reopen. Locked historical payroll remains protected by the existing DB-1 write barriers.

Automatic retro-pay generation after a post-lock correction was deliberately not invented. Such corrections remain an explicit governed adjustment/business-policy decision; they cannot rewrite locked or posted payroll.

## Verification

| Check | Result | Evidence |
|---|---:|---|
| Production-built Playwright close/reopen journey | 1 passed | `015-browser-close-reopen-final.log` |
| PostgreSQL close, stale evidence, blockers, isolation, payroll link | 4 passed | `025-postgresql-final-suite.log` |
| Attendance regressions | 24 passed | `028-attendance-regression.log` |
| Payroll input/lock/reconciliation regressions | 6 passed | `029-payroll-regression.log` |
| Employee close attempt | 403 | `021-api-rbac-tenant-isolation-final.log` |
| Cross-tenant close retrieval | 404 | `022-cross-tenant-api-final.log` |
| TypeScript | Passed | `026-typescript-final.log` |
| Targeted ESLint | Passed | `030-targeted-eslint.log` |
| Django check / migration drift | Passed / no changes | `027-django-check-migration-drift.log` |
| Production frontend build | Passed | `014-production-build-after-ui-fix.log` |
| Migration rollback/reapply | Passed | `031-migration-rollback-reapply.log` |

Principal executed commands:

```text
DJANGO_SETTINGS_MODULE=config.settings.base ... python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q tests/test_db6_attendance_close_integrity.py
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3111 PLAYWRIGHT_SKIP_WEB_SERVER=1 ... playwright test tests/e2e/db6-attendance-close.spec.ts --project=chromium --workers=1
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q apps/attendance/tests.py
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q apps/payroll/tests.py -k 'input_snapshot or input_lock or reconciliation'
pnpm typecheck
pnpm exec eslint src/app/hr-admin/attendance-close/attendance-close-workbench.tsx src/app/hr-admin/attendance-close/page.tsx tests/e2e/db6-attendance-close.spec.ts
HRMS_API_BASE_URL=http://127.0.0.1:8011/api/v1 pnpm build
python manage.py migrate payroll 0039; python manage.py migrate attendance 0010; python manage.py migrate attendance 0011; python manage.py migrate payroll 0040
python manage.py manage_playwright_workspace --seed-ref db65a --cleanup
python manage.py manage_playwright_workspace --seed-ref db65b --cleanup
```

The first browser attempt exposed a successful write followed by response serialization failure because `Employee.display_name` does not exist. The API now derives the actor label from persisted preferred/full name. A second attempt exposed lifecycle controls becoming clickable before the preceding shared pending guard settled; all transition controls now remain disabled until the active mutation completes. Both failures and final rerun are retained (`012`, `013`, `015`).

## Migrations And Compatibility

- `attendance.0011_monthly_attendance_close` is additive and installs scoped integrity, immutable-event, and closed-period write guards.
- `payroll.0040_attendance_close_reference` adds a nullable protected reference, preserving all pre-existing snapshots without guessing historical associations.
- Forward, rollback, and reapply succeeded on the disposable PostgreSQL database.

No historical attendance close or payroll association was inferred. Historical classification remains a separate controlled activity.

## Cleanup And Remaining Decisions

Disposable tenants `pw-qa-db65a` and `pw-qa-db65b` were used. Both were removed and independently counted as absent (`033-fixture-cleanup-verification.log`); the disposable PostgreSQL container was also removed (`034-container-cleanup.log`). Northstar, staging, production, and customer data were not accessed.

DBR-015 is **closed for newly managed attendance periods and payroll snapshots**. Remaining non-blocking policy decisions are: whether a post-lock correction should automatically create a retro-pay proposal, and whether future close scope must additionally split by pay group when one legal entity operates independently closed groups. Current behavior safely requires a new attendance version and explicit existing payroll adjustment controls.

DB-6.6 has not started.
