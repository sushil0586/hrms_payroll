# DB-6.7 Salary And Payroll Configuration Certification

Date: 2026-10-17  
Environment: disposable PostgreSQL 16 database and production-built local browser application  
Decision: **PASS** for the six frozen DB-6.7 scenarios; production readiness is not claimed.

## Result

DB-6.7: **6 Passed, 0 Failed, 0 Blocked, 0 Skipped, 0 Not Run**. The frozen 92-scenario register now contains **47 Passed, 5 Blocked, 40 Not Run**. Existing DB-6.4 and DB-6.6 policy blockers remain unchanged.

## Browser And Configuration Evidence

- Payroll Setup browser CRUD created and edited a payroll calendar, non-overlapping period, pay group, and employee assignment; duplicate calendar and invalid structural mapping feedback remained actionable.
- Salary Setup browser CRUD created and edited a component, structure, effective version, component line, and employee assignment with client and server validation.
- Statutory Setup browser CRUD covered packs, components, slabs, employee profiles/declarations, registrations, filing calendars, and proof actions.
- The first payroll browser attempt failed only because the technical prerequisite used unauthenticated `page.request`. It is retained in `005`; switching that prerequisite to the existing browser-session helper produced the passing `006` result without replacing browser business actions.

## Confirmed Defect And Fix

The payroll input snapshot API previously accepted salary assignment `31a87774-1296-47cd-9e3c-605c1b62c39f` for employee `QA-HR-001` although the assignment belonged to `QA-EMP-001`. The exact request returned HTTP 201 (`010`).

`save_hr_admin_payroll_input_snapshot` now validates before persistence:

- salary and pay-group assignments belong to the selected employee;
- selected assignments are active and intersect the earning period;
- pay-group assignment matches the payroll run pay group;
- payroll run pay group and period share one payroll calendar.

The original request now returns HTTP 400 with an actionable field error (`011`). A regression also proves a future salary assignment is rejected for a September earning period while the correct September assignment still creates and locks (`022`). No calculation, proration, statutory, or rounding formula changed.

## PostgreSQL And Boundary Integrity

DB-5 advisory-lock triggers were exercised with real simultaneous transactions for salary and pay-group assignments. Each race produced exactly one commit and one rejection. Cross-tenant references and active-window overlaps remain database guarded.

The statutory boundary fixture used adjacent packs: FY2026-27 ending 2027-03-31 and FY2027-28 beginning 2027-04-01. A March earning period with an April payment date selected the former; an April earning period selected the latter. Selection therefore follows earning-period applicability, without conflating payment date, statutory pack dates, or accounting date.

Mid-month proration and retroactive correction formulas were not invented. Existing explicit snapshot, adjustment, and immutable finalized-payroll controls remain authoritative; those end-to-end calculations belong to DB-6.10 and DB-6.11.

## Verification

| Check | Result | Evidence |
|---|---:|---|
| Payroll Setup browser CRUD | 1 passed | `006-browser-payroll-setup-rerun.log` |
| Salary Setup browser CRUD | 1 passed | `005-browser-setup-crud-rerun.log` |
| Statutory Setup browser CRUD | 1 passed | `013-browser-statutory-crud.log` |
| Payroll configuration/API regressions | 11 passed | `007-payroll-config-api-regressions.log` |
| PostgreSQL effective/concurrency suite | 8 passed | `008-postgresql-effective-concurrency.log` |
| Snapshot ownership/effective-date regression | 1 passed | `022-snapshot-effective-date-regression.log` |
| Entitlement/RBAC regressions | 3 passed | `014-entitlement-rbac-regressions.log` |
| Statutory year boundary | 1 passed | `015-statutory-boundary.log` |
| Payroll calculation/input regressions | 6 passed | `016-payroll-regressions.log` |
| TypeScript / targeted ESLint | Passed / Passed | `017-typescript.log`, `018-eslint.log` |
| Django check / migration drift | Passed / no changes | `019-django-check.log`, `020-migration-drift.log` |
| Production frontend build | Passed with existing CSS compatibility warning | `021-production-build.log` |
| Disposable workspace and database cleanup | Verified absent | `023-workspace-cleanup.log`, `024-cleanup-verification.log`, `025-container-cleanup.log` |

## Modified Files

- `backend/apps/common/api_views.py`
- `backend/tests/test_phase0_api_smoke.py`
- `backend/tests/test_db5_effective_employment_integrity.py`
- `backend/tests/test_db6_payroll_configuration_integrity.py`
- `web/tests/e2e/payroll-setup-flows.spec.ts`
- DB-6 master matrix, execution register, this report, and retained evidence logs

## Decision

DB-6.7 is **PASS** for its frozen scope. The discovered P0 salary-assignment binding defect was reproduced, corrected at the API write boundary, and covered by valid and invalid regression paths. DB-6.8 has not started.

The isolated tenant `pw-qa-db67`, its deliberately invalid reproduction snapshot, and all owned records were deleted. PostgreSQL independently reported zero tenant and snapshot rows, and the disposable container was removed. Northstar, staging, production, and customer data were not accessed.
