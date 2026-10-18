# DB-6.14 Final Multi-Year Integrity Certification

Date: 2026-10-17  
Environment: disposable PostgreSQL 16 and Redis 7; Django; production-built Next.js; real Celery worker and beat  
Decision: **CONDITIONAL PASS**

## Frozen Scope

The five executable DB-6.14 scenarios passed. DB6-14-003 remains blocked because ambiguous historical records may not be assigned a fiscal, leave, or employment period without approved classification rules.

| Scenario | Status | Evidence |
| --- | --- | --- |
| DB6-14-001 | Passed | `011-db1-db6-postgresql-regression.log`, `044-multiyear-test-inventory.log` |
| DB6-14-002 | Passed | `031`-`035` migration/hash evidence |
| DB6-14-003 | Blocked | inherited historical-classification policy gate |
| DB6-14-004 | Passed | `011-db1-db6-postgresql-regression.log` |
| DB6-14-005 | Passed | `040`, `043`, `045`-`048` |
| DB6-14-006 | Passed | this evidence reconciliation and release-risk register |

Final frozen register: **92 unique; 87 passed; 5 blocked; 0 failed; 0 skipped; 0 not run**.

## Integrity Evidence

Fresh PostgreSQL execution passed **69 tests** in 239.48 seconds. The suite covered fiscal-year transitions and March-paid-in-April mapping, legal-entity calendar precedence, closed-period posting, audited reopen, leave-year transitions, the 18-to-10 carry-forward and 8-day forfeiture example, expiry lots, cross-year leave, duplicate/concurrent rollover, worker retry, effective-dated employee and manager scope, salary/statutory boundary resolution, attendance monthly-close versions, payroll snapshot references, tenant guards, workflow races, financial immutability, retention, and legal holds.

The evidence reconciles the deterministic DB-2, DB-3/3A, DB-5, DB-6.5A, DB-6.7, DB-6.10, DB-6.11, and DB-6.13 year-by-year results. No ambiguous historical row was mutated or classified. Managed fiscal, leave, attendance, salary, payroll, output, and finance records retain explicit tenant, business-date, and period ownership.

## Migration Safety

A fresh forward migration applied all migrations through `payroll.0040`, `attendance.0011`, `leave_management.0010`, `employee_lifecycle.0003`, and `tenants.0005`. The rollback rehearsal intentionally moved `tenants` from `0005` to `0004`; Django also unapplied its six dependent migrations. A complete forward reapply succeeded. The managed tenant/employee data hash before and after was identical:

`a4fc5fa9d6a635c1680f08d2be240c12bed9d767c478cfc07b8a82a9245d57ab`

The first two hash attempts used obsolete field names and are retained as failed harness evidence. They did not mutate data and are not counted.

## Browser And Celery

The production build completed. Browser payroll processing passed from input lock through durable calculation, approval, output publication, payslip generation, and finance handoff. Real Celery beat dispatched queued jobs and a real worker completed four tenant-scoped jobs: calculate `1/1`, generate outputs `1/1`, publish outputs `2/2`, and finance handoff `3/3`. Persistence before cleanup showed two payroll runs, five artifacts, one finance handoff, and no failed job.

The employee lifecycle browser smoke also passed, including historical movement and archive behavior. Two legacy ESS/MSS attempts failed during setup because those specs use fixed Northstar-style personas rather than the disposable manifest. They are retained in `041` and `042`, classified as fixture-context mismatch, and are not counted as product failures or passes. Equivalent ESS/MSS connected behavior remains evidenced by DB-6.8, DB-6.9, and DB-6.13.

## Verification Summary

- PostgreSQL DB-1 through DB-6 integrity suite: **69 passed**.
- Production-built Playwright: **2 passed**; two legacy setup attempts excluded with explicit evidence.
- Django check: passed; migration drift: none.
- TypeScript: passed; focused ESLint: passed.
- Production frontend build: passed with the pre-existing CSS `end` compatibility warning.
- Disposable workspace deletion: verified absent.
- PostgreSQL and Redis containers: removed; zero DB-6.14 containers remain.

Evidence root: `docs/qa/evidence/db6-2026-10-17/db6-14/`.

## Principal Commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base ... python backend/manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base ... pytest -q backend/tests/test_db1_write_integrity.py backend/tests/test_db2_fiscal_integrity.py backend/tests/test_db3_leave_year_integrity.py backend/tests/test_db3a_leave_year_operations.py backend/tests/test_db4_tenant_integrity_retention.py backend/tests/test_db4b_retention_governance.py backend/tests/test_db5_effective_employment_integrity.py backend/tests/test_db6_organization_integrity.py backend/tests/test_db6_fiscal_calendar_api.py backend/tests/test_db6_attendance_close_integrity.py backend/tests/test_db6_payroll_configuration_integrity.py
python backend/manage.py migrate tenants 0004 --noinput
python backend/manage.py migrate --noinput
celery -A config worker --loglevel=INFO --concurrency=1
celery -A config beat --loglevel=INFO
pnpm --dir web start
pnpm --dir web exec playwright test tests/e2e/db6-payroll-processing.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/db6-employee-lifecycle.spec.ts --workers=1
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
pnpm --dir web exec tsc --noEmit
pnpm --dir web exec eslint tests/e2e/db6-payroll-processing.spec.ts tests/e2e/db6-employee-lifecycle.spec.ts tests/helpers/isolated-qa-workspace.ts
pnpm --dir web build
python backend/manage.py manage_playwright_workspace --seed-ref db614-final --cleanup
docker rm -f hrms-db614-postgres hrms-db614-redis
```

Connection variables and full command output are retained in the numbered logs; secrets are not reproduced in this report.

## Remaining Policy Gates

| Scenario | Decision required | Current safe behavior | Pilot disposition |
| --- | --- | --- | --- |
| DB6-04-006 | Post-expiry leave cancellation/restoration | blocked; no expired entitlement is recreated | Exclude cancellation after expiry |
| DB6-06-004 | Cross-legal-entity transfer continuity | fails closed | Exclude cross-entity transfers |
| DB6-06-005 | Rehire/service-continuity semantics | fails closed | Exclude rehire processing |
| DB6-12-004 | Protected export and irreversible erasure governance | erasure disabled; holds/retention enforced | Export may remain approval-only; exclude erasure |
| DB6-14-003 | Historical fiscal/leave/employment classification | records remain preserved and unclassified | Use newly governed records only |

Approval belongs to HR/legal/payroll governance for leave and employment rules, and legal/privacy/security governance for retention and erasure. Each decision requires new migration impact analysis and focused retesting; none was inferred here.

## Decision

Local functional and managed-database integrity are **CONDITIONALLY CERTIFIED** for the supported scope. Production deployment is **NO-GO** until the five policy gates and external staging controls in the release-risk register are approved and verified. This local result is not production-readiness certification.
