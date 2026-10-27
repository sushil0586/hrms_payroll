# HRMS STG-136 Batch 4 Employee and Access Certification

Date: 2026-10-27\
Source: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus uncommitted local campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Django and production-built Next.js\
Decision: **PASS locally; shared staging remains Not Run**

## Results

| Scenario | Result | Evidence |
|---|---|---|
| STG-E2E-0402 | Passed | HR Admin browser-created Employee B; authenticated API and PostgreSQL confirmed tenant and organization ownership plus baseline employment assignment. |
| STG-E2E-0405 | Passed | HR Admin browser saved Manager A access; API/database confirmed active manager role. |
| STG-E2E-0406 | Passed | Real login form reached MSS approvals; HR employee API returned 403. |
| STG-E2E-0407 | Passed | ESS browser updated only three permitted fields; HR-controlled payload returned 400; lifecycle audit row matched the actor and changed fields. |
| STG-E2E-0409 | Passed | Foreign department absent from UI and rejected by API; PostgreSQL overlap/cross-tenant regressions passed. |
| STG-E2E-0410 | Passed | Browser-created future movement produced a planned 2030 assignment while the current employee projection and historical range remained unchanged. |

Batch 4 totals are **10 Passed / 0 Failed / 0 incomplete** after combining these six results with previously certified `0401`, `0403`, `0404`, and `0408`.

## Verification

- Production-build Playwright: **6 passed in 32.5 seconds**, one worker.
- Focused PostgreSQL backend/API/history/security: **13 passed**.
- Profile contract subset: **2 passed**.
- TypeScript and focused ESLint: passed.
- Django checks and migration drift: passed; no migration created.
- Production frontend build: passed with the pre-existing CSS autoprefixer warning.
- Direct PostgreSQL reconciliation: current assignment ends `2029-12-31`; planned assignment begins `2030-01-01`; current employee department remains unchanged; manager membership is active; one scoped self-profile audit event exists.

Historical automation failures are retained. The first run lost a navigated response body, a later run assumed the wrong lifecycle-owner value, and database reconciliation caught loose organization-field selectors. None is counted as a product pass.

## Changes

- Added a tenant-scoped ESS profile PATCH contract for `preferred_name`, `personal_email`, and `phone_number` only.
- Added an immutable `EmployeeLifecycleEvent` for committed self-profile changes.
- Added compact ESS edit feedback and a session-authenticated Next.js proxy.
- Added the six-scenario browser suite and two focused backend tests.

The protected payroll repair remained unchanged at SHA-256 `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`. No staging, production, Northstar, live email, or real payroll operation was performed.

Evidence: `docs/qa/evidence/stg136-batch4-2026-10-27/`.
