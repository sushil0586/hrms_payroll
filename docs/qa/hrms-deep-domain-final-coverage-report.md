# HRMS/Payroll Deep-Domain Final Coverage Report

Date: 2026-10-18  
Scope: evidence reconciliation only  
Decision: **CONDITIONAL / PRODUCTION NO-GO**

## Executive Reconciliation

The frozen matrix contains exactly **81 rows and 81 unique scenario IDs**. No duplicate or omitted IDs were found. DD-Final did not modify application code, migrations, scenario definitions, or scenario statuses.

| Status | Total | P0 | P1 | P2 |
|---|---:|---:|---:|---:|
| Verified | 49 | 31 | 17 | 1 |
| Partial | 18 | 5 | 13 | 0 |
| Missing | 3 | 1 | 2 | 0 |
| Blocked | 11 | 8 | 3 | 0 |
| Failed | 0 | 0 | 0 | 0 |
| Not Run | 0 | 0 | 0 | 0 |
| **Total** | **81** | **45** | **35** | **1** |

Verified coverage is **60.5%** overall and **68.9%** for P0. The remaining 32 IDs are represented without status promotion in the release-gate register.

## Domain Scorecard

| Domain | Total | Verified | Partial | Missing | Blocked | Decision |
|---|---:|---:|---:|---:|---:|---|
| Employee lifecycle | 8 | 5 | 1 | 0 | 2 | Conditional |
| Documents | 8 | 7 | 1 | 0 | 0 | Conditional |
| Leave | 8 | 5 | 2 | 0 | 1 | Conditional |
| Attendance | 8 | 5 | 2 | 0 | 1 | Conditional |
| Payroll | 8 | 4 | 3 | 0 | 1 | Conditional, production payroll NO-GO |
| ESS and MSS | 8 | 8 | 0 | 0 | 0 | Pass for supported scope |
| Approvals and delegation | 8 | 4 | 1 | 0 | 3 | Conditional |
| Organization and history | 8 | 4 | 3 | 0 | 1 | Conditional |
| Notifications/imports/exports | 8 | 3 | 3 | 2 | 0 | Incomplete |
| Tenant subscription governance | 9 | 4 | 2 | 1 | 2 | Incomplete; production NO-GO |

The historical roadmap labels `DD-9`, `DD-10`, and `DD-Policy` are retained. They are not renumbered or presented as newly executed phases.

## Verified-Evidence Audit

All 49 Verified rows contain a non-empty evidence reference. The references were reconciled to DD-1 through DD-8 reports, DD-5A/DD-6A closure reports, DB-1 through DB-6 evidence, or the frozen 963-case baseline. No Verified row was inferred from a Partial, blocked, interrupted, or environment-failed run.

| Domain | Verified IDs | Principal evidence |
|---|---|---|
| Employee lifecycle | DD-EL-001–005 | DB-5 temporal assignment tests, DB-6.6, DD-1 browser/API/PostgreSQL evidence |
| Documents | DD-DOC-001–005, 007–008 | DD-2 browser upload/review/version/access tests; DB-4B retention guards |
| Leave | DD-LV-001–004, 006 | DB-3/3A ledger tests; DD-3 correction browser and PostgreSQL evidence |
| Attendance | DD-AT-001–003, 005–006 | DB-6.5/6.5A; DD-4 roster/import/derivation regressions |
| Payroll | DD-PY-001–004 | DB-1 financial guards; DB-6.7/6.10/6.11; DD-5 calculation/approval evidence |
| ESS and MSS | DD-SS-001–008 | DD-6 browser/API/PostgreSQL; DD-6A lost-response/idempotency closure |
| Approvals | DD-WF-001–002, 004, 008 | DB-1 workflow locking; DB-6.9; DD-7 browser and PostgreSQL evidence |
| Organization | DD-OR-001–003, 007 | DB-4/DB-5/DB-6.2; DD-8 atomic import browser/PostgreSQL evidence |
| Notifications/imports/exports | DD-NI-001–003 | frozen notification delivery/retry/export audit evidence |
| Tenant governance | DD-TG-001–004 | DB-4B, DB-6.1/6.12, subscription/RBAC evidence |

This audit validates traceability, not deployment behavior. External storage, provider, TLS, backup, monitoring, and managed-broker claims still require staging evidence.

## Partial Scenarios: Exact Missing Assertions

| ID | Missing assertion or implementation |
|---|---|
| DD-EL-006 | Automatic policy-derived FnF components and same-settlement payment/finance continuity are not implemented and reconciled end to end. |
| DD-DOC-006 | Malware scanning, provider-failure behavior, deployed signed URLs, application encryption, and backup policy are unsupported or unverified. |
| DD-LV-005 | Complete joiner/leaver proration and rounding matrix lacks approved rules and executed coverage. |
| DD-LV-008 | Leave encashment/forfeiture lacks enforced source linkage and approved rounding into FnF/payroll. |
| DD-AT-004 | Connected browser proof that retroactive roster/policy edits cannot alter closed historical reports is incomplete. |
| DD-AT-008 | Durable biometric source-event identity, row checkpointing, and crash/replay recovery are absent. |
| DD-PY-005 | Approved effective-dated ESI/PT/LWF and gratuity/bonus legal tables and complete calculation oracles are absent. |
| DD-PY-006 | Approved automatic multi-period arrears delta, reversal, and supplementary-run policy is absent. |
| DD-PY-007 | Employee-level payment instruction, outstanding balance, rejection/reissue, and reconciliation ledger is absent. |
| DD-WF-003 | Parallel step quorum/decision semantics are unsupported; the first decision currently closes the step. |
| DD-OR-004 | Organization masters lack effective-dated versions for future rename/reparent/restructure. |
| DD-OR-005 | Workforce reporting lacks an approved `as_of` contract and historical organization-name semantics. |
| DD-OR-006 | Explicit concurrent rename/archive-versus-assignment behavior is not fully specified or certified. |
| DD-NI-004 | Import idempotency and partial-acceptance semantics vary by module and are not centrally certified. |
| DD-NI-005 | Only selected high-volume reports have row-count/order/filter/audit proof; all report families are not volume-certified. |
| DD-NI-006 | Navigation cancellation and stale completion suppression are proven only for representative download families. |
| DD-TG-005 | Connected plan-downgrade behavior with pre-existing over-limit employee data is incomplete. |
| DD-TG-006 | Onboarding retry is internally idempotent, but external integration failure/resume is not certified. |

