# STG-0B Automation Gap Closure

Date: 2026-10-26
Mapping result: 93 Fully Mapped, 34 Partially Mapped, 2 Automation Missing, 7 Environment Blocked

All 136 execution statuses remain `Not Run`.

## Four Original Automation Gaps

| ID | Finding | STG-0B classification | Required closure |
|---|---|---|---|
| `STG-E2E-1108` | Existing browser test uploads deterministic leave-balance CSV, previews validation and commits one ready row | Partially Mapped | Add persisted source fingerprint/batch identity and independent PostgreSQL/audit assertion |
| `STG-E2E-1109` | Existing browser test blocks a duplicate row in one batch and checks only one transaction | Partially Mapped | Add second-request replay with stable source identity and canonical prior result |
| `STG-E2E-1110` | No durable import job, checkpoint or crash-recovery contract exists | Automation Missing | Keep durable background import disabled or approve/design atomic job state, retry and recovery before testing |
| `STG-E2E-1208` | Pending requests use existing workflow ownership/current-manager restrictions, but reassignment policy is deliberately unapproved | Automation Missing | Add browser/API safe-denial test after policy owner confirms the required restriction wording; do not reassign implicitly |

No product behavior or financial rule was changed. Tests were not added where the expected contract is absent or policy-dependent.

## Partial Mapping Review

| IDs | Precise missing assertion/evidence | Dependency |
|---|---|---|
| `0001`-`0003` | Per-run image/API identity, TLS/header capture and authenticated health evidence | Deployed Batch 0 access |
| `0103`, `0105` | Duplicate-admin database absence; first-login route plus membership/audit linkage | Disposable tenant/persona manifest |
| `0202`, `0204`, `0205` | Browser coverage for every named master plus duplicate-scope PostgreSQL assertions | Connected organization fixture |
| `0305`, `0306` | Browser linkage across leave year, pay group, payroll period and legal-entity scope | Approved deterministic dates |
| `0404`-`0406` | ESS/MSS provisioning IDs, first-login session and role-to-employee linkage | Synthetic mailboxes and personas |
| `0501`, `0502` | Browser policy configuration plus exact effective rules and ledger opening | Approved synthetic leave rules |
| `0601`, `0602`, `0604` | Overnight/holiday/policy browser setup and independent derivation oracle | Deterministic business dates |
| `0701`-`0704` | Category/requirement browser setup, upload checksum, invalid size/type and duplicate request persistence | Private synthetic storage |
| `0709` | Notification row, read/deep-link state and delivery correlation | Synthetic recipient/SES evidence |
| `1006`, `1007` | Export checksum and row/amount reconciliation to finalized payroll | Finalized synthetic run |
| `1102`-`1104` | Independent leave, attendance and payroll report aggregates plus RBAC | Connected report dataset |
| `1108`, `1109` | Durable source identity and cross-request replay evidence | Import contract enhancement |
| `1204` | Effective-date manager revocation with old/new queue and audit assertions | Two-manager fixture |
| `1310` | Deployed centralized log delivery and redaction proof | Logging sink/access |
| `1401`, `1402` | Deterministic manifest generator and signed reconciliation/audit inventory | Complete prior batches |

## Safe Validation

- Existing import test title and path were source-validated.
- All mapping paths/titles were revalidated after classification changes.
- PostgreSQL-only checks were not run on SQLite.
- No staging import, payroll or reassignment workflow was executed.

## Decision

Two gaps were reclassified from missing to partial based on validated existing automation. Two remain genuinely missing because their durable or policy contract is absent. No scenario became Fully Mapped in STG-0B.
