# DD-3 Leave Domain Certification

Date: 2026-10-18  
Decision: **CONDITIONAL**  
Environment: isolated PostgreSQL 16, production-built Next.js, local Django API, disposable authorized tenant

## Frozen scope

The next unexecuted roadmap group was the original **DD-3 Leave** domain. No scenarios were renumbered or recreated.

| Scenario | Current result | Evidence-based disposition |
| --- | --- | --- |
| DD-LV-001 | Verified | Approval, rejection, cancellation, reservation, and restoration retained from DB-3/DB-6 evidence. |
| DD-LV-002 | Verified | Carry cap, forfeiture, expiry, entitlement lots, and earliest-expiry behavior passed PostgreSQL regression. |
| DD-LV-003 | Verified | Concurrent/duplicate approval and year-close protections retained; duplicate browser review returned 400. |
| DD-LV-004 | Verified | Cross-year allocation passed PostgreSQL regression without rewriting history. |
| DD-LV-005 | Partial | `none` and approved join-month behavior exist. Daily exit/anniversary proration and a complete approved rounding matrix do not. |
| DD-LV-006 | Verified | Browser maker/checker correction, PostgreSQL projection, append-only compensation, and duplicate-decision rejection passed. |
| DD-LV-007 | Blocked | Post-expiry cancellation treatment remains an explicit business-policy decision; automatic restoration remains safely rejected. |
| DD-LV-008 | Partial | Encashment cap/review and FnF settlement identity are independently implemented, but no immutable source link or approved valuation/rounding policy connects the leave movement to the settlement line. |

Totals: **5 Verified, 2 Partial, 0 Missing, 1 Blocked**.

## Confirmed defects and remediation

The production browser reproduced two connected integrity defects in governed admin balance review:

1. The legacy review service directly changed a governed balance, causing the DB-3 write guard to return HTTP 500.
2. The append-only trigger returned `OLD` for pending-row updates. After the first service correction this silently retained `pending` while the balance changed.

Remediation:

- Centralized admin projection persistence under the request-scoped governed ledger write capability.
- Persisted policy-period ownership, signed `delta_units`, checksum, and ledger version for admin movements.
- Corrected the PostgreSQL trigger to return `NEW` for pending-to-terminal transitions while continuing to reject updates/deletes of applied rows.
- Added an ownership-verified synthetic-teardown exception for `DELETE` only; ordinary applied-ledger deletion remains prohibited.
- Added a deterministic PostgreSQL regression and browser maker/checker certification.

No leave formula, entitlement, expiry, carry-forward, payroll, tenant, or permission rule was changed.

## Results

- Playwright initial reproduction: HTTP 500 on approval.
- Playwright intermediate reproduction: HTTP 200 but transaction remained `pending` due to trigger semantics.
- Playwright final: **1 passed** in 19.8 seconds; balance changed once, status persisted as `applied`, duplicate approval returned 400, cleanup verified.
- PostgreSQL focused leave suite after remediation: **17 passed**, 33 deselected.
- Django system check: passed.
- Migration drift: no changes detected.
- Migration rollback to leave-management `0010` and reapply through `0012`: passed.
- TypeScript: passed.
- ESLint for the added scenario: passed.
- Production frontend build: passed with the pre-existing autoprefixer `end` compatibility warning.

## Historical and downstream integrity

- Applied transactions remain append-only.
- Corrections remain compensating entries linked by `source_transaction`; historical source entries are retained.
- Governed projections advance ledger version/checksum exactly once on approval.
- Post-expiry cancellation is not auto-restored.
- Leave encashment cannot yet be certified as connected to FnF/payroll because settlement input has no enforced ledger source identity.
- No Northstar, staging, production, or customer records were used.

## Evidence

Evidence is retained under `docs/qa/evidence/dd3-2026-10-18/`, including the original failures and successful reruns. The disposable tenant created by the final browser run was deleted with `verified_absent=true`; the final database query returned `playwright_tenants: 0`.

DD-3 is **CONDITIONAL**, not a production-readiness declaration. DD-LV-005, DD-LV-007, and DD-LV-008 require approved business policy and/or connected implementation before full certification.