## Missing And Policy-Blocked Scenarios

Missing implementation/evidence:

- `DD-NI-007`: no durable import job with row checkpoints and crash-safe replay.
- `DD-NI-008`: post-grant download revocation race is not explicitly certified.
- `DD-TG-007` (P0): support access lacks deep certification for active-session time-bound revocation.

Policy blocked:

- `DD-EL-007` / `DD-OR-008`: cross-entity continuity for service, leave, tax, payroll, fiscal and organization history.
- `DD-EL-008`: rehire identity, service, benefit and leave continuity.
- `DD-LV-007`: post-expiry leave cancellation restoration/forfeiture.
- `DD-AT-007`: overtime eligibility, approval, rate and payroll conversion.
- `DD-PY-008`: complete FnF gratuity, leave encashment, tax, payment and finance treatment.
- `DD-WF-005`: time-bounded delegation grant/revoke policy.
- `DD-WF-006`: SLA escalation and fallback ownership policy.
- `DD-WF-007`: pending approval ownership after manager transfer.
- `DD-TG-008`: protected export, backup disposition and irreversible erasure governance.
- `DD-TG-009`: deterministic classification or permanent exception handling for ambiguous legacy rows.

## Defect Reconciliation

Confirmed defects fixed during deep-domain execution include transactional roster rollout, provider callback terminal-state handling, ESS/MSS mutation idempotency and replay, approval concurrency/permission separation, cross-employee salary-assignment protection, and atomic organization import with recoverable UI Retry. These fixes have focused regression evidence and remain closed.

No open row is classified as a reproduced corruption defect. Open rows are missing implementation, evidence depth, approved policy, legal/statutory data, external-provider behavior, or staging infrastructure. This distinction does not make them optional: P0 payroll, retention, support-access, and legacy-classification gates remain release blockers.

## DB And DB-6 Deduplication

| Consolidated gate | DD scenarios | DB/DB-6 references | Single underlying gap |
|---|---|---|---|
| Cross-entity continuity | DD-EL-007, DD-OR-008 | DB6-06-004, DBR-018 | One transfer policy/orchestration gap |
| Rehire continuity | DD-EL-008 | DB6-06-005, DBR-017 | One service-spell continuity decision |
| Post-expiry cancellation | DD-LV-007 | DB6-04-006, DBR-004 | One leave restoration policy |
| FnF/encashment | DD-EL-006, DD-LV-008, DD-PY-008 | DD-1/DD-3/DD-5A | One connected settlement policy and implementation family |
| Employee payments | DD-PY-007 | DBR-021 | One missing employee payment ledger |
| Protected erasure | DD-TG-008 | DB6-12-004, DBR-010 | One privacy/legal governance gate |
| Legacy classification | DD-TG-009 | DB6-14-003, DBR-003/007/014/016 | One governed classification program |

Managed-schema DBR-001, 002, 005, 006, 008 and 009 remain closed. DBR-003, 004, 007 and 010 remain partial for the policy/legacy gates above. DBR-011 onward remain design, functional, temporal, operational, or scalability risks as recorded in the architecture register; they are not silently converted into DD scenario failures.

## DD-8 Dependency Review

The atomic import endpoint preserves tenant scoping, direct CRUD contracts, DB hierarchy guards, and historical protected references. It serializes concurrent imports per tenant and rolls back the complete ready-row graph on failure. It does not solve effective-dated organization masters, historical `as_of` reporting, manager-scope semantics after master restructuring, or cross-entity continuity. Those remain `DD-OR-004` through `DD-OR-006` Partial and `DD-OR-008` Blocked.

## Readiness Decisions

- **Core functional readiness:** CONDITIONAL PASS for the explicitly supported local scope; frozen 963 baseline remains 957 passed and 6 justified skips.
- **Deep-domain integrity readiness:** CONDITIONAL. Supported invariants are strong, but only 49/81 scenarios are Verified.
- **Restricted pilot eligibility:** CONDITIONAL GO only for synthetic or controlled shadow operation under the exclusions in the pilot recommendation.
- **Staging entry:** CONDITIONAL GO for synthetic-data validation after infrastructure entry criteria are satisfied.
- **Unrestricted production launch:** **NO-GO** due to unresolved statutory/payroll, payment, retention, support-access, legacy-classification and policy gates.

No production, staging, Northstar or customer data was accessed. No application code or migrations were changed in DD-Final.
