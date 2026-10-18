# DB-6.6 Employee Lifecycle Certification

Date: 2026-10-17  
Environment: disposable PostgreSQL 16 database and production-built local browser application  
Decision: **CONDITIONAL**; production readiness is not claimed.

## Scope And Result

The six frozen DB-6.6 scenarios were reconciled without adding or duplicating IDs.

| Status | Count | Scenario IDs |
|---|---:|---|
| Passed | 4 | DB6-06-001, DB6-06-002, DB6-06-003, DB6-06-006 |
| Failed | 0 | None |
| Blocked | 2 | DB6-06-004, DB6-06-005 |
| Skipped | 0 | None |
| Not Run | 0 | None |

The frozen 92-scenario register now contains **41 Passed, 5 Blocked, 46 Not Run**. DB-6.6 is conditional because cross-entity transfer and rehire continuity require approved business policies; they were not approximated or silently treated as exclusions.

## Browser, API, And Persistence Evidence

The production-built browser created employee `DB66-mvccygx4`, persisted employee ID `55b0e803-6491-41df-9222-80996981a597`, and created one canonical employment spell and assignment effective 2026-01-01. The browser then completed a same-entity transfer effective 2026-10-10 to a separately provisioned department and manager. It finally deactivated the employee through the edit wizard and reloaded the detail panel.

PostgreSQL independently confirmed:

- the original assignment ends on 2026-10-09 with `superseded` status;
- the replacement assignment starts on 2026-10-10 and remains open;
- the employee projection department and manager equal the open assignment;
- the employee remains historically queryable with `inactive` employment status;
- the canonical employment spell and both assignments remain present.

The authenticated employee resource rejected `DELETE` with HTTP 405. A direct PostgreSQL deletion independently failed because lifecycle history retains protected employee references. Evidence: `014-browser-lifecycle-delete-protection.log`, `015-raw-sql-hard-delete-rejected.log`, and `022-final-persisted-lifecycle.log`.

## Integrity And Downstream Results

`tests/test_db5_effective_employment_integrity.py` passed 6/6 against PostgreSQL. This includes dated-history resolution, cross-tenant rejection, leave/attendance policy resolution by business date, API tenant scope, and a real simultaneous-overlap test in which exactly one assignment writer succeeds.

DB-1 and DB-4 neighboring integrity suites passed 13/13. They retain payroll uniqueness and immutability, reject ORM/bulk/raw cross-tenant references, protect historical parents, preserve authorized synthetic teardown, and keep concurrent payroll-job/delete behavior safe. No payroll formula, attendance rule, leave rule, tenant scope, or API contract changed in DB-6.6.

The downstream claim is deliberately bounded. DB-6.6 directly proves point-in-time leave and attendance policy selection and proves that existing payroll history cannot be mutated or orphaned by lifecycle operations. Salary structure/version assignment is frozen under DB-6.7, ESS profile/document isolation under DB-6.8, and effective manager queue visibility under DB-6.9; those Not Run IDs were not borrowed or marked passed here. Future-effective projection behavior and controlled cross-entity rejection are covered by the DB-5 PostgreSQL suite, while the two unresolved continuity policies remain Blocked below.

## Automation Remediation And Historical Attempts

No product behavior defect was confirmed and no application business logic changed. The new focused test is `web/tests/e2e/db6-employee-lifecycle.spec.ts`. The test-only `manage_playwright_workspace` cleanup command was extended to remove lifecycle events, movements, exits, reviews, onboarding rows, assignments, and spells inside its existing ownership-verified synthetic teardown capability.

Initial attempts `003` through `010` are retained. They established three automation/fixture causes: the seeded HR Admin was not a valid employee manager option, the successful create response body was unavailable after redirect, and the first technical target department lacked the employee business unit so the edit wizard correctly filtered it out. The final fixture resolves the manager by an authorized employee option, reads the persisted employee ID from the canonical query URL, waits for asynchronous select options, uses exact field labels, and creates the target department in the same business unit. Assertions were not weakened.

## Blocked Policy Decisions

- **DB6-06-004:** Cross-entity transfer remains fail-closed until leave entitlement, payroll/statutory registration, fiscal ownership, service continuity, and history-conversion rules are approved.
- **DB6-06-005:** Rehire remains blocked until identity reuse, spell linkage, benefit/service continuity, prior assignment visibility, and exit-to-rehire rules are approved.

These are genuine policy blockers inherited from DB-5, not fixture or automation failures. Same-entity changes are certified; cross-entity transfer and rehire are not.

## Verification Summary

| Check | Result | Evidence |
|---|---:|---|
| Production-built employee lifecycle Playwright | 1 passed | `014-browser-lifecycle-delete-protection.log` |
| DB-5 effective employment PostgreSQL suite | 6 passed | `013-db5-effective-integrity-tests.log` |
| DB-1 and DB-4 integrity regressions | 13 passed | `016-db1-db4-regressions.log` |
| Direct SQL destructive delete | Rejected | `015-raw-sql-hard-delete-rejected.log` |
| Persisted lifecycle reconciliation | Matched | `022-final-persisted-lifecycle.log` |
| TypeScript | Passed | `017-typescript.log` |
| Targeted ESLint | Passed | `018-eslint.log` |
| Django check / migration drift | Passed / no changes | `019-django-check.log`, `020-migration-drift.log` |
| Production frontend build | Passed with one existing CSS compatibility warning | `021-production-build.log` |
| Disposable workspace and database cleanup | Verified absent | `023-workspace-cleanup.log`, `024-workspace-cleanup-rerun.log`, `025-cleanup-verification.log`, `026-container-cleanup.log` |

Principal commands:

```text
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3116 PLAYWRIGHT_SKIP_WEB_SERVER=1 HRMS_API_BASE_URL=http://127.0.0.1:8016/api/v1 ... playwright test tests/e2e/db6-employee-lifecycle.spec.ts --project=chromium --workers=1
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q tests/test_db5_effective_employment_integrity.py
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q tests/test_db4_tenant_integrity_retention.py tests/test_db1_write_integrity.py
docker exec hrms-db66-postgres psql ... DELETE FROM employees_employee ...
pnpm typecheck
pnpm exec eslint tests/e2e/db6-employee-lifecycle.spec.ts
python manage.py check
python manage.py makemigrations --check --dry-run
pnpm build
python manage.py manage_playwright_workspace --seed-ref db66 --cleanup
```

The first cleanup attempt was rejected by Django `PROTECT` after the browser-created lifecycle history exposed a gap in the synthetic teardown helper. The retained `023` failure proves the historical guard worked. The ownership-verified helper was then completed for DB-5 lifecycle rows; the rerun deleted only tenant `pw-qa-db66`, and independent PostgreSQL counts confirmed zero tenant, employee, and assignment rows. The isolated PostgreSQL container was removed and independently reported absent. Northstar, staging, production, and customer data were not accessed.

## Decision

DB-6.6 is **CONDITIONAL**: all four executable scenarios passed with browser, API, PostgreSQL, concurrency, and neighboring financial-integrity evidence. The two frozen policy scenarios remain explicitly Blocked. DB-6.7 has not started.
