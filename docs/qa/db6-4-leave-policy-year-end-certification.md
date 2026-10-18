# DB-6.4 Leave Policy and Year-End Certification

Date: 2026-10-17  
Decision: **CONDITIONAL**  
Production readiness: not claimed

## Frozen scope

DB-6.4 contains six unique scenarios. Five executable scenarios passed. `DB6-04-006` remains blocked because post-expiry cancellation requires an approved restore, re-expire, or controlled-correction policy; no default was invented.

| Status | Count |
|---|---:|
| Passed | 5 |
| Failed | 0 |
| Blocked | 1 |
| Skipped | 0 |
| Not Run | 0 |

The 92-scenario register now contains 31 `Passed`, 5 `Blocked`, and 56 `Not Run` outcomes. Existing blocked policy decisions remain explicit.

## Route and integrity map

| Workflow | Browser/API | Persistence and control |
|---|---|---|
| Leave-year configuration | `/hr-admin/leave-year`, `/tenant-admin/leave-year`; scoped periods/options APIs | `LeavePolicyPeriod`, policy/legal-entity ownership and overlap guards |
| Preview and close | preview and close-run APIs | `LeaveYearCloseRun`, immutable items, idempotency key |
| ESS request/cancellation | `/ess/leave`; request/cancel APIs | `LeaveRequest`, reservations, allocations, ledger compensation |
| MSS approval | `/mss/approvals`; manager decision API | workflow decision, governed consumption and audit |
| Worker processing | `leave.execute_year_close` through Redis/Celery | row locks, one movement key per employee/action, durable state |
| Expiry | backend expiry service | earliest-expiry lots and append-only expiry movement |

## Browser evidence

The production Next.js build was used against a disposable tenant and PostgreSQL 16 database.

- HR Admin previewed the worked example: `18.00` available, `10.00` carried, `8.00` forfeited.
- Typed confirmation and a rapid double click produced one durable close command.
- Queued state survived browser reload; mobile 390x844 retained compact layout without horizontal overflow.
- Tenant Admin viewed the same tenant-scoped periods after remediation of its options endpoint.
- ESS submitted a real balance-backed leave request; query-based detail confirmed persistence.
- MSS approved a real request in the review dialog; ESS observed the approved result and manager note.
- A policy-authorized ESS cancellation persisted `cancelled` through the actual lifecycle action.

The browser cancellation fixture used the established legacy casual-balance path and therefore had no governed ledger rows. The governed append-only compensation invariant was verified separately in PostgreSQL with exact lot restoration and source-transaction linkage; these are intentionally reported as distinct evidence.

## Ledger and Celery reconciliation

Browser-created close run `8732a825-7374-4500-af99-e02539bdc522` was dispatched to an actual Redis-backed Celery worker and completed in 0.295 seconds:

```text
Source opening:       18.00
Forfeiture movement:   8.00
Source closing:       10.00
Carry-forward credit: 10.00
Target closing:       10.00
Attempt count:            1
Processed / failed:     1 / 0
```

The DB-3 worked-example regression additionally proved a `4.00` expiring lot and `6.00` base lot, earliest-expiry consumption, expiry after grace, and exact reconciliation. Failure injection followed by retry produced one effective carry-forward movement. Duplicate task execution, duplicate dispatch, stale-worker recovery, concurrent close/approval, cross-tenant references, append-only bypass attempts, and historical policy snapshot preservation all passed on PostgreSQL.

## Defects and repairs

### Tenant Admin leave-year options

**Root cause:** `/tenant-admin/leave-year` correctly used Tenant Admin period/status APIs but fetched its policy/legal-entity choices from the HR Admin options endpoint. A legitimate Tenant Admin received `403`, and production server rendering displayed the workspace error boundary.

**Fix:** added a narrowly scoped `/api/v1/tenant-admin/leave-year/options/` endpoint protected by `leave.periods.view`, returning only same-tenant policy and active legal-entity options. The Tenant Admin page now uses this endpoint. No HR permission or tenant boundary was broadened.

### Browser automation drift

- Replaced the DB-3A fixed token, port, and out-of-browser request context with shared authenticated browser-session helpers.
- ESS success now verifies the current closed-dialog and query-restored persisted detail instead of obsolete in-dialog text.
- Replaced a random date that could land on a weekend with deterministic working-day selection.
- Cancellation response capture now follows Next.js's trailing-slash redirect and asserts the final mutation response.

