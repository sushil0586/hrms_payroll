# HRMS Leave Confidence Baseline

Date: 2026-11-06
Status: **AUTHORITATIVE SCOPE VERIFIED; LVC-R1B RECONCILED**

## Purpose

This report establishes the real denominator for Leave confidence. It does not replace the existing Leave certificates or discard their evidence. It prevents broad test counts from being misreported as complete scenario certification.

## Authoritative Scope

Source: `docs/qa/hrms-leave-complete-e2e-scenario-catalog.md`

Mechanical validation result:

- Scenario rows: **209**
- Unique scenario IDs: **209**
- Duplicate IDs: **0**
- First ID: `LV-E2E-0001`
- Last ID: `LV-E2E-0825`
- Executable under the approved conservative baseline: **209**
- Approved Not Applicable: **0**

The catalogue and `hrms-leave-lvc0-contract-freeze.md` are the authoritative Leave denominator. The 12 STG-136 Batch 5 scenarios are a high-value workflow subset, not the entire module.

## Phase Distribution

| Phase | Scope | IDs | Total | Strict Passed | Strict Not Run |
| --- | --- | --- | ---: | ---: | ---: |
| 0 | Leave type administration | `LV-E2E-0001`-`0020` | 20 | 5 | 3 |
| 1 | Policy definition | `LV-E2E-0101`-`0129` | 29 | 8 | 13 |
| 2 | Assignment and opening balance | `LV-E2E-0201`-`0220` | 20 | 0 | 20 |
| 3 | ESS request creation and evidence | `LV-E2E-0301`-`0333` | 33 | 0 | 33 |
| 4 | MSS approval and delegation | `LV-E2E-0401`-`0427` | 27 | 0 | 27 |
| 5 | ESS withdrawal and cancellation | `LV-E2E-0501`-`0517` | 17 | 0 | 17 |
| 6 | HR operations and reconciliation | `LV-E2E-0601`-`0620` | 20 | 0 | 20 |
| 7 | Leave year, ledger, reports, payroll boundary | `LV-E2E-0701`-`0718` | 18 | 0 | 18 |
| 8 | Security, accessibility, resilience, UX | `LV-E2E-0801`-`0825` | 25 | 0 | 25 |
| **Total** | | | **209** | **13** | **176** |

LVC-R1B has now reconciled the first 49 contracts. Twenty of those are Partial and therefore are excluded from both `Strict Passed` and `Strict Not Run`; the two stale-edit promotions and remaining gaps are recorded in `hrms-leave-lvc-r1b-certification.md`.

## Existing Candidate Evidence

| Evidence family | Recorded result | Potential catalogue coverage | Current credit |
| --- | --- | --- | --- |
| Full local Leave backend campaign | 107 passed, 0 failed | Services, ledger, year-end, history, auto approval, reports, security | Candidate evidence; no automatic per-ID credit |
| Full local focused browser campaign | 175 passed, 0 failed | HR Admin, ESS, MSS, setup, balances, requests, responsive behavior | Candidate evidence; no automatic per-ID credit |
| STG-136 Batch 5 | 12/12 Passed locally | Core setup, assignment, request, decision, cancellation, ledger | Supporting subset only |
| DD-3 Leave domain | 5 Verified, 2 Partial, 1 Blocked | Deep ledger, proration, expiry, encashment | Supporting domain evidence |
| DB-6.4 policy/year-end | 5 Passed, 1 Blocked | Year close, carry-forward, expiry, worker recovery | Supporting deep evidence |
| CRUD and UI certificates | Multiple Passed/Partial packages | Validation, feedback, responsive, attachment, filters | Must be mapped to stable Leave IDs |
| Shared staging | 0 of 136 staging scenarios executed | Deployed environment | No staging credit |

Raw test totals cannot be added to or divided by 209. Tests overlap scenarios, and some scenarios require multiple browser, API, PostgreSQL, audit, accessibility, and notification assertions.

