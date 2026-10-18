# DB-6.12 Governance, Retention, Legal Hold, Export, and Offboarding Certification

Date: 2026-10-17  
Environment: isolated PostgreSQL 16, Redis 7, Django, production Next.js build, Celery worker and beat  
Decision: **CONDITIONAL PASS**

## Frozen Scope Result

DB-6.12 contains six frozen scenarios: **5 passed, 0 failed, 1 blocked, 0 skipped, 0 not run**.

| Scenario | Result | Executed evidence |
| --- | --- | --- |
| DB6-12-001 explicit approved retention | Passed | Platform browser created an explicit 365-day synthetic policy with legal basis and approval reference; PostgreSQL confirmed it. |
| DB6-12-002 legal-hold enforcement | Passed | Browser placed and independently released a hold; ORM/raw SQL and ordinary deletion bypass attempts were rejected. |
| DB6-12-003 maker/checker | Passed | Tenant Admin made export/erasure requests; a different Platform Admin approved them; self-approval and unauthorized visibility tests passed. |
| DB6-12-004 archive and irreversible erasure | **Blocked** | No approved protected archive/storage/backup procedure exists and irreversible erasure remains deployment-disabled. |
| DB6-12-005 protected-history offboarding | Passed | Browser suspended the tenant; employee, document, leave-ledger, payroll, and audit history remained intact. |
| DB6-12-006 synthetic teardown | Passed | Ownership-verified teardown removed only the disposable tenant and users after the DB-3 protected leave graph fix. |

## Browser, Celery, And Persistence

The production-built browser scenario passed in 18.6 seconds (`006-browser-governance-rerun.log`). Tenant Admin submitted separate export and erasure assessments. Platform Admin configured approved retention, placed a legal hold, and approved both requests. A separate platform checker released the selected hold, retaining placement/release audit evidence. The erasure request was queued through the UI and restored after refresh as `blocked` after one Celery attempt.

PostgreSQL evidence (`012-browser-state-postgresql-reconciliation.json`) confirmed:

- Suspended tenant `21e41fe5-0dad-4f33-8b24-5ef2b7ffb2e1` retained five employees, one employee document, three append-only leave movements, and one payroll run.
- Maker and checker IDs differed on both current requests.
- The current hold was placed and released by different users with immutable events.
- Erasure had `executed=false`; blockers included an active hold, no expired records, and deployment-disabled irreversible erasure.
- Storage inventory and backup disposition remained explicitly external-verification requirements.

No export request was represented as a complete archive. No destructive erasure was performed.

## Confirmed Defect And Fix

The first complete PostgreSQL run found two cleanup failures after DB-3 introduced protected leave ledger relationships. `manage_playwright_workspace` entered the valid ownership-verified teardown context but called `tenant.delete()` before explicitly removing the protected leave graph.

`backend/apps/common/management/commands/manage_playwright_workspace.py` now deletes DB-3 leave records child-to-parent inside the existing transaction-scoped `authorized_synthetic_tenant_teardown` capability. Wrong ownership remains rejected; ordinary tenant deletion, retention triggers, legal holds, financial history protections, and non-synthetic tenants are unaffected.

Historical failure evidence is retained in `007-postgresql-governance-integrity.log` and `008-cleanup-regression-rerun.log`. The focused correction passed 2/2, and the full suite then passed 14/14.

## Verification

- Production-built Playwright: **1 passed** (`006-browser-governance-rerun.log`).
- DB-4/DB-4B PostgreSQL integrity and authorization: **14 passed** in 90.42 seconds (`010-postgresql-governance-integrity-green.log`).
- Focused cleanup correction: **2 passed** (`009-cleanup-regression-green.log`).
- TypeScript and ESLint: passed (`013-typecheck.log`, `014-eslint.log`).
- Django check and migration drift: passed/no changes (`015-django-check.log`, `016-migration-drift.log`).
- Production frontend build: passed with the existing CSS compatibility warning (`017-production-build.log`).
- Owned workspace cleanup: `verified_absent=true`; tenant, governance records, and owned users all zero (`018` through `020`).
- Container/process cleanup: zero DB-6.12 resources remained (`021-container-cleanup.log`).

## Exact Commands

```bash
docker run --name hrms-db612-postgres -e POSTGRES_DB=hrms_db612 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=hrms -p 55452:5432 -d postgres:16-alpine
docker run --name hrms-db612-redis -p 6391:6379 -d redis:7-alpine
python backend/manage.py migrate --noinput
python backend/manage.py manage_playwright_workspace --seed-ref db612-browser --output-file docs/qa/evidence/db6-2026-10-17/db6-12/002-workspace.json
python backend/manage.py runserver 127.0.0.1:8022 --noreload
celery -A config worker -l INFO --concurrency 1
celery -A config beat -l INFO
HRMS_API_BASE_URL=http://127.0.0.1:8022/api/v1 NEXT_DIST_DIR=.next/build pnpm exec next start --hostname 127.0.0.1 --port 3122
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3122 PLAYWRIGHT_SKIP_WEB_SERVER=1 pnpm --dir web exec playwright test tests/e2e/db6-governance-retention-offboarding.spec.ts --project=chromium --workers=1 --trace=retain-on-failure
pytest -q --reuse-db backend/tests/test_db4_tenant_integrity_retention.py backend/tests/test_db4b_retention_governance.py
pnpm --dir web typecheck
pnpm --dir web lint
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
HRMS_API_BASE_URL=http://127.0.0.1:8022/api/v1 pnpm --dir web build
python backend/manage.py manage_playwright_workspace --seed-ref db612-browser --cleanup
docker rm -f hrms-db612-postgres hrms-db612-redis
```

Repeated local environment variables and local-only secrets are omitted. Complete commands and outcomes are retained in the numbered evidence logs.

## Remaining Gates

DB6-12-004 remains blocked pending approved jurisdictional policies, encrypted protected-export artifact storage, access/download controls, backup/legal-hold propagation, restoration and erasure procedures, minimal residual audit-field approval, and staging evidence against actual providers. Enabling the deployment flag alone is not approval and does not execute erasure.

Existing policy blockers from DB-6.4 and DB-6.6 remain unchanged. Northstar, staging, production, and customer data were not accessed or modified.

## Decision

DB-6.12 is a **CONDITIONAL PASS**: five scenarios passed and one remains explicitly policy-blocked. Stop before DB-6.13 for review. Production readiness remains **NO-GO**.
