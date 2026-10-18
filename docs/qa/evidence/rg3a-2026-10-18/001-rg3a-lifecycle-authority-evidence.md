# RG-3A Lifecycle And Authority Evidence

Date: 2026-10-18

## Results

- PostgreSQL 16 focused lifecycle/attendance/organization/onboarding: **12 passed**.
- Production-built Playwright connected attendance history: **1 passed** in 33.4 seconds.
- TypeScript, ESLint, Django checks and migration drift: passed.
- Production frontend build: passed with one pre-existing CSS compatibility warning.
- Production backend Docker image build: passed; temporary validation image removed.
- `tenant_onboarding.0004` and `attendance.0012` rollback/reapply: passed.
- Remaining `pw-qa-rg3a*` tenants after cleanup: **0**.

## Historical Non-Passes

1. Browser run used an incorrect local API root and login failed before business execution.
2. Corrected runtime completed the workflow but exposed missing attendance-close teardown support; the run was not counted.
3. After narrowly remediating the ownership-verified teardown path, the unchanged workflow passed.
4. A neighboring DB-6 test targeted unavailable shared user `nisha.rao`; it was not counted, and its disposable tenant was cleaned.

## Key Evidence

- Closed attendance close ID was captured from the browser-initiated reconciliation response.
- The authenticated detail API reported `closed` before policy edit.
- Browser edited the exact isolated workspace attendance policy.
- Close `snapshot_hash` and `reconciliation_snapshot` were byte-equivalent before and after the policy edit.
- Concurrent nonblank launch idempotency identities produced one committed row and one PostgreSQL rejection.
- Future employment assignment resolved only on its effective date and did not update the current employee projection.
- Cross-tenant assignment insertion was rejected by the DB-5 PostgreSQL trigger.
- Migration preflight performs no duplicate cleanup or historical rewriting.

No Northstar, staging, production or customer data was accessed or modified.