## Per-ID Promotion Rule

An `LV-E2E` ID may move from Not Run to Passed only when its evidence row contains:

1. Current candidate SHA or reviewed content-identical build.
2. Browser engine, route, persona, action, viewport, exact feedback, and final UI state.
3. Authenticated API method, endpoint, status, and redacted contract.
4. PostgreSQL before/after state and immutable ledger/workflow evidence where applicable.
5. Audit attribution, correlation, tenant/RBAC result, and rejected-operation non-mutation.
6. Notification result where the scenario requires it.
7. Accessibility/responsive evidence where applicable.
8. Exact-ID cleanup and residual-resource result.

Partial suite evidence keeps the scenario Not Run until the complete contract is assembled, unless execution demonstrates a product failure or policy blocker.

## Reconciliation Packages

### LVC-R1 - Leave types and policies

Map and rerun as needed: `LV-E2E-0001`-`0020` and `0101`-`0129`.

Primary sources:

- `leave-setup-admin/setup.spec.ts`
- `hr-admin-time-leave-policy-ui-audit.spec.ts`
- `test_hr_admin_leave_type_validation.py`
- `test_hr_admin_leave_workspace.py`

### LVC-R2 - Assignment and balances

Map and rerun as needed: `LV-E2E-0201`-`0220`.

Primary sources:

- `leave-balances-admin/balances.spec.ts`
- `leave-balance-import-flows.spec.ts`
- `crud2b-employee-leave-closure.spec.ts`
- Leave assignment, conflict, resolution, and maker-checker backend tests.

### LVC-R3 - ESS request and attachment lifecycle

Map and rerun as needed: `LV-E2E-0301`-`0333` and `0501`-`0517`.

Primary sources:

- `ess3-leave-certification.spec.ts`
- `ess-mss-lifecycle-contract.spec.ts`
- `crud-v2-wave17-leave-evidence.spec.ts`
- `test_ess3_leave_contract.py`

### LVC-R4 - MSS and HR decisions

Map and rerun as needed: `LV-E2E-0401`-`0427` and `0601`-`0620`.

Primary sources:

- `mss-makeover/phase3-approval-workspace.spec.ts`
- `hr-admin-leave-request-operations-certification.spec.ts`
- `dd7-approval-delegation-certification.spec.ts`
- Workflow, history, authorization, and notification backend tests.

### LVC-R5 - Year-end and downstream integrity

Map and rerun as needed: `LV-E2E-0701`-`0718`.

Primary sources:

- `db3a-leave-year-operations.spec.ts`
- `test_db3_leave_year_integrity.py`
- `test_db3a_leave_year_operations.py`
- Leave reports, attendance derivation, and payroll-input lock tests.

### LVC-R6 - Nonfunctional and connected journeys

Map and rerun as needed: `LV-E2E-0801`-`0825`, then execute all ten golden journeys.

Primary sources:

- Current three-engine Leave suites
- Security and tenant-isolation tests
- Responsive, keyboard, focus, AXE, failure, retry, worker interruption, and cleanup evidence

## Confidence Status

- **Measured local completion:** `13/209 Passed`, `20/209 Partial`, and `176/209 Not Run` after LVC-R1B.
- **Supporting local evidence:** substantial, including 175 browser and 107 backend passes, but not yet convertible to a per-ID percentage.
- **Deployed environment execution:** not measured for the unified Leave catalogue.
- **Strict completed confidence:** `6.2%` (`13/209`).
- **Module verdict:** `CONDITIONAL` pending exact evidence reconciliation and staging qualification.

## Immediate Next Action

Continue `LVC-R1B` for the 36 incomplete Leave Type/Policy contracts, prioritizing locked fields, idempotent submission, entitlement/request boundaries, exhaustive sorting/paging, and tampered proration modes. Route gender and marital-status restrictions to Product/Data Governance because the Employee model has no governed source attributes. Then begin `LVC-R2` assignment and balance reconciliation.
