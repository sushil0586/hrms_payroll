# HRMS STG-136 Batch 5 Leave Lifecycle Certification

Date: 2026-10-27\
Source: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus uncommitted local campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Django and production-built Next.js\
Decision: **PASS locally; shared staging remains Not Run**

## Frozen Results

| ID | Result | Executed evidence |
|---|---|---|
| STG-E2E-0501 | Passed | HR Admin browser created a paid leave type and active effective-dated leave policy; authenticated API returned the exact tenant-owned records. |
| STG-E2E-0502 | Passed | Browser applied the explicit India earned-leave fixture template; persisted entitlement was 20.00, carry-forward cap 10.00 and mode `limited`. PostgreSQL expiry/carry-forward tests passed. |
| STG-E2E-0503 | Passed | Run-owned workspace created one employee policy assignment, governed period, balance and immutable 12.00 opening movement. |
| STG-E2E-0504 | Passed | ESS browser submitted valid half-day and full-day requests; API and database returned one pending request per action. |
| STG-E2E-0505 | Passed | Browser double-click emitted one request; durable idempotency replay and concurrent same-key tests created one mutation. |
| STG-E2E-0506 | Passed | Authorized manager approved from the MSS review dialog; ESS observed approved state and decision note. |
| STG-E2E-0507 | Passed | MSS rejected a separate browser-created request; rejection preserved entitlement. |
| STG-E2E-0508 | Passed | ESS cancelled eligible approved leave; cancellation reversal restored the entitlement and retained source linkage. |
| STG-E2E-0509 | Passed | PostgreSQL/API overlap regression rejected the second request without a ledger mutation. |
| STG-E2E-0510 | Passed | Insufficient balance and employee/foreign-manager decisions returned safe denials; no consumption occurred. |
| STG-E2E-0511 | Passed | Cross-tenant IDs were denied; post-expiry cancellation remained blocked and the expired lot was not recreated. |
| STG-E2E-0512 | Passed | Append-only movements, lot allocations, checksums and projected closing balances reconciled under duplicate and concurrent commands. |

Totals: **12 Passed / 0 Failed / 0 Blocked / 0 Not Run locally**.

## Balance Reconciliation

The deterministic employee began with an independently configured 12.00-unit opening balance. A 0.50-unit pending request reserved 0.50 exactly once and withdrawal released it. A separate 1.00-unit approval moved reservation to consumption; direct approved cancellation created a compensating reversal and restored the available amount. Rejection created no consumption. The carry-forward worked example independently reconciled 18.00 unused units to 10.00 carried and 8.00 forfeited; expiry and earliest-expiry consumption retained immutable source/reversal links.

No negative balance, duplicate ledger row, double consumption, mutable historical transaction, cross-tenant reference, or policy-period checksum mismatch was observed.

## Verification

- Connected production-build Playwright: **3 passed in 27.2 seconds**, one worker.
- ESS lifecycle Playwright: **9 passed in 1.0 minute**, one worker.
- PostgreSQL/API/ledger/concurrency regression: **48 passed**, 355 deselected.
- Production frontend build: passed; existing CSS autoprefixer warning retained.
- TypeScript and focused ESLint: passed.
- Django checks and migration drift: passed; no migration created.
- Protected payroll repair hash: `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.

The first ESS run used a direct backend build where the deliberate fault proxy was required. A rerun then exposed an unauthenticated test-harness attachment fetch. The first connected run retained the fault-proxy build after that suite exited, and later runs exposed navigated-response-body assumptions. These were environment or automation defects; all are retained in evidence and excluded from pass counts.

## Changes

- Added `stg136-batch5-leave-lifecycle.spec.ts` for browser-created policy configuration and connected ESS/MSS approval/rejection.
- Corrected the ESS attachment assertion to download through the authenticated browser session.
- No leave business rule, API contract, model, migration, payroll behavior, or policy default changed.

Evidence: `docs/qa/evidence/stg136-batch5-2026-10-27/`.

Task-owned tenants were removed by governed exact-ID cleanup. Task-owned Django, Next.js, PostgreSQL and Redis resources were stopped and removed after verification. Shared staging remains **0 Passed / 136 Not Run**. Production readiness remains **NO-GO**.
