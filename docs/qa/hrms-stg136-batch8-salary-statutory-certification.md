# HRMS STG-136 Batch 8 Salary and Statutory Certification

Date: 2026-10-27\
Runner revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus reviewed uncommitted campaign changes\
Environment: isolated PostgreSQL 16, Redis 7, Django and production-built Next.js 15.5.28\
Decision: **CONDITIONAL locally**

## Frozen Results

| ID | Local result | Evidence disposition |
|---|---|---|
| STG-E2E-0801 | Passed | HR browser created and updated the component; API/PostgreSQL verified tenant ownership and actor-attributed create/update audit events. |
| STG-E2E-0802 | Passed | HR browser created and updated structure/version/line records; exact decimal values and six actor-attributed audit events reconciled in PostgreSQL. |
| STG-E2E-0803 | Passed | HR browser assigned and updated the intended employee salary record; PostgreSQL verified employee/tenant identity, overlap controls and two actor-attributed audit events. |
| STG-E2E-0804 | Blocked | No approved effective-dated statutory specification or owner-approved statutory oracle exists. No rate or threshold was invented. |
| STG-E2E-0805 | Passed | HR browser created an active INR 720,000 future version and employee assignment effective 2027-01-01. |
| STG-E2E-0806 | Passed | PostgreSQL retained the INR 600,000 assignment through 2026-12-31 and resolved the future assignment separately from 2027-01-01. |
| STG-E2E-0807 | Passed | Browser overlap submission returned HTTP 400 with actionable feedback; PostgreSQL contained exactly the two non-overlapping assignments. |
| STG-E2E-0808 | Passed | Browser/API rejected a tampered salary-version reference; PostgreSQL/API regression rejected a real foreign-tenant version and committed no assignment or success audit. |
| STG-E2E-0809 | Passed | Payroll setup browser validation remained intact; API/PostgreSQL rejected a real foreign-tenant payroll calendar and committed no pay group. |
| STG-E2E-0810 | Passed | Browser exposed blocked source-data and input-snapshot posture. API used the fixture's explicit period, reported the pending leave exactly once, enforced employee denial and created no payroll run. |

Totals: **9 Passed, 0 Failed, 1 Blocked, 0 Incomplete**. Shared staging remains **0 Passed / 136 Not Run**.

## Executed Evidence

- Production-built Playwright: salary setup CRUD and payroll setup CRUD `2 passed` together in 29.0 seconds; payroll readiness/input blockers `1 passed` in 10.7 seconds.
- Batch 7 closure Playwright: `2 passed` in 24.4 seconds for browser-created category/requirement and distinct verified/rejected document paths.
- PostgreSQL/API salary, pay-group, readiness and RBAC subset: `8 passed`; statutory boundary selector: `1 passed`.
- The historical readiness run (`8 passed, 1 failed`) is retained. After replacing the wall-clock default with the fixture's explicit leave interval, the focused PostgreSQL/API selection passed `8/8` in 93.99 seconds.
- PostgreSQL persistence after browser actions produced ten salary audit events: create/update pairs for component, structure, version, line and employee assignment. Every row is tenant-scoped and attributed to `nisha.rao`.
- Forced audit insertion failure rolled back the salary mutation, proving the mutation and audit share one transaction.

## Oracle And Financial Reconciliation

Oracle `STG136-SALARY-ORACLE-1.0` covers deterministic non-statutory decimal arithmetic and effective-date identity only. The browser configured INR 55,000 monthly fixed earning and INR 1,260,000 annual CTC reference values, independently reconciling to INR 660,000 annualized earning and INR 105,000 monthly CTC reference. No gross-to-net payroll, statutory deduction, overtime, LOP or real payroll was executed.

## Findings

1. The P0 salary audit gap is closed locally for the five configuration write paths; no schema migration was required because the existing immutable commercial audit ledger was reused.
2. Payroll readiness is deterministic through explicit period boundaries; production readiness rules were not changed.
3. Future revision, historical as-of resolution, browser overlap rejection, cross-tenant salary references and invalid calendar mapping still require dedicated browser-first evidence.
4. `0804` remains policy-blocked until qualified owners approve versioned statutory sources and expected values.

## Batch 8 Closure Run

- Production-built connected browser test `STG-E2E-0805 through 0809 preserve salary history and reject invalid references`: `1 passed` in 11.8 seconds.
- PostgreSQL/API overlap, cross-tenant/calendar and audit subset: `5 passed` in 184.74 seconds.
- Latest browser fixture: current assignment `2026-01-01` through `2026-12-31`, INR 600,000; future assignment from `2027-01-01`, INR 720,000.
- Historical failed runs caused by an incorrect runtime API URL and unsupported list route remain evidence of runner drift and were not counted.

## Batch 7 Closure

`0701` and `0705` are locally Passed. `0710` remains Blocked for approved SES, private object storage, credentials, provider audit and recovery evidence. Batch 7 is now **9 Passed / 0 Failed / 1 Blocked**.

## Safety

Only isolated synthetic records and local capture/storage were used. No live SES, external object storage, shared staging, production data, real payroll, push or deployment was touched. The protected payroll Playwright repair remained unchanged.