No leave calculation, accrual, payroll, authorization, or ledger business rule was changed.

## Verification results

| Check | Result | Evidence |
|---|---:|---|
| DB-3/DB-3A plus ESS/MSS backend regression | 21 passed | `006-postgresql-leave-regression.log` |
| Tenant options regression | 1 passed | `009-tenant-options-regression.log` |
| Leave-year browser initial run | 2 passed, 1 defect reproduction | `008-browser-leave-year.log` |
| Tenant Admin fix rerun | 1 passed | `011-browser-tenant-fix.log` |
| ESS submission final | 1 passed | `022-ess-browser-green.log` |
| MSS queue neighboring regression | 1 passed | `017-ess-mss-browser-regression.log` |
| MSS actual approval | passed | `025`, `030`, `034`, `038` |
| ESS actual cancellation | passed | `039-final-cancellation-green.log` |
| Real Celery dispatch/completion | succeeded; one item, zero failures | `012`-`016` |
| PostgreSQL ledger reconciliation | exact 18/10/8 | `016-postgresql-ledger-reconciliation.json` |
| Cancellation persistence | cancelled; legacy path explicitly identified | `041-browser-cancellation-postgresql.json` |
| Django/migrations/drift | passed; no pending migration | `042-django-migration-checks.log` |
| TypeScript and targeted ESLint | passed | `043-typescript.log`, `044-eslint.log` |
| Production build | passed; existing Autoprefixer warning only | `010-production-build-after-fix.log` |
| Isolated teardown | PostgreSQL/Redis absent; ports closed | `045-stack-teardown.log` |

Historical failure logs are retained and are not counted as passes.

## Modified files

- `backend/apps/common/leave_year_api.py`
- `backend/apps/common/api_urls.py`
- `backend/tests/test_db3a_leave_year_operations.py`
- `web/src/app/tenant-admin/leave-year/page.tsx`
- `web/src/lib/api.ts`
- `web/tests/e2e/db3a-leave-year-operations.spec.ts`
- `web/tests/e2e/ess-leave-policy-resolution-certification.spec.ts`
- DB-6 matrix, register, and this report

## Remaining policy decisions

1. Post-expiry cancellation: restore, immediately re-expire, or require a controlled correction (`DB6-04-006`).
2. Cross-entity transfer: preserve, convert, encash, or forfeit.
3. Rehire/exit/anniversary proration ownership.
4. Historical unclassified balances and transactions require governed classification approval.

Current safe behavior rejects automatic post-expiry restoration and never rewrites historical ledger entries.

## Principal commands

```bash
docker run --name hrms-db6-leave-postgres -d -e POSTGRES_DB=hrms_db6_leave -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=*** -p 55441:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine
docker run --name hrms-db6-leave-redis -d -p 56380:6379 redis:7-alpine
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55441 POSTGRES_DB=hrms_db6_leave POSTGRES_USER=hrms POSTGRES_PASSWORD=*** backend/.venv/bin/python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55441 POSTGRES_DB=hrms_db6_leave POSTGRES_USER=hrms POSTGRES_PASSWORD=*** .venv/bin/pytest -q backend/tests/test_db3_leave_year_integrity.py backend/tests/test_db3a_leave_year_operations.py [four focused ESS/MSS API nodes]
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3109 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm --dir web exec playwright test tests/e2e/db3a-leave-year-operations.spec.ts --project=chromium --workers=1
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3109 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm --dir web exec playwright test tests/e2e/ess-leave-policy-resolution-certification.spec.ts --project=chromium --workers=1
CELERY_BROKER_URL=redis://127.0.0.1:56380/0 backend/.venv/bin/celery -A config worker -l INFO -c 1
pnpm --dir web typecheck
pnpm --dir web build
docker rm -f hrms-db6-leave-postgres hrms-db6-leave-redis
```

## Decision

DB-6.4 is **CONDITIONAL**: five executable frozen scenarios passed with browser, API, PostgreSQL, and Celery evidence; one explicit P0 policy scenario remains blocked pending business approval. There is no unresolved demonstrated leave-integrity or tenant-isolation defect in the approved governed path. DB-6.5 has not started. Production readiness remains NO-GO.
