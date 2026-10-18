# RG-4A Operational Reliability Certification

Date: 2026-10-18  
Environment: production-built Next.js, Django, isolated PostgreSQL 16, disposable Enterprise tenants  
Decision: **CONDITIONAL**

## Frozen Gate Reconciliation

| Gate | Result | Executed disposition |
|---|---|---|
| DDG-F-009 | Partial | Existing bounded attendance CSV replay/partial-row evidence remains valid. Durable biometric source identity and checkpoints are absent; biometric/background ingestion stays disabled. |
| DDG-F-020 | Partial | Transactional organization import remains verified. Import-audit reads/writes now enforce existing operation-specific permissions and tenant ownership. Other row-by-row workbenches still need approved atomic-versus-partial and lost-response semantics. |
| DDG-F-021 | Partial | Workforce CSV and manifest filters, ordering, source row count, checksum, audit rows and employee denial reconciled in the browser. Phase 5F's 2,500-employee result is retained. Every report family at approved staging volume is not yet certified. |
| DDG-F-022 | Verified locally | Shared downloads now abort on URL supersession/unmount and invalidate stale completions. A 2,000 ms old request followed by a 750 ms filtered request produced exactly one latest artifact. Failure, Retry, duplicate guard and accessible pending feedback passed. |
| DDG-F-023 | Blocked | Durable payroll jobs demonstrate the reusable Celery pattern, but no approved durable-import scope, import checkpoint model or browser recovery contract exists. Background imports remain disabled. |
| DDG-F-031 | Blocked | Requires staging multi-year cardinality, `EXPLAIN ANALYZE`, `pg_stat_statements`, lock and resource evidence. Local 2,500-employee measurements do not close it. |
| STG-008 | Blocked | Local 25 VUs remains certified. The retained 50-VU p95 samples of 1,420/1,685/1,923 ms are not consistently below 1,500 ms. Two isolated staging runs remain required. |

Totals: **1 Verified, 3 Partial, 3 Blocked, 0 Not Started**.

## Defects Remediated

1. **Stale async export completion.** `AsyncDownloadButton` did not cancel an in-flight download when report filters changed its URL. The old response could download after a newer selection. URL changes now abort the active request, increment an operation sequence, hide superseded state immediately, and prevent stale chunks, errors or completion from changing the UI.
2. **Export-audit HTTP 500.** `PayrollReportExportAudit._audit_digest()` referenced nonexistent `attendance_close_id`. Creating CSV or manifest audit evidence crashed. The unrelated field was removed from the digest; exact failing tests now pass.
3. **Import-audit authorization gap.** Import history required only an active employee context. Ordinary ESS users could read or forge audit rows directly. Reads now require one governed import/manage permission; writes require the existing permission mapped to the declared import type; unknown types fail with HTTP 400.
4. **Test authentication drift.** Playwright's separate `page.request` context did not carry the application's authenticated browser session. Certification uses same-origin browser `fetch` and therefore tests the real cookie/session boundary without token injection.

No payroll formula, import business rule, tenant scope, financial control or background-job contract changed. No migration was added.

## Executed Evidence

- PostgreSQL report/import/RBAC tests: **6 passed** after remediation. The initial run retained **2 report-audit failures** that reproduced the `attendance_close_id` crash; rerun passed.
- Neighboring PostgreSQL organization-import and payroll-job durability set: **9 passed** within the initial focused run; combined initial result was **13 passed, 2 failed**, followed by the exact **6 passed** rerun.
- Production-built Playwright RG-4A: stale-download race **1 passed**; workforce CSV/manifest/audit/denial **1 passed** after correcting the request-context mismatch.
- Neighboring delayed download suites: **2 passed**. Pending acknowledgement measured **91 ms** and **184 ms**; 2,000 ms failure and 750 ms Retry paths completed with two attempts and no duplicate download.
- Production frontend build: passed (existing CSS `end`/`flex-end` warning only).
- Backend production Docker image: built as `hrms-backend:rg4a`.
- Focused ESLint and TypeScript: passed.
- Django check: passed; migration drift: none.
- Fresh PostgreSQL migrations: passed serially. A discarded first database was contaminated by two accidentally overlapping migration commands and is not counted as product evidence.

Key commands:

```bash
docker run -d --name hrms-rg4a-postgres -e POSTGRES_DB=hrms_rg4a \
  -e POSTGRES_USER=hrms -e POSTGRES_PASSWORD=... -p 55461:5432 postgres:16

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55461 \
POSTGRES_DB=hrms_rg4a POSTGRES_USER=hrms POSTGRES_PASSWORD=... \
  .venv/bin/python backend/manage.py migrate --noinput

DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=55461 \
POSTGRES_DB=hrms_rg4a POSTGRES_USER=hrms POSTGRES_PASSWORD=... \
  .venv/bin/python -m pytest \
  backend/tests/test_phase0_api_smoke.py::test_hr_admin_can_persist_and_filter_report_export_audits \
  backend/tests/test_phase0_api_smoke.py::test_report_exports_require_category_export_permissions \
  backend/tests/test_phase0_api_smoke.py::test_report_export_audit_writes_require_report_category_export_permission \
  backend/tests/test_phase0_api_smoke.py::test_employee_cannot_access_report_export_audits \
  backend/tests/test_phase0_api_smoke.py::test_import_batch_audits_enforce_governed_permission_and_tenant_ownership \
  backend/tests/test_phase0_api_smoke.py::test_import_batch_audit_rejects_ungoverned_import_type -q

PLAYWRIGHT_SKIP_WEB_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 \
PLAYWRIGHT_BACKEND_URL=http://127.0.0.1:8021/api/v1 \
  pnpm --dir web exec playwright test tests/e2e/rg4a-operational-reliability.spec.ts \
  --workers=1 --reporter=line

pnpm --dir web exec playwright test \
  tests/e2e/long-running-loading-feedback.spec.ts tests/e2e/loading-state-gap-closure.spec.ts \
  --grep 'report export|migrated report export' --workers=1 --reporter=line

pnpm --dir web build
pnpm --dir web exec tsc --noEmit
pnpm --dir web exec eslint src/components/patterns/async-download-button.tsx \
  tests/e2e/rg4a-operational-reliability.spec.ts
.venv/bin/python backend/manage.py check
.venv/bin/python backend/manage.py makemigrations --check --dry-run
docker build -f backend/Dockerfile -t hrms-backend:rg4a .
```

## Remaining Gates

- Approve per-module import atomic/partial/replay behavior before broadening certified imports.
- Approve a durable background-import scope before adding Celery jobs and checkpoints. Until then, only bounded synchronous certified imports are enabled.
- Certify every enabled report family at its approved volume and protected-storage configuration in staging.
- Run projected multi-year query-plan/lock testing and two comparable 25/50-VU staging benchmarks. Keep the initial user cap at or below the verified local 25-VU equivalent.

## Modified Files

- `backend/apps/common/api_views.py`
- `backend/apps/payroll/models.py`
- `backend/tests/test_phase0_api_smoke.py`
- `web/src/components/patterns/async-download-button.tsx`
- `web/tests/e2e/rg4a-operational-reliability.spec.ts`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- `docs/qa/hrms-rg4a-operational-reliability-certification.md`

RG-4A is **CONDITIONAL**. Local async-download and export-audit defects are closed, but durable imports, complete report-volume coverage, multi-year database scale and stable 50-VU staging capacity remain unresolved. Real-payroll production readiness remains **NO-GO**.
