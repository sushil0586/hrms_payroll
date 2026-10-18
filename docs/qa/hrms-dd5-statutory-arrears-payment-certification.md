# HRMS/Payroll DD-5 Statutory, Arrears and Payment Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**

## Frozen outcome

| Scenario | Status | Result |
|---|---|---|
| DD-PY-001 Payroll lifecycle reconciliation | Verified | Preserved DB6-10/11/13/14 evidence |
| DD-PY-002 Financial immutability | Verified | Preserved DB1 and DB6 bypass protections |
| DD-PY-003 Concurrent run/job idempotency | Verified | Preserved DB1 and Phase 5E evidence |
| DD-PY-004 March-paid-in-April mapping | Verified | Fresh statutory pack boundary plus DB2/DB6 evidence |
| DD-PY-005 Statutory calculations | Partial | PF and TDS independent configured oracles passed; approved ESI/PT/LWF and gratuity/bonus tables absent |
| DD-PY-006 Arrears and retro corrections | Partial | Browser adjustment, RBAC, race safety and calculation consumption passed; automatic multi-period delta/reversal absent |
| DD-PY-007 Payment exceptions | Partial | Callback, signature, replay, retry and handoff passed; employee-line partial payment ledger absent |
| DD-PY-008 FnF downstream | Blocked | Approved automatic derivation and same-record payment/finance policy remains unresolved |

Unique DD-5 status: **4 Verified, 3 Partial, 1 Blocked, 0 Failed, 0 Missing, 0 Skipped, 0 Not Run**.

## P0 defect fixed

Simultaneous adjustment approve and reject calls could both succeed. All adjustment transitions now execute atomically and lock the adjustment row with `SELECT FOR UPDATE`. One concurrent decision now succeeds and the stale competing decision is rejected.

Adjustment setup/list/create/submit/apply now require `payroll.review`; approve/reject require `payroll.approve`. A dedicated reviewer-only API regression confirms approval returns 403 and leaves the adjustment submitted.

## Modified source

- `backend/apps/payroll/services.py`
- `backend/apps/common/api_views.py`
- `backend/tests/test_phase0_api_smoke.py`
- `backend/tests/test_dd5_payroll_adjustment_integrity.py`
- `web/tests/e2e/dd5-payroll-adjustment-integrity.spec.ts`
- Deep-domain matrix, gap register, this report and evidence.

No payroll formula, statutory rate, historical payroll row, provider transaction, Northstar record, or customer data was changed.

## Remaining decisions and gates

1. Obtain legally approved, versioned ESI, PT, LWF, bonus and gratuity specifications by jurisdiction and effective date.
2. Approve the model for attendance/leave/salary retroactive deltas, reversals, supplementary payslips and finance reversal entries.
3. Design employee-level payment attempts and partial bank response reconciliation before certifying partial acceptance/reissue.
4. Approve FnF gratuity, leave encashment, statutory tax, recovery and correction policies.
5. Execute real provider sandbox callbacks and partial response behavior in staging; no real payment was initiated locally.

Detailed commands, expected-value arithmetic, failure history and evidence are in `docs/qa/evidence/dd5-2026-10-18/001-dd5-execution-evidence.md`.

## DD-5A closure update

DD-5A reproduced and fixed a provider callback ordering defect: a correctly signed late failure after reconciliation previously raised an unhandled immutability `ValidationError`. Callback processing now locks handoff then delivery, rechecks idempotency inside the transaction, records authenticated late events, and never mutates reconciled state. Focused PostgreSQL and browser regressions passed.

The frozen status remains **4 Verified, 3 Partial, 1 Blocked** because approved statutory breadth, automatic retro-delta rules, employee-line payment reconciliation, and automatic FnF policy are still absent. See `docs/qa/hrms-dd5a-gap-closure-certification.md`.

DD-5A is conditionally complete. This local certification does not establish production readiness.
