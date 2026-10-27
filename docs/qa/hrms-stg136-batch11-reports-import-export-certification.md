# HRMS STG-136 Batch 11 Reports, Imports and Exports Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Django, Celery worker/beat and production-built Next.js 15.5.28\
Decision: **CONDITIONAL locally**

## Frozen Results

| ID | Local result | Evidence disposition |
|---|---|---|
| STG-E2E-1101 | Passed | Workforce filters, sorting, pagination, totals, drilldown, CSV and manifest completed through the browser. |
| STG-E2E-1102 | Passed | Leave-balance report filters, period scope, quantities, CSV, manifest and audit evidence completed. |
| STG-E2E-1103 | Passed | Attendance report filters, lock/readiness scope, drilldown, CSV, manifest and audit evidence completed. |
| STG-E2E-1104 | Passed | Published payroll-register gross, deductions and net totals reconciled; employee access was denied. |
| STG-E2E-1105 | Passed | Lifecycle aging/as-of report filters, SLA evidence and tenant-scoped export completed. |
| STG-E2E-1106 | Passed | CSV row-count and SHA-256 response evidence, manifests and persistent export audits passed. |
| STG-E2E-1107 | Passed | ESS report pages were unavailable and authenticated export attempts returned 401/403; focused API permission tests passed. |
| STG-E2E-1108 | Passed | Production browser persisted a tenant-scoped SHA-256 source identity, actor, row outcomes and canonical result linkage. |
| STG-E2E-1109 | Passed | Identical browser replay returned the original transaction; PostgreSQL concurrent duplicate requests created one ledger mutation. |
| STG-E2E-1110 | Blocked | Durable import identity, atomic/recoverable crash semantics and owner-approved retry behavior are not approved or implemented. |

Totals after remediation: **9 Passed, 0 Failed, 1 Blocked, 0 Incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Test Recovery

The legacy authorized report calls used `page.request`, whose isolated API context did not carry the browser session cookie, producing false HTTP 401 results. They now use the existing same-origin browser-session request helper. Unauthorized navigation assertions expected the retired `My workspace` heading; they now prove that the protected report is absent, the HR route is not retained and authenticated report APIs deny access.

Additional stale assertions were aligned to current accessible UI contracts: attendance edit dialog, leave report labels/pagination, payroll detail query parameters/reconciliation copy, leave import disclosure/status badges and commit summary. No authentication, permission or business rule was weakened.

## Evidence

- Production-built Playwright: **11/11 passed** in 35.5 seconds with one worker.
- Focused PostgreSQL-backed API/RBAC/audit tests: **6/6 passed**.
- Tenant source rows: 6 employees, 1 leave balance, 27 attendance records, 5 payroll artifacts and 30 report-export audit rows.
- Browser import runs created exactly 3 synthetic leave adjustment transactions across the controlled retries; blocked rows created no transaction.
- Payroll register and downloaded artifact carried SHA-256 evidence and reconciled to the published INR 50,000.00 payroll created in the same disposable tenant.
- TypeScript, focused ESLint, Django checks, migration drift and production frontend build passed. The existing CSS `flex-end` compatibility warning remains non-blocking.

## Integrity And Security

Report exports remained tenant scoped and required category-specific permissions. CSV and manifest responses exposed governed evidence headers; persistent audits retained actor, tenant, filters, row count and checksum. ESS could not access workforce, leave, attendance, lifecycle or payroll report APIs.

The leave import still separates ready and blocked rows and reports partial outcomes truthfully. Each ready row now carries a stable source/employee/row idempotency key through the Next.js proxy to the existing actor- and tenant-scoped mutation ledger. A conditional PostgreSQL uniqueness constraint permits one governed leave-import source audit per tenant. Completed replay returns the canonical prior row result and source audit without duplicate leave-ledger effects. Interrupted multi-row execution remains outside this contract; no crash-recovery policy was invented and `1110` remains blocked.

## Cleanup

All data was synthetic and owned by tenant `pw-qa-stg136-b11`. Exact-ID governed teardown removed the tenant; task-owned Django, Next.js, Celery, PostgreSQL and Redis resources were stopped and removed. No shared staging, production, external communication, commit, push or deployment occurred.

## Next Eligible Batch

Batch 12 (`STG-E2E-1201`-`1208`) was reconciled and its existing browser suite was started after Batch 11. It stopped before a lifecycle mutation because the legacy employee-wizard automation assumes eagerly populated organization selects; the current browser returned no selectable value at that step. This is fixture/automation drift, not evidence for a Batch 12 business result. All eight Batch 12 IDs remain incomplete and no subsequent batch was started.
