# HRMS Leave Conservative Policy Baseline

Date: 2026-11-04

Status: **APPROVED**

Approval source: repository owner approval recorded in the implementation session on 2026-11-04.

This baseline closes the eight LVC-0 policy decisions with conservative, fail-closed behavior. It does not authorize unsupported calculations, destructive evidence removal, partial-unit decisions, workflow ownership transfer, retroactive ledger reconstruction, or automatic payroll posting.

| Scenario | Approved policy | Enforced contract |
|---|---|---|
| `LV-E2E-0129` | Exit/anniversary daily proration is disabled. | Only `none` and `by_join_month` are accepted; no inferred daily formula or rounding matrix. |
| `LV-E2E-0333` | Leave evidence remains private and retained. | Employees cannot destructively delete evidence; governed retention, legal hold, archive, and administrator disposal controls remain authoritative. |
| `LV-E2E-0407` | Partial-unit approval is unavailable. | Approvers may approve the complete request or reject it. The internal `partially_approved` status remains valid only as an intermediate state in an approved multi-level workflow. |
| `LV-E2E-0417` | Pending approvals remain with the recorded workflow owner. | Reporting-manager reassignment does not transfer an existing pending step; a newly assigned manager cannot act unless a separately governed workflow reassignment occurs. |
| `LV-E2E-0511` | Started or past leave cancellation is denied by default. | Cancellation is available only when an explicit tenant lifecycle rule enables it and its configured cutoff is satisfied. |
| `LV-E2E-0512` | Expired entitlement is never recreated automatically. | Post-expiry reversal fails closed and requires a separately authorized correction decision. |
| `LV-E2E-0609` | Leave-request imports are atomic. | A malformed, ambiguous, duplicate, or business-invalid row rejects and rolls back the complete batch with row diagnostics. |
| `LV-E2E-0717` | Leave encashment does not automatically post to FnF/payroll. | Leave ledger encashment and payroll settlement remain independent until immutable valuation, source linkage, tax, rounding, reversal, and maker-checker rules are approved. |

## Change control

Any relaxation requires a new Product/Policy/QA decision, migration and rollback review where data semantics change, and independent browser/API/PostgreSQL regression evidence. Existing scenario IDs must remain stable.
