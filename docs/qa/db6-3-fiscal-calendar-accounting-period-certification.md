# DB-6.3 Fiscal Calendar and Accounting Period Certification

Date: 2026-10-17  
Decision: **PASS** for the isolated local DB-6.3 scope  
Production readiness: not claimed

## Scope and isolation

The six frozen DB-6.3 scenarios were executed against PostgreSQL 16 and the current production Next.js build in the disposable `pw-qa-db6-fiscal` workspace. Browser actions used an authorized Tenant Admin and an unauthorized employee identity. Northstar, staging, production, and customer data were not accessed or changed. Execution stops before DB-6.4.

## Results

| Status | Count |
|---|---:|
| Passed | 6 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 0 |

The 92-scenario register now contains 26 `Passed`, 5 previously documented policy `Blocked`, and 61 `Not Run` scenarios.

## Implemented browser surface

DB-2 already provided the persisted `FiscalCalendar`, `FiscalYear`, `AccountingPeriod`, immutable status-event models, transition services, PostgreSQL overlap/tenant/status guards, and payroll/finance relationships. It did not provide an administrative API or browser surface.

DB-6.3 adds a compact Tenant Admin workbench at `/tenant-admin/financial-calendars` and tenant-scoped APIs under `/api/v1/tenant-admin/financial-calendars/`. The UI supports tenant defaults, legal-entity overrides, explicit fiscal-year boundaries, accounting-period creation, audited close/reopen, validation errors, retained form values, Retry, stable async buttons, and permission-based controls. It reuses DB-2 models and services; no duplicate calendar model or invented accounting policy was introduced. These operations are synchronous, so Celery evidence is not applicable.

## Scenario evidence

| ID | Outcome | Evidence |
|---|---|---|
| DB6-03-001 | Browser created an April-March tenant calendar, January-December legal-entity override, FY2026-27, and April period. Overlap was rejected with actionable Retry. | `029`, `030` |
| DB6-03-002 | March earnings with April payment/posting preserve distinct payroll, fiscal, and accounting dates. | `031` |
| DB6-03-003 | Service and PostgreSQL reject posting into closed periods. | `031` |
| DB6-03-004 | Real PostgreSQL concurrent close versus posting produces a serializable valid outcome. | `031` |
| DB6-03-005 | Authorized browser close/reopen persisted actor/reason/request keys; employee and unauthorized API access were denied. | `029`, `030`, `031` |
| DB6-03-006 | Calendar boundary changes cannot rewrite fiscal years or historical payroll/accounting associations. | `031` |

PostgreSQL independently recorded tenant `0c2d6bbf-f3df-4145-9036-175a0d413540`, calendars `a16f24e7-6203-4507-9df6-abf026ceb327` and `dfcfce76-86c2-469d-af43-6a33bd8875aa`, fiscal year `f7a53736-263b-417b-a830-d762e6725685`, and period `0a3b0067-3479-4d65-aa74-fc2fc3a539e1`. The period ended open after one authorized reopen and retained two append-only close/reopen events.

## Root causes and remediation

### Missing administrative integration

The DB-2 domain and integrity layer existed, but authorized users had no supported browser/API workflow to configure calendars or operate periods. The new API and workbench expose that existing domain safely using `tenant.settings.manage` for configuration and `finance.periods.close` / `finance.periods.reopen` for governed transitions.

### Browser assertion drift

The overlap error test initially matched Next.js's route-announcer alert as well as the application alert, then expected `overlaps` while the validated message says `cannot overlap`. The locator was scoped to `.notice--error[role='alert']` and the semantic assertion now accepts `duplicate|overlap`. Product validation and business assertions were unchanged.

### Disposable cleanup limitation

Ad hoc ORM deletion and the generic workspace cleanup command both correctly failed against append-only/`PROTECT` fiscal history. The final run therefore used a clean disposable database and cleanup removes the entire isolated PostgreSQL container/volume. No integrity trigger was disabled. A future fixture-tool enhancement may add an explicitly governed whole-workspace teardown path for protected synthetic history; this is not a product integrity blocker.

