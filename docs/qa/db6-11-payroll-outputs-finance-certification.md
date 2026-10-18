# DB-6.11 Payroll Outputs, Payslips, Payments, and Finance Certification

Date: 2026-10-17  
Environment: isolated PostgreSQL 16, Redis 7, Django, production Next.js build, Celery worker and beat  
Decision: **PASS**

## Result

All six frozen DB-6.11 scenarios passed: **6 passed, 0 failed, 0 blocked, 0 skipped, 0 not run**.

| Scenario | Result | Executed proof |
| --- | --- | --- |
| DB6-11-001 output generation/publication | Passed | Browser initiated durable generation and publication after final lock; PostgreSQL showed one published, reconciled batch. |
| DB6-11-002 payslip/artifact security | Passed | Synthetic employee saw and downloaded only the own published payslip; ownership, tenant, permission, and unpublished-artifact API tests passed. |
| DB6-11-003 finance reconciliation | Passed | Browser generated the handoff; gross, deductions, net, employee count, and bank-advice total matched the payroll batch. |
| DB6-11-004 provider idempotency | Passed | Duplicate callback, retry worker, dead-letter, viewer denial, and stale-worker recovery tests passed. |
| DB6-11-005 closed-period guard | Passed | Real PostgreSQL close-versus-posting serialization and finance service guards rejected invalid posting. |
| DB6-11-006 partial failure recovery | Passed | Reconciliation failures blocked publication/handoff; bounded retry and durable recovery did not duplicate effective work. |

## Browser And Persistence Evidence

The final browser run `DB610_1792248389983` performed input creation/lock, Celery calculation, review submit/approve/final lock, output generation, publication, finance handoff generation, ESS login, and employee payslip download. It passed in 1.4 minutes (`013-browser-output-finance-ess-security-green.log`).

PostgreSQL independently confirmed run `b6e2a670-c719-4258-88a9-02002844e7f4` remained `locked`; batch `b74b8917-69fa-465f-9d91-fa488c44d8dc` was `published`; reconciliation passed with one payslip, one register row, one matched employee, and zero mismatches. Generated artifacts comprised one payslip, register, bank advice, accounting export, and statutory report, each with a persisted checksum. Calculation, generation, publication, and handoff jobs each succeeded once.

The batch and handoff both recorded gross INR 50,000.00, employee deductions INR 0.00, net INR 50,000.00, and employee count 1. Bank advice total equaled net pay. This synthetic flow generated but did not transmit a real payment or provider transaction.

## Remediation And Classification

Only automation drift was repaired in `web/tests/e2e/db6-payroll-processing.spec.ts`:

- Reload persisted review state between submit, approve, final-lock, and output-generation transitions in the production server-rendered UI.
- Resolve the output batch through the real accessible batch rail instead of an obsolete/nonexistent Next.js proxy endpoint.
- Scope the batch locator to avoid artifact links sharing the run code.
- Validate ESS download using the browser download event, avoiding a separate Playwright request context after persona switching.

No application source, payroll formula, API contract, permission, provider behavior, model, migration, or financial control changed in DB-6.11. Historical failed attempts (`002` through `012`) and traces are retained.

## Verification

- Production-built Playwright: **1 passed** (`013-browser-output-finance-ess-security-green.log`).
- Focused PostgreSQL/backend output, payslip, provider, RBAC, recovery, and period suite: **21 passed** in 141.63 seconds (`009-backend-payroll-output-security-regression.log`).
- Final PostgreSQL reconciliation: all documented totals matched (`019-final-postgresql-reconciliation.json`).
- TypeScript: passed (`014-typecheck.log`).
- ESLint: passed (`015-eslint.log`).
- Django checks: no issues (`016-django-check.log`).
- Migration drift: no changes (`017-migration-drift.log`).
- Production frontend build: passed; existing CSS `flex-end` compatibility warning only (`018-production-build.log`).
- Disposable stack cleanup: zero matching containers and processes remained (`020-cleanup-verification.log`).

## Exact Commands

```bash
docker run --name hrms-db611-postgres -e POSTGRES_DB=hrms_db611 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=hrms -p 55451:5432 -d postgres:16-alpine
docker run --name hrms-db611-redis -p 6390:6379 -d redis:7-alpine
python backend/manage.py migrate --noinput
python backend/manage.py runserver 127.0.0.1:8021 --noreload
celery -A config worker -l INFO --concurrency 1
celery -A config beat -l INFO
HRMS_API_BASE_URL=http://127.0.0.1:8021/api/v1 pnpm --dir web start --hostname 127.0.0.1 --port 3121
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm --dir web exec playwright test tests/e2e/db6-payroll-processing.spec.ts --project=chromium --workers=1 --trace=retain-on-failure
pytest -q --reuse-db <21 focused payroll-output/payslip/provider/period test node IDs>
pnpm --dir web typecheck
pnpm --dir web lint
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
HRMS_API_BASE_URL=http://127.0.0.1:8021/api/v1 pnpm --dir web build
docker rm -f hrms-db611-postgres hrms-db611-redis
```

Repeated environment variables and local-only secrets are omitted. The complete focused pytest command is preserved in shell evidence and `009-backend-payroll-output-security-regression.log`.

## Scope Decisions And Remaining Gates

The local provider tests use sandbox/fault-injected contracts; no real bank payment, statutory filing, email, or finance-provider transaction was sent. Production provider credentials, external callback routing, protected object storage, TLS, reconciliation operations, and staging accounting integrations remain staging/production gates. Existing DB-6.4 post-expiry leave-cancellation and DB-6.6 transfer/rehire policy blockers remain unchanged.

The isolated PostgreSQL/Redis environment is the cleanup boundary because DB-4 protections intentionally prevent ordinary deletion of protected payroll history. Removing its containers and volume-backed data deletes only synthetic DB-6.11 records and leaves Northstar, staging, production, and customer data untouched.

## Decision

DB-6.11 is **PASS**. The six frozen scenarios have browser, API, PostgreSQL, Celery, security, and recovery evidence. Stop before DB-6.12 for review. Local certification does not establish production readiness.
