# HRMS/Payroll Database Remediation DB-4

Date: 2026-10-17  
Decision: **CONDITIONAL PASS**  
Environment: isolated PostgreSQL 16 Docker database and local production frontend build

## Scope and risk disposition

| Finding | DB-4 status | Evidence |
| --- | --- | --- |
| DBR-009 cross-tenant referential integrity | Closed for the inventoried managed schema | 268 generated direct tenant-reference triggers, eight derived/nested ownership triggers, raw SQL and ORM bypass tests, and zero incompatible rows in the copied QA history scan |
| DBR-010 retention and deletion | Partial | 48 historical tables are deletion guarded; parent cascades fail when retained evidence exists; archival remains available; synthetic teardown is ownership-gated. Production legal hold, retention expiry, export approval, and secure erasure remain governance gates. |

DBR-001 and DBR-008 retain the DB-2 disposition. DBR-003 and DBR-004 retain the DB-3/DB-3A disposition, including the unclassified historical leave records. DB-4 did not classify or alter those records.

## Implemented controls

1. Migration `common.0008_db4_tenant_integrity_and_retention_guards` performs a no-write preflight before installing any guard.
2. Every managed foreign key where both source and target persist `tenant_id` receives a PostgreSQL `BEFORE INSERT OR UPDATE` ownership trigger.
3. Derived ownership is enforced for membership roles, tenant-onboarding contacts, scoped configuration overrides, roster rollout items, workflow definitions, workflow instances, assignments, and action logs.
4. Payroll, leave, attendance, employee lifecycle, employee document, workflow, background-job, provider, finance, import, configuration, onboarding, notification-delivery, and SaaS audit evidence receives deletion protection.
5. Existing DB-1 terminal payroll and DB-3 append-only ledger guards remain active. Their delete path recognizes DB-4's transaction-scoped synthetic teardown capability; update immutability is unchanged.
6. `manage_playwright_workspace --cleanup` can remove only a tenant matching all existing ownership markers: `is_sandbox`, `pw-qa-` tenant code, and the exact `@playwright.qa.invalid` owner email.
7. Ordinary employee deletion with attendance/history, payroll-run deletion with processing evidence, leave-balance deletion with provenance, workflow deletion with action history, and direct historical-row deletion are rejected. Status-based archival remains queryable.

## Compatibility and historical scan

A byte-for-byte copy of the 864 MB local QA SQLite database was migrated and scanned. The source database was not written.

- Runtime tenant-owned relationship edges inspected: 272, including unmanaged/proxy metadata.
- Managed direct relationships protected by generated triggers: 268.
- Incompatible relationship groups: 0.
- Incompatible rows: 0.
- Automatic relinking, deletion, normalization, or tenant inference: 0.
- Temporary copied database: removed after the scan.

The migration stops before trigger installation and reports table/column counts if a future environment contains incompatible history.

## PostgreSQL evidence

Final DB-4 tests:

```text
5 passed in 73.73s
```

Covered same-tenant acceptance, employee/payroll, leave, attendance, document, RBAC, workflow, and background-job cross-tenant rejection; `QuerySet.update`; raw SQL; retained parent deletion; archival; exact ownership teardown; and concurrent payroll-run deletion versus job creation.

Integrated database/domain regression:

```text
92 passed, 3 warnings in 146.25s
```

This combines DB-1, DB-2, DB-3, DB-3A, DB-4, attendance, documents, and payroll tests. A prior split run also recorded `42 passed` for DB-1 through DB-4 and `50 passed` for attendance/documents/payroll.

Migration evidence:

- clean forward migration: passed
- rollback to `common.0007`: passed
- reapply `common.0008`: passed
- second rollback/reapply cycle: passed
- final installed DB-4 controls: 268 direct, 8 derived/nested, 48 retention
- Django migration drift: none
- Django system check: no issues

## Browser and build evidence

- TypeScript `tsc --noEmit`: passed.
- Next.js production build: passed; existing Autoprefixer `end` compatibility warning remains.
- Targeted Playwright: 1 passed, 2 failed, 1 skipped.

The browser failures are retained as blockers, not converted to passes:

