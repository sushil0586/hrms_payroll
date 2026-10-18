# HRMS/Payroll Database Remediation DB-4B

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**  
Production readiness: **NO-GO**

## Scope and isolation

DB-4B was implemented and tested only against PostgreSQL 16 in the isolated `hrms_db4b` database and disposable `pw-qa-db4b-browser` workspace. No staging, production, Northstar, customer, or shared certification data was read or changed. The synthetic workspace was removed and its absence was verified.

## Implemented controls

1. Effective-dated retention policies support platform or tenant/legal-entity scope, jurisdiction, record category, explicit retention days, lifecycle field, legal basis, and approval reference. No duration is inferred.
2. Record eligibility is calculated from the configured lifecycle date and retention cutoff. Invalid fields, absent policies, unexpired records, or applicable holds fail closed.
3. Legal holds support tenant/category/resource scope, placement evidence, independent release, release reason, and immutable audit events.
4. PostgreSQL delete triggers enforce active holds for employee, document, attendance, leave, payroll, finance, and workflow-audit categories. ORM and raw SQL attempts are rejected; authorized disposable teardown remains explicit and transaction-scoped.
5. Export and erasure requests persist maker, checker, scope, preview, status, idempotency key, attempts, task ID, completion, and failure details.
6. Tenant Admin can inspect applicable controls and request an export or erasure assessment. Platform Admin can configure approved policies, place/release holds, inspect impact, approve, and dispatch requests.
7. Maker/checker separation, tenant permissions, Platform Admin authorization, idempotent request creation/approval/execution, bounded Celery retries, and truthful failed state are enforced.
8. Irreversible erasure is disabled by default through `DATA_ERASURE_EXECUTION_ENABLED=false`.
9. The compact UI uses contextual pending states, duplicate-submit guards, status/error announcements, and retained request history.

## Source changes

- `backend/apps/tenants/models.py`: retention, hold, request, and evidence models.
- `backend/apps/tenants/governance.py`: preview, lifecycle eligibility, maker/checker, hold, event, and execution services.
- `backend/apps/tenants/tasks.py`: bounded idempotent Celery dispatch and durable failure state.
- `backend/apps/tenants/migrations/0003_db4b_retention_governance.py`: additive governance schema and scope/history triggers.
- `backend/apps/tenants/migrations/0004_remove_retentionpolicy_unique_retention_policy_scope_start_and_more.py`: NULL-safe policy-scope uniqueness.
- `backend/apps/tenants/migrations/0005_db4b_legal_hold_delete_enforcement.py`: tenant/category/resource legal-hold delete guards.
- `backend/apps/common/retention_api.py`, `backend/apps/common/api_urls.py`, `backend/apps/tenant_onboarding/api_urls.py`: scoped Tenant/Platform APIs.
- `backend/apps/iam/permission_catalog.py`, `backend/config/settings/base.py`: permissions and disabled-by-default erasure gate.
- `web/src/components/governance/data-governance-workbench.tsx`: shared compact governance UI.
- `web/src/app/tenant-admin/data-governance/page.tsx`, `web/src/app/platform-admin/data-governance/page.tsx`: portal integration.
- `web/src/app/api/tenant-admin/data-governance/`, `web/src/lib/api.ts`, tenant/platform layouts: proxies, clients, and navigation.
- `backend/tests/test_db4b_retention_governance.py`, `web/tests/e2e/db4b-data-governance.spec.ts`: PostgreSQL/API/browser regressions.

## Verification results

| Gate | Result | Evidence |
|---|---:|---|
| DB-4 + DB-4B PostgreSQL regression | 13 passed | `docs/qa/evidence/db4b-2026-10-17/024-db4-db4b-regression.log` |
| Lifecycle cutoff regression | 1 passed | `017-lifecycle-targeted-rerun.log` |
| ORM/raw SQL hold enforcement | 1 passed | `023-legal-hold-bypass-tests.log` |
| Worker failure/retry state | 1 passed | `034-worker-retry-state-rerun.log` |
| Production-built Playwright workflow | 1 passed, 9.2 s | `021-playwright-governance.log` |
| Migration rollback/reapply | passed | `025-migration-rollback.log`, `026-migration-reapply.log` |
| Django check / migration drift | passed / no changes | `027-django-check.log`, `028-migration-drift.log` |
| ESLint / TypeScript | passed / passed | `018-eslint-final.log`, `033-typecheck-clean.log` |
| Production Next build | passed with pre-existing Autoprefixer warning | `020-production-build-final.log` |
| Fixture teardown | removed; no tenant/request/hold residue | `029-fixture-before-cleanup.log` through `031-fixture-cleanup-verification.log` |

Historical failed or contaminated runs remain in the evidence directory and are not counted as passes. In particular, `013-lifecycle-migration.log` used the repository's SQLite local default and failed at PostgreSQL-only SQL; it was replaced by explicit PostgreSQL evidence in `015` onward.

## DBR-010 assessment

**DBR-010 remains partial.** The managed schema now has approved-policy records, record-level expiry evaluation, maker/checker requests, active-hold enforcement, durable audit state, safe synthetic teardown, and UI/API integration. It is not closed because:

1. No production jurisdictional retention durations have been approved or configured.
2. Export execution currently produces a governed manifest and requires a protected download implementation; it does not yet create a complete encrypted archive artifact.
3. Irreversible erasure intentionally remains disabled and no real-record erasure was performed.
4. Storage-provider deletion, backup expiry, legal hold propagation to backups, and restoration-after-erasure behavior need provider-specific policy and staging evidence.
5. Legal, privacy, security, and operations owners must approve retention, minimal residual audit fields, exception handling, and irreversible execution procedures.

The application therefore fails closed: absent policy never makes records eligible, active holds prevent deletion, and enabling the deployment flag alone does not perform erasure.

## Exact commands

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4b POSTGRES_USER=hrms POSTGRES_PASSWORD=db4b-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55436 backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/pytest -q -c backend/pytest.ini --ds=config.settings.base backend/tests/test_db4_tenant_integrity_retention.py backend/tests/test_db4b_retention_governance.py
backend/.venv/bin/python backend/manage.py migrate tenants 0003 --noinput
backend/.venv/bin/python backend/manage.py migrate --noinput
backend/.venv/bin/python backend/manage.py check
backend/.venv/bin/python backend/manage.py makemigrations --check --dry-run
PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:53101 pnpm --dir web exec playwright test tests/e2e/db4b-data-governance.spec.ts --workers=1 --trace=retain-on-failure
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web build
backend/.venv/bin/python backend/manage.py manage_playwright_workspace --seed-ref db4b-browser --cleanup
```

## Decision

DB-4B is a **CONDITIONAL PASS** for the implemented local governance and enforcement controls. DBR-010 remains partial, and database/production readiness remains **NO-GO** pending approved policy configuration, protected export artifacts, controlled-erasure implementation/rehearsal, and external storage/backup verification.