## Verification

| Check | Result | Evidence |
|---|---:|---|
| Production-build browser workflow and denial | 2 passed | `029-browser-final-clean-green.log` |
| Exact browser-created PostgreSQL state | IDs, dates, scope, status, reopen count and 2 events verified | `030-browser-postgresql-persistence.json` |
| DB-1, DB-2, DB-6 API and finance regression | 23 passed | `031-integrity-finance-regression.log` |
| Django checks, migration apply and drift | passed; no pending migration | `032-django-migration-checks.log` |
| TypeScript | passed | `033-typescript-final.log` |
| Targeted ESLint | passed | `034-eslint-final.log` |
| Production frontend build | passed; existing Autoprefixer warning only | `023-production-build-local-api.log` |
| Disposable stack teardown | database container absent and port closed | `035-stack-teardown.log` |

Historical run logs `007` through `025` are retained. They document environment startup mistakes, accessible-locator drift, and the final grammatical matcher correction; none is counted as a pass.

## Modified files

- `backend/apps/common/fiscal_api.py`
- `backend/apps/common/api_urls.py`
- `backend/apps/iam/menu_catalog.py`
- `backend/tests/test_db6_fiscal_calendar_api.py`
- `web/src/app/api/tenant-admin/financial-calendars/[[...path]]/route.ts`
- `web/src/app/tenant-admin/financial-calendars/page.tsx`
- `web/src/app/tenant-admin/financial-calendars/financial-calendar-workbench.tsx`
- `web/src/app/tenant-admin/layout.tsx`
- `web/src/lib/api.ts`
- `web/src/lib/types.ts`
- `web/tests/e2e/db6-fiscal-calendar-browser.spec.ts`
- DB-6 matrix, execution register, and this report

## Exact commands

```bash
docker run --name hrms-db6-fiscal-postgres -d -e POSTGRES_DB=hrms_db6_fiscal -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=*** -p 55440:5432 --tmpfs /var/lib/postgresql/data:rw,size=2g postgres:16-alpine
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440 POSTGRES_DB=hrms_db6_fiscal POSTGRES_USER=hrms POSTGRES_PASSWORD=*** backend/.venv/bin/python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440 POSTGRES_DB=hrms_db6_fiscal POSTGRES_USER=hrms POSTGRES_PASSWORD=*** backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db6-fiscal --tenant-code pw-qa-db6-fiscal --password ***
HRMS_API_BASE_URL=http://127.0.0.1:8008/api/v1 pnpm --dir web build
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3108 PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_LIVE_TENANT_ADMIN_USERNAME=pw_db6_fiscal_tenant_admin PLAYWRIGHT_LIVE_EMPLOYEE_USERNAME=pw_db6_fiscal_employee pnpm --dir web exec playwright test tests/e2e/db6-fiscal-calendar-browser.spec.ts --project=chromium --workers=1
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55440 POSTGRES_DB=hrms_db6_fiscal POSTGRES_USER=hrms POSTGRES_PASSWORD=*** .venv/bin/pytest -q backend/tests/test_db1_write_integrity.py backend/tests/test_db2_fiscal_integrity.py backend/tests/test_db6_fiscal_calendar_api.py backend/tests/test_phase0_api_smoke.py::test_hr_admin_payroll_finance_handoff_generate_and_transmit
pnpm --dir web typecheck
pnpm --dir web exec eslint tests/e2e/db6-fiscal-calendar-browser.spec.ts src/app/tenant-admin/financial-calendars src/app/api/tenant-admin/financial-calendars src/lib/api.ts src/lib/types.ts
docker rm -f hrms-db6-fiscal-postgres
```

## Decision

DB-6.3 is **PASS** for local browser/API/PostgreSQL certification. All six frozen scenarios have evidenced outcomes; no DB-6.3 scenario is failed, blocked, skipped, or not run, and no unresolved P0 fiscal-period integrity or security defect remains. The pre-existing five blocked policy scenarios elsewhere in the 92-case matrix remain unchanged. This is not production readiness certification.
