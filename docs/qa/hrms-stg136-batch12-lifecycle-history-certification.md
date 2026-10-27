# HRMS STG-136 Batch 12 Lifecycle And History Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Django and production-built Next.js 15.5.28\
Decision: **CONDITIONAL locally**

## Frozen Results

| ID | Result | Executed evidence |
|---|---|---|
| STG-E2E-1201 | Passed | Browser completed an effective-dated same-entity movement after explicit baseline classification; PostgreSQL retained assignment history. |
| STG-E2E-1202 | Passed | Browser moved the employee to a new department and the current projection resolved to the resulting assignment. |
| STG-E2E-1203 | Passed | Browser created a future manager/department movement; current employee projection remained unchanged. |
| STG-E2E-1204 | Passed | Browser and API verified scoped MSS access and PostgreSQL authority/revocation race regressions passed. |
| STG-E2E-1205 | Passed | Organization archive and active-assignment protections passed in PostgreSQL; destructive employee deletion returned 405. |
| STG-E2E-1206 | Passed | Browser deactivated a synthetic employee while preserving employee and movement history. |
| STG-E2E-1207 | Passed | Cross-tenant assignment was absent from UI and rejected by API; cross-entity transfer and rehire remain fail-closed. |
| STG-E2E-1208 | Blocked | Pending-request reassignment remains safely unavailable because ownership, notification and segregation-of-duties policy is unapproved. |

Totals: **7 Passed, 0 Failed, 1 Blocked, 0 Incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Evidence

- Production-built lifecycle Playwright: **1/1 passed** in 22.9 seconds after selector and fixture repair.
- Neighboring production-built authority/history Playwright: **6/6 passed** in 25.1 seconds.
- PostgreSQL lifecycle, authority, policy-closure and organization-history regressions: **23/23 passed**.
- Explicit employment baselines used approved synthetic source references; the application correctly rejected unclassified history before fixture correction.
- Cross-tenant department references returned 400 and were absent from browser options.
- Historical payroll fixtures and protected employee records were not rewritten or deleted.

## Root Causes And Changes

The legacy test matched `Employee` while the current accessible label is `Employee (required)`, referred to the retired `To manager` label instead of `Destination manager / owner`, and did not wait for post-save navigation. The production UI uses ordinary server-rendered selects with live API options; it is not virtualized or debounced. The disposable employee also required explicit DB-5 employment timeline classification, which was provisioned as an authorized test prerequisite rather than inferred by application code.

No lifecycle business rule changed. `1208` remains blocked and no reassignment, transfer-continuity, rehire, FnF or historical correction policy was invented.

## Cleanup

The main and foreign workspaces are Playwright-owned disposable tenants. Exact-ID teardown was executed after reconciliation, followed by task-owned process and PostgreSQL container removal. No shared staging, production, Northstar, email, payroll provider, commit or deployment was touched.

## Next Eligible Batch

Batch 13 (`STG-E2E-1301`-`1310`) is next, subject to its frozen recovery/security entry dependencies and any maintenance-window requirements.
