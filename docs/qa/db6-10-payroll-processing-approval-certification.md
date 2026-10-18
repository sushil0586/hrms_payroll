# DB-6.10 Payroll Processing and Approval Certification

Date: 2026-10-17  
Environment: isolated PostgreSQL 16, Redis 7, Django, production Next.js build, Celery worker and beat  
Decision: **PASS**

## Scope and result

All six frozen DB-6.10 scenarios passed. No scenario was skipped, blocked, failed, or left unexecuted.

| Scenario | Result | Primary proof |
| --- | --- | --- |
| DB6-10-001 eligible input lock | Passed | Browser created run/snapshot and locked one input; PostgreSQL confirmed `inputs_locked` and locked snapshot. |
| DB6-10-002 blocked lock/calculation | Passed | Schedule-spine blocker disabled browser lock; API regressions preserved state and returned controlled validation. |
| DB6-10-003 durable calculation | Passed | UI returned 202/queued, worker completed via outbox/beat, refresh restored success, totals reconciled. |
| DB6-10-004 retry/idempotency | Passed | Retryable failure, stale-worker recovery, duplicate request key, and one effective calculation passed. |
| DB6-10-005 approval/final lock | Passed | Browser submitted, approved, and final-locked; queryset and raw-SQL mutations were rejected. |
| DB6-10-006 concurrent creation | Passed | PostgreSQL allowed one active regular run while preserving cancelled replacement and supplementary flows. |

## Reconciliation

The certified browser run `DB610_1792247035709` persisted as `locked`. Durable job `9680c1a3-a441-40fb-a7cd-f83d778c066b` completed in one attempt with one of one item completed. Calculation `db2d35cd-3fb4-4e4e-ac85-e83295bc396d` contained one employee and one line: gross INR 50,000.00, deductions INR 0.00, net INR 50,000.00. Review `fa50d809-6544-41ee-b4f4-3a6840c4d9dc` retained approval and final-lock timestamps.

The November fixture originally claimed 22 present days. The live schedule spine proved 21 payable working days and correctly blocked input lock. The eligible fixture was corrected to 21 working, 20 present, and one LOP day. No business rule was changed.

## Automation remediation

Added `web/tests/e2e/db6-payroll-processing.spec.ts`. It waits for React client-island hydration using an executable handler signal rather than a delay, validates asynchronous job acceptance and completion, reload recovery, review transitions, and final lock. A separate payroll period avoids violating the DB-1 regular-run uniqueness invariant.

No application business logic, API contract, authorization, payroll formula, database constraint, or migration changed in DB-6.10.

## Verification

- Production-built Playwright: 1 passed in 57.1 seconds (`027-browser-payroll-processing-green.log`).
- Focused PostgreSQL/backend suite: 10 passed in 79.07 seconds (`029-backend-integrity-regression-green.log`).
- Broader payroll/DB-1 precheck: 26 passed (`apps/payroll/tests.py` and DB-1 integrity selection).
- TypeScript: passed (`031-typecheck.log`).
- ESLint: passed (`032-eslint.log`).
- Django check: no issues (`033-django-check.log`).
- Migration drift: no changes (`034-migration-drift.log`).
- Production build: passed; existing CSS `flex-end` compatibility warning only (`012-production-build-correct-api.log`).

## Exact commands

```bash
docker run --name hrms-db610-postgres -e POSTGRES_DB=hrms_db610 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=hrms -p 55450:5432 -d postgres:16-alpine
docker run --name hrms-db610-redis -p 6389:6379 -d redis:7-alpine
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db610 POSTGRES_USER=hrms POSTGRES_PASSWORD=hrms POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55450 python manage.py migrate --noinput
python manage.py manage_playwright_workspace --seed-ref db610 --tenant-code pw-qa-db610 --output-file ../docs/qa/evidence/db6-2026-10-17/db6-10/004-workspace.json
HRMS_API_BASE_URL=http://127.0.0.1:8020/api/v1 pnpm build
celery -A config worker -l INFO --concurrency 1
celery -A config beat -l INFO
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3120 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm exec playwright test tests/e2e/db6-payroll-processing.spec.ts --project=chromium --workers=1 --trace=retain-on-failure
pytest -q tests/test_db1_write_integrity.py::test_regular_payroll_run_business_identity_is_unique_and_exception_runs_remain_supported tests/test_db1_write_integrity.py::test_concurrent_regular_payroll_run_creation_allows_only_one_active_run tests/test_db1_write_integrity.py::test_locked_payroll_run_rejects_queryset_and_raw_sql_mutation tests/test_db1_write_integrity.py::test_approved_payroll_run_rejects_business_edits_but_allows_final_lock_transition apps/payroll/tests.py::PayrollScheduleSpineCalculationTests::test_background_job_records_retryable_failure_and_supports_controlled_retry apps/payroll/tests.py::PayrollScheduleSpineCalculationTests::test_background_job_recovers_stale_running_execution tests/test_phase0_api_smoke.py::test_hr_admin_payroll_input_lock_blocks_on_blocked_snapshot tests/test_phase0_api_smoke.py::test_hr_admin_payroll_draft_calculation_requires_locked_inputs tests/test_phase0_api_smoke.py::test_hr_admin_payroll_async_calculation_is_durable_idempotent_and_permission_scoped tests/test_phase0_api_smoke.py::test_hr_admin_payroll_review_approves_and_final_locks_run
pnpm typecheck
pnpm lint
python manage.py check
python manage.py makemigrations --check --dry-run
docker rm -f hrms-db610-postgres hrms-db610-redis
```

Secrets and repeated environment variables are omitted from this display and remain absent from evidence.

## Evidence and cleanup

Evidence is under `docs/qa/evidence/db6-2026-10-17/db6-10/`. Historical failed attempts and traces are retained. The failures were classified as API-prefix environment configuration, fixture uniqueness/reconciliation mismatch, missing Celery beat, and SSR hydration timing.

The fixture teardown helper cannot ordinarily delete tenants containing protected leave/payroll history after DB-4. The complete PostgreSQL/Redis instance is disposable and is removed after service shutdown; this preserves retention controls and removes all synthetic records without touching Northstar or any shared environment.

## Decision

DB-6.10 is **PASS**: 6 passed, 0 failed, 0 blocked, 0 skipped, 0 not run. Existing DB-6 policy blockers outside this workflow remain unchanged. Stop before DB-6.11 for review. Local certification does not establish production readiness.
