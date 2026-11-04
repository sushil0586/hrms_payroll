# HRMS Leave LVC-0 Contract Freeze

Date: 2026-11-03

Source catalogue: `docs/qa/hrms-leave-complete-e2e-scenario-catalog.md`

Decision: **PASS - execution scope frozen; conservative baseline approved for all eight policy contracts**

## Reconciliation result

- Stable scenarios: **209**
- Duplicate IDs: **0**
- Executable with the current approved product contract: **209**
- Policy-dependent and fail-closed: **0**
- Approved Not Applicable: **0**
- Removed or renumbered scenarios: **0**

All `LV-E2E-*` IDs are classified as **Executable**. The eight IDs listed below use explicit conservative contracts rather than previously undecided behavior.

Executable means the acceptance contract can be tested now. It does not mean the scenario has passed. A result changes only after the complete browser/API/PostgreSQL/audit/security/accessibility evidence contract is satisfied.

## Approved conservative dispositions

| ID | Approved disposition | Required behavior | Verification posture |
|---|---|---|---|
| `LV-E2E-0129` | Daily exit/anniversary proration disabled. | Permit only `none` and `by_join_month`. | Executable as a negative availability contract. |
| `LV-E2E-0333` | Private retention; no employee destructive deletion. | Preserve governed evidence and deny employee removal. | Executable as retention/access-control contract. |
| `LV-E2E-0407` | Partial-unit approval unavailable. | Full approval or rejection only; preserve multi-level intermediate status. | Executable as action-availability and ledger contract. |
| `LV-E2E-0417` | Original workflow owner retained. | Reassigned manager cannot act on the existing pending step. | Executable as workflow-ownership denial contract. |
| `LV-E2E-0511` | Started/past cancellation denied unless explicitly enabled. | Default deny; enforce configured cutoff when enabled. | Executable as lifecycle-policy contract. |
| `LV-E2E-0512` | No automatic expired-lot recreation. | Fail closed and require governed correction. | Executable as immutable-ledger contract. |
| `LV-E2E-0609` | Mixed-validity import is atomic. | Reject and roll back the full batch with row diagnostics. | Executable after endpoint repair and regression. |
| `LV-E2E-0717` | No automatic encashment-to-payroll posting. | Keep leave and payroll records independent. | Executable as downstream-boundary contract. |

## Executable scope by phase

| Phase | Total | Executable | Policy-dependent | First execution objective |
|---|---:|---:|---:|---|
| Phase 0 - Leave type | 20 | 20 | 0 | Master validation, referenced-record protection, feedback, stale writes. |
| Phase 1 - Policy | 29 | 29 | 0 | Policy calculation boundaries and approval routes. |
| Phase 2 - Assignment/balance | 20 | 20 | 0 | Resolution priority, import replay, opening ledger, maker-checker. |
| Phase 3 - ESS apply | 33 | 33 | 0 | Request, evidence, idempotency, collision, responsive behavior. |
| Phase 4 - MSS approval | 27 | 27 | 0 | Direct/multi-level/delegated decisions and history. |
| Phase 5 - ESS lifecycle | 17 | 17 | 0 | Withdrawal, approved cancellation, reversal, truthful feedback. |
| Phase 6 - HR operations | 20 | 20 | 0 | Override, imports, balance review, audit, notifications. |
| Phase 7 - Year/downstream | 18 | 18 | 0 | Period controls, carry/expiry, reports, attendance/payroll boundaries. |
| Phase 8 - Nonfunctional | 25 | 25 | 0 | Security, resilience, accessibility, responsive UI, paging/sorting. |
| **Total** | **209** | **209** | **0** | |

## Contract sources verified

- `backend/apps/leave_management/models.py`: request, policy, period, balance, transaction, lot, and allocation states.
- `backend/apps/leave_management/services.py`: validation, assignment resolution, reservation, consumption, withdrawal, cancellation, balance governance, and notifications.
- `backend/apps/leave_management/auto_approval.py`: timer ownership and due-step behavior.
- `backend/apps/common/leave_history.py`: employee history/filter/calendar behavior.
- HR Admin, ESS, and MSS Next.js routes and API proxies under `web/src/app`.
- Existing PostgreSQL and browser suites under `backend/apps/leave_management/tests.py` and `web/tests`.
- Existing DD-3, DB-6, CRUD, and STG-136 leave evidence. Historical evidence informs fixture reuse but does not pre-pass this catalogue.

## Execution dependency order

1. Establish one isolated PostgreSQL 16, Redis, Django, production Next.js environment and exact-ID fixture ownership.
2. Execute Phase 0 and Phase 1 configuration before creating assignments or balances.
3. Execute Phase 2 once for reusable employees, managers, calendars, periods, and entitlements.
4. Execute Phase 3 ESS creation cases before Phase 4 MSS decisions.
5. Reuse the same requests for Phase 5 lifecycle and Phase 6 HR reconciliation where contracts permit.
6. Execute Phase 7 only after immutable request/ledger history is established.
7. Run Phase 8 security/accessibility checks throughout, then repeat its connected cases against the final state.
8. Execute all ten golden journeys in a fresh environment after the phase suites pass.

## Initial bounded package

The first implementation/execution package is `LVC-1A`:

- `LV-E2E-0001` through `LV-E2E-0020`
- `LV-E2E-0101` through `LV-E2E-0107`
- `LV-E2E-0113` through `LV-E2E-0128`
- Includes `LV-E2E-0129` as an approved negative availability contract.

It will verify HR Admin leave-type/policy CRUD, validation, feedback, effective dates, restrictions, approval routes, sorting, pagination, accessibility, tenant isolation, idempotency, and stale-write behavior before downstream ESS/MSS execution begins.

## Exit decision

`LVC-0` has frozen and classified the complete scenario scope. All 209 scenarios are executable under the approved conservative baseline in `docs/qa/hrms-leave-conservative-policy-baseline.md`. Approval makes the contracts executable; it does not pre-pass them.
