# DD-2 execution evidence

Date: 2026-10-18  
Environment: isolated PostgreSQL 16 database `hrms_dd2`, production-built Next.js application, local Django API, synthetic tenants only.

## Frozen scope

The existing deep-domain matrix contained exactly eight DD-2 IDs: `DD-DOC-001` through `DD-DOC-008`. No IDs were added or duplicated.

## Browser evidence

- Disposable DB-4B governance and document category browser rerun: **2 passed** in 34.9 seconds.
- Document requirement browser flow: **1 passed**.
- ESS failed-upload/Retry and HR upload/review browser batch: **2 passed, 1 infrastructure failure**. The two document workflows passed. The neighboring phase-3F exact-record audit test was repaired for the compact Inspect -> Review workflow, but its clean rerun never entered the scenario because `page.request.post('/api/auth/login')` stalled. Direct Django health remained HTTP 200 and a later direct Next login returned in 102 ms. Trace, screenshot and video are retained in `web/test-results/e2e-employee-phase3f-closu-08c56-ecord-and-audit-aggregation-chromium/`.
- Historical browser evidence retained for DD-DOC-001/002/003: DB6-08-004, P3-0612 and the frozen phase-3 document suites.

The infrastructure-interrupted phase-3F rerun is not counted as a pass or product failure. DD-DOC-003 remains Verified from its existing executed browser/API evidence and fresh PostgreSQL replacement/concurrency evidence.

## Backend and PostgreSQL evidence

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=55456 POSTGRES_DB=hrms_dd2 POSTGRES_USER=hrms \
POSTGRES_PASSWORD=dd2-test ../.venv/bin/pytest -q --ds=config.settings.base \
  apps/documents/tests.py tests/test_dd2_document_integrity.py \
  tests/test_db4_tenant_integrity_retention.py tests/test_db4b_retention_governance.py
```

Result: **22 passed**. Coverage included legal holds, governed erasure, cross-tenant guards, replacement history, storage cleanup and reminder behavior.

After adding the exact expiry boundary matrix:

```bash
DJANGO_SETTINGS_MODULE=config.settings.base POSTGRES_HOST=127.0.0.1 \
POSTGRES_PORT=55456 POSTGRES_DB=hrms_dd2 POSTGRES_USER=hrms \
POSTGRES_PASSWORD=dd2-test ../.venv/bin/pytest -q --ds=config.settings.base \
  apps/documents/tests.py tests/test_dd2_document_integrity.py
```

Result: **9 passed**. This proved expired `-1`, due today `0`, expiring-soon `30`, valid `31`, one reminder per document/state/day, storage compensation, and one active artifact under concurrent replacement.

## Static and build checks

- `pnpm --dir web typecheck`: passed.
- Targeted ESLint over changed Playwright/helpers: passed.
- `python backend/manage.py check`: passed, zero issues.
- `python backend/manage.py makemigrations --check --dry-run`: no changes detected.
- `pnpm --dir web build`: passed against the production Next.js configuration. Existing CSS compatibility warning for `end` remains unrelated.

## Cleanup

The manually provisioned ESS tenant `pw-qa-dd2-ess-browser` (`e15a7372-7a37-4a1d-9d64-17cb845d169d`) was deleted by `manage_playwright_workspace --cleanup`; output recorded `deleted: true` and `verified_absent: true`. The governance test also used its disposable workspace cleanup hook. Northstar, staging, production and customer data were not modified.

## Security capability inspection

- Downloads are authenticated application-streamed responses scoped by tenant and employee/HR context; employee-document cryptographic signed URLs are not implemented.
- MIME allow-list and 10 MiB configurable size validation are implemented.
- Malware scanning is not integrated for employee documents.
- Application-managed artifact encryption metadata/key enforcement is not implemented for employee documents.
- External protected storage, retention lifecycle and encrypted backup evidence require deployed-environment certification.

These unsupported or deployment-dependent controls keep DD-DOC-006 Partial.
