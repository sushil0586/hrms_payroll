# HRMS/Payroll RG-2A Financial Integrity Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Production readiness: **NO-GO**

## Frozen gate reconciliation

| Gate | Priority | Outcome | Evidence and unresolved dependency |
|---|---|---|---|
| `DDG-F-001` | P0 | Blocked overall; technical partial | One configured settlement identity and its immutable lines reconcile through payroll calculation. Automatic gratuity, encashment, tax/recovery derivation and same-record payment/finance treatment require HR/Payroll/Finance/Legal approval. |
| `DDG-F-005` | P1 | Partial | Proven configured proration remains available; no approved joiner/leaver boundary and rounding matrix exists. |
| `DDG-F-006` | P0 | Blocked | Post-expiry cancellation remains fail-closed. Restoration versus forfeiture requires HR/Legal approval. |
| `DDG-F-010` | P0 | Partial | Synthetic configured PF/TDS oracles and effective-date boundary passed. ESI, PT, LWF, bonus and gratuity specifications are absent. |
| `DDG-F-011` | P0 | Partial, defect remediated | Adjustment maker/checker, race, RBAC, idempotent source identity and immutable calculation consumption pass. Automatic multi-period delta, reversal, supplementary payslip and tax policy remain unapproved. |
| `DDG-F-012` | P0 | Partial | Signed artifact callback ordering/replay/retry/dead-letter and finance reconciliation pass. Employee-level payment instruction/allocation/outstanding/reissue ledger depends on an approved provider contract. |
| `DDG-F-030` | P1 | Partial | Deterministic statutory-pack boundary selection and existing certified assignment guards pass. Complete measured database overlap coverage across all configuration classes remains open. |
| `STG-005` | P0 | Blocked externally | No approved provider sandbox, secrets, signed external callback logs, or SMTP/finance reconciliation was available. |

Unique current totals: **0 Verified, 5 Partial, 3 Blocked, 0 Not Started**. No frozen ID or historical result was replaced.

## Confirmed defect

An HR administrator holding both `payroll.review` and `payroll.approve` could submit and approve the same payroll adjustment. Permission separation alone did not enforce maker/checker separation.

The remediation:

- rejects self-approval in the transactional adjustment service after locking the canonical row;
- adds model validation for actionable API errors;
- adds PostgreSQL constraint `payroll_adjustment_maker_checker_distinct`, protecting ORM bulk updates and raw writes;
- uses an additive migration that stops when existing same-maker approvals are found instead of rewriting them;
- updates the API lifecycle regression to prove maker denial, distinct-checker success, and database-bypass rejection.

No payroll formula, statutory rate, settlement component, historical row, provider state, or permission grant was changed.

## End-to-end evidence

- Before-state PostgreSQL/API reproduction: **1 passed**, demonstrating same-user submit/approve/apply was possible.
- Focused maker/checker and calculation regression: **5 passed**.
- Expanded payroll/statutory/settlement/provider/finance regression: **15 passed**.
- Neighboring job, artifact RBAC and protected-history regression: **3 passed**.
- Production-built browser adjustment workflow: **1 passed in 39.5s** after one retained migration-environment failure.
- Migration forward/rollback/reapply: passed.
- Django checks and migration drift: passed / none.
- TypeScript, ESLint, frontend production build and backend Docker build: passed.
- Synthetic cleanup: no disposable tenant, service, container or temporary image remained.

Detailed commands and arithmetic: `docs/qa/evidence/rg2a-2026-10-18/001-rg2a-financial-integrity-evidence.md`.

## Modified files

- `backend/apps/payroll/models.py`
- `backend/apps/payroll/services.py`
- `backend/apps/payroll/migrations/0042_payrolladjustment_maker_checker_distinct.py`
- `backend/tests/test_phase0_api_smoke.py`
- `backend/tests/test_dd5_payroll_adjustment_integrity.py`
- `docs/qa/hrms-release-gate-execution-tracker.csv`
- This report and its evidence record.

## Required decisions

1. Payroll Compliance, Legal and Tax: effective-dated statutory tables, applicability, thresholds, exemptions and rounding.
2. Payroll and Finance: automatic retro-delta, reversal, supplementary payroll/payslip and finance-reversal treatment.
3. HR and Legal: post-expiry leave treatment and FnF gratuity/encashment/recovery rules.
4. Finance, Payments and Security: provider line-result contract, partial acceptance, beneficiary correction, outstanding/reissue lifecycle and “paid” definition.
5. Integrations and Infrastructure: approved sandbox credentials, signed callbacks, SMTP/finance provider logs and managed broker evidence.

## Decision

RG-2A is **CONDITIONAL**. A genuine P0 maker/checker defect is closed and the policy-neutral financial controls remain sound, but no complete RG-2 gate can be promoted to Verified without the listed approved policies or staging provider evidence. Real payments, unsupported statutory calculations, automatic arrears, affected post-expiry cancellation, and automatic FnF remain disabled or restricted. Production readiness remains **NO-GO**. RG-2B and RG-3 were not started.
