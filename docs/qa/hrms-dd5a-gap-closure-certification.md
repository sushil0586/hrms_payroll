# HRMS/Payroll DD-5A Gap Closure Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**

## Frozen scenario reconciliation

| ID | Current status | DD-5A outcome |
|---|---|---|
| DD-PY-001 | Verified | Preserved payroll-to-finance reconciliation evidence. |
| DD-PY-002 | Verified | Preserved terminal financial immutability and bypass guards. |
| DD-PY-003 | Verified | Preserved duplicate-run, durable-job and retry idempotency evidence. |
| DD-PY-004 | Verified | Preserved March earning/April payment period-boundary evidence. |
| DD-PY-005 | Partial | PF and TDS configured synthetic oracles remain verified. No approved effective-dated ESI, PT, LWF, bonus or gratuity specifications exist in the repository, so broader statutory certification remains policy-blocked. |
| DD-PY-006 | Partial | Browser maker/checker, PostgreSQL decision locking and calculation consumption remain verified. The product supports explicit source-period adjustments; automatic multi-period delta, reversal, supplementary payslip and finance-reversal policy remains undefined. |
| DD-PY-007 | Partial | A confirmed out-of-order callback defect was fixed and verified. Artifact-level callbacks, replay, retry and dead-letter handling pass; employee-level partial acceptance, outstanding balance and reissue are not implemented. |
| DD-PY-008 | Blocked | Settlement identity and configured-line calculation remain verified. Automatic FnF gratuity, leave encashment, tax, recovery and downstream payment policy remains unapproved. |

Unique outcome: **4 Verified, 3 Partial, 1 Blocked, 0 Failed, 0 Missing, 0 Skipped, 0 Not Run**.

## Confirmed defect and remediation

A correctly signed provider `FAILED` callback with a new idempotency key, received after the delivery had reached `RECONCILED`, attempted to regress the terminal delivery. The model immutability check prevented database corruption, but its `ValidationError` escaped as HTTP 500.

The callback service now:

- locks the finance handoff and provider delivery in the established parent-to-child order;
- rechecks callback idempotency inside the transaction;
- records every authenticated late callback as processed evidence;
- records the received status and immutable-state skip reason;
- leaves the reconciled delivery and handoff unchanged.

Before: valid late failure produced HTTP 500.  
After: HTTP 200, durable callback event, `delivery_mutation_skipped=true`, delivery remains `reconciled`, and handoff status is unchanged.

## Payment exception design boundary

Employee-level partial-payment certification requires an additive ledger, not reinterpretation of the existing artifact-level `PayrollProviderDelivery`. The proposed governed design is:

1. `PayrollPaymentInstruction`: immutable employee, payroll result, beneficiary snapshot, currency and authorized amount; unique by payroll result and payment purpose.
2. `PayrollPaymentAttempt`: append-only attempt number, provider idempotency key, submitted amount, status, timestamps and failure category.
3. `PayrollPaymentProviderEvent`: append-only signed callback evidence with provider sequence/time, deduplication key and processing result.
4. `PayrollPaymentAllocation`: accepted/rejected amount allocation that reconciles paid plus outstanding to the immutable instruction amount.
5. Reissue creates a new attempt against the outstanding amount; it never edits the original attempt or payroll result.
6. Maker/checker approval is required before submission and reissue; callbacks cannot manufacture approval.

Required approved decisions before implementation: provider line-response contract, whether partial acceptance is supported, rejection/reissue approval rules, beneficiary-correction workflow, accounting treatment of outstanding amounts, and when an employee is considered paid. No external simulation was marked as a real payment.

## Arrears and FnF boundaries

Current adjustments preserve `source_period_start`, `source_period_end`, an in-period `effective_date`, immutable `source_hash`, maker/checker state and unique run/employee/source/component identity. They do not calculate historical deltas automatically. Implementing that engine requires approved rules for triggers, period allocation, statutory recomputation, supplementary payslips and finance reversal entries.

FnF preserves identity from `PayrollSettlement` to each immutable settlement line, generated applied adjustment, calculation line, payroll run and output. Automatic component derivation remains blocked because gratuity, leave encashment, tax and recovery policies are not approved.

Executed synthetic reconciliation remained exact:

- PF: INR 30,000 basic, INR 15,000 configured ceiling, 12% employee and employer contribution = INR 1,800 each; employee net after PF = INR 28,200.
- TDS: INR 240,000 annualized base, INR 75,000 declaration capped by configuration at INR 50,000, INR 190,000 taxable basis, INR 4,000 annual tax over eight remaining periods = INR 500 per period.
- FnF configured lines: INR 15,000 final earned salary + INR 5,000 leave encashment - INR 2,500 notice recovery = INR 17,500 settlement. The complete payroll calculation reconciled to INR 50,000 gross, INR 4,300 employee deductions and INR 45,700 net, with exactly three settlement-derived adjustment lines.

These values prove repository-configured synthetic calculations only; they are not assertions of current statutory law or approval of automatic FnF derivation.

## Verification summary

- PostgreSQL callback reproduction before fix: failed with unhandled terminal-state `ValidationError`.
- Corrected callback regression: passed with independent persisted-state assertions.
- Focused payroll/statutory/adjustment/settlement/provider/finance regression: 11 passed.
- Production-built browser adjustment maker/checker workflow: passed after correcting the local test proxy path and production demo-data flag; the initial `/auth/login` 404 and production-runtime 500 attempts are retained as environment failures.
- TypeScript, targeted ESLint, Django checks, migration drift and production build: passed.
- Synthetic Playwright workspaces were removed; the isolated PostgreSQL container was removed after verification.

Detailed commands and run history are in `docs/qa/evidence/dd5a-2026-10-18/001-dd5a-execution-evidence.md`.

DD-5A is **CONDITIONAL**. The implemented provider-ordering defect is closed, but DD-PY-005, DD-PY-006, DD-PY-007 and DD-PY-008 cannot advance beyond their frozen statuses without approved legal, retro-pay, payment-provider and FnF policies. This is not production-readiness certification.