- Employee lifecycle create returned an accepted payload without the test's expected `id` while the page transitioned to the HR Admin loading state.
- Platform Admin demo-mode fixture did not expose the expected `Create platform tenant` dialog.
- Employee-document live workflow self-skipped because its live prerequisite was unavailable.

These failures occur above the DB-4 write path and were not changed in this phase. PostgreSQL tenant isolation is independently covered by the DB-4 tests. A live-stack browser rerun with authorized platform and document fixtures remains required.

## Exact commands

```bash
docker run -d --name hrms-db4-postgres -e POSTGRES_DB=hrms_db4 -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=db4-test -p 55434:5432 postgres:16
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4 POSTGRES_USER=hrms POSTGRES_PASSWORD=db4-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/python manage.py migrate --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4 POSTGRES_USER=hrms POSTGRES_PASSWORD=db4-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/pytest -q tests/test_db4_tenant_integrity_retention.py --create-db
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4 POSTGRES_USER=hrms POSTGRES_PASSWORD=db4-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/pytest -q tests/test_db1_write_integrity.py tests/test_db2_fiscal_integrity.py tests/test_db3_leave_year_integrity.py tests/test_db3a_leave_year_operations.py tests/test_db4_tenant_integrity_retention.py apps/documents/tests.py apps/attendance/tests.py apps/payroll/tests.py --reuse-db
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4 POSTGRES_USER=hrms POSTGRES_PASSWORD=db4-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/python manage.py migrate common 0007 --noinput
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_DB=hrms_db4 POSTGRES_USER=hrms POSTGRES_PASSWORD=db4-test POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55434 ./.venv/bin/python manage.py migrate common 0008 --noinput
./.venv/bin/python manage.py check
./.venv/bin/python manage.py makemigrations --check --dry-run
pnpm --dir web typecheck
pnpm --dir web build
pnpm --dir web exec playwright test tests/e2e/platform-admin-tenant-isolation-certification.spec.ts tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts tests/e2e/employee-lifecycle-certification-flows.spec.ts --workers=1
```

## Retention and tenant deletion design

Normal tenant lifecycle uses suspension/archive and preserves historical identifiers. Physical production deletion is not a routine ORM operation. It requires a separate approved workflow with legal-hold evaluation, retention-period calculation, complete export evidence, artifact/object-store inventory, finance and payroll sign-off, audited authorization, backup treatment, provider revocation, secure erasure, and post-delete verification.

The implemented destructive path is deliberately limited to deterministic synthetic QA tenants. It is not a production tenant-erasure implementation.

## Remaining gates

1. Approve and implement production legal-hold, retention-expiry, export, and secure-erasure governance before closing DBR-010.
2. Re-run the three fixture-limited browser workflows against an authorized live application stack.
3. Preserve DB-3/DB-3A historical leave classification gates; DB-4 made no inference about the 1,186 balances or 240 transactions.
4. Run an independent staging restore/upgrade rehearsal before production migration.

Database production readiness remains **NO-GO**. DB-4 is conditionally passed for the implemented schema controls; it is not a production-readiness declaration.

## DB-4A end-to-end integration closure

Date: 2026-10-17  
Decision: **PASS for DB-4A scope**; the wider DB-4 decision remains conditional on DBR-010 governance.

DB-4A used an isolated PostgreSQL 16 database (`hrms_db4a`), an authorized disposable Enterprise workspace (`pw-qa-db4a`), and the current production-built Next.js application. No shared, Northstar, staging, production, or customer data was accessed.

### Failure resolution

| Scenario | Before | Root cause | Resolution | After |
| --- | --- | --- | --- | --- |
| Employee create/lifecycle | Create returned 201 and persisted, but Playwright intermittently could not read the response ID during the immediate hard redirect | Automation response-body observation race; a later query-modal transition also returned valid RSC data without committing the URL | Recover the successful create ID from the canonical redirect only when the 201 body is unavailable; use full-document navigation for the employee edit/access query-modal controls | Passed complete create, duplicate rejection, edit, persisted detail, access provisioning flow |
| Platform tenant creation | Demo-mode run could not open the create dialog; live rerun created the tenant but lost the success message during redirect | Original run lacked a live authorized Platform Admin fixture; local component state was discarded by the onboarding redirect | Carry a server-rendered `tenant-created` feedback token to onboarding and initialize the confirmed success message there | Passed two-tenant create/onboarding/context-switch/isolation flow |
| Employee document workflow | Skipped because `HRMS_API_BASE_URL` was absent; first live HTTP run returned 401 | Explicit live-test prerequisite plus production secure-cookie default on plain localhost HTTP | Run the isolated production build with `HRMS_COOKIE_SECURE=false`; deployed HTTPS defaults are unchanged | Passed create employee/category, upload, inspect, review, and persistence flow |

The remaining skipped test is `employee create warns when selected legal entity has no branch or cost center mapping`. Exact reason: `Seed data has no legal entity without branch or cost-center mappings.` This is a justified negative-fixture exclusion in the isolated workspace, not an application failure and not the previously blocked document workflow.

### Verification evidence

- Final focused Playwright: **3 passed, 1 skipped** in 2.1 minutes.
- DB-4 PostgreSQL constraint/retention suite: **5 passed** in 76.26 seconds.
- Focused tenant/employee/document API authorization regression: **4 passed**.
- Django system check: no issues.
- Migration drift: no changes detected.
- Production Next.js build and its TypeScript validation: passed; the existing Autoprefixer `end` warning remains.
- Employee and tenant create responses were HTTP 201 and their generated IDs were used through subsequent edit/access/onboarding operations, proving database persistence.
- Cross-tenant ORM, `QuerySet.update`, and raw SQL writes remain rejected by the DB-4 suite. Same-tenant writes and authorized global references remain accepted.
- Unsupported employee deletion remains outside the API contract; retained parent and historical-row deletion attempts remain database-rejected rather than cascading. API permission failures in the focused regressions returned controlled 4xx responses, with no unhandled 500.

Evidence directory: `docs/qa/evidence/db4a-2026-10-17/`

Key commands:

```bash
python manage.py manage_playwright_workspace --seed-ref db4a --output /tmp/db4a-workspace.json
HRMS_API_BASE_URL=http://127.0.0.1:58000/api/v1 HRMS_COOKIE_SECURE=false NEXT_DIST_DIR=.next/build pnpm exec next start --hostname 127.0.0.1 --port 53100
PLAYWRIGHT_BASE_URL=http://127.0.0.1:53100 PLAYWRIGHT_SKIP_WEB_SERVER=1 HRMS_API_BASE_URL=http://127.0.0.1:58000/api/v1 pnpm exec playwright test tests/e2e/employee-lifecycle-certification-flows.spec.ts tests/e2e/hr-admin-employee-documents-live-workflow.spec.ts tests/e2e/platform-admin-tenant-isolation-certification.spec.ts --workers=1 --trace=retain-on-failure
python -m pytest -q tests/test_db4_tenant_integrity_retention.py
python -m pytest -q tests/test_tenant_onboarding_api.py::test_platform_staff_can_create_tenant_and_seed_onboarding tests/test_tenant_onboarding_api.py::test_non_platform_admin_user_cannot_access_platform_tenant_endpoints tests/test_phase0_api_smoke.py::test_custom_hr_employee_viewer_role_gates_employee_mutations tests/test_phase0_api_smoke.py::test_custom_hr_document_viewer_role_gates_document_mutations
python manage.py check
python manage.py makemigrations --check --dry-run
NEXT_DIST_DIR=.next/build pnpm build
```

DB-4A has no remaining end-to-end blocker. Database production readiness remains **NO-GO** until DBR-010 legal-hold, retention-expiry, export approval, and secure-erasure governance is approved and independently rehearsed.

## DB-4B governance implementation

DB-4B is recorded in `hrms-database-remediation-db4b-2026-10-17.md`. Retention-policy records, lifecycle expiry previews, legal holds, maker/checker requests, PostgreSQL legal-hold delete enforcement, Celery retry state, Tenant/Platform APIs, and compact administration UI are implemented and locally verified. DBR-010 remains **partial** because approved production durations, complete protected export artifacts, irreversible erasure rehearsal, and external storage/backup policy evidence remain open. Production readiness remains **NO-GO**.
