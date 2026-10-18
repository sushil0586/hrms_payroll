# HRMS/Payroll Release Gate Remediation Plan (RG-0)

Date: 2026-10-18  
Scope: planning only  
Production readiness: **NO-GO**

## Baseline And Guardrails

- Preserve the frozen 81 deep-domain IDs and their current 49 Verified, 18 Partial, 3 Missing and 11 Blocked outcomes.
- Preserve DB-1 through DB-6 evidence and the frozen 963-case Playwright baseline of 957 passed and 6 justified skips.
- No application code, migration, test status or customer data is changed by RG-0.
- A gate closes only after its policy prerequisite, implementation, and required browser/API/PostgreSQL/Celery or staging evidence are complete.
- Advanced features may remain disabled only when their absence cannot alter ordinary enabled payroll, security, retention or statutory behavior.

## Gate Classification

The 40 consolidated gates comprise 17 P0, 21 P1 and 2 P2 gates.

| Class | Meaning | Current examples |
|---|---|---|
| Closed defects | A reproduced implementation defect was fixed and regressed | roster atomicity, provider callback ordering, mutation idempotency, salary assignment isolation, atomic organization import |
| Implementation gaps | Required model/service/UI/job behavior does not exist completely | payment instruction ledger, durable imports, support-session revocation, temporal organization masters |
| Verification gaps | Behavior exists partially but lacks complete connected evidence | retroactive attendance, report volume, cancellation races, organization concurrency |
| Business-policy approvals | Product behavior cannot be safely invented | FnF, transfer, rehire, expiry restoration, overtime, delegation/escalation, arrears |
| Legal/compliance decisions | Authoritative external rule or governance approval is required | statutory tables, retention/erasure, legal hold, legacy classification |
| External staging dependencies | Correctness depends on deployed infrastructure or provider evidence | TLS, backups, Redis/Celery, storage, providers, monitoring, deployment, capacity |

There is no open gate currently classified as an unresolved reproduced data-corruption defect. This does not reduce severity: missing P0 controls remain launch blockers.

## Decision Prerequisites

These decisions must be recorded before dependent implementation begins:

| Decision package | Gates | Required owners | Required output |
|---|---|---|---|
| Payroll/statutory scope | DDG-F-001, 005, 006, 008, 010, 011, 012 | Payroll, HR, Finance, Tax, Legal | Effective-dated formulas, thresholds, rounding, correction and settlement rules |
| Employment continuity | DDG-F-002, 003, 016 | HR, Payroll, Tax, Security | Transfer, rehire and pending-approval ownership rules |
| Workflow authority | DDG-F-013, 014, 015 | Business process owners, HR governance, Security | Parallel quorum, delegation validity and SLA fallback rules |
| Privacy and retention | DDG-F-004, 024, 028, 029, 032 | Privacy, Legal, Security, Data owners | Retention periods, legal hold, erasure, backup disposition and legacy classification decisions |
| Launch feature manifest | All excluded gates | Product, Release lead, Security | Signed enabled/disabled feature list enforced through UI, APIs, roles and configuration |

Unapproved behavior remains fail-closed. A decision to exclude a feature is acceptable only when the exclusion is technically enforceable and does not remove a mandatory legal or payroll control from an enabled workflow.

## Implementation Phases

### RG-1: Security, Recovery, Storage And Governance Foundation

Gates: `DDG-F-004`, `DDG-F-024`, `DDG-F-027`, `DDG-F-028`, `DDG-F-029`, `DDG-F-032`, `STG-001`, `STG-002`, `STG-003`, `STG-004`, `STG-006`, `STG-007`.

Objectives:

- Enforce active-session support revocation and protected artifact revocation.
- Deploy protected object storage, malware scanning, encryption and signed access.
- Approve and configure retention/legal-hold policy while keeping irreversible erasure disabled until separately approved.
- Establish deterministic legacy classification or permanent exception handling.
- Prove TLS/proxy controls, database recovery, broker durability, observability and deployment rollback.

Completion criteria:

- Unauthorized, expired and cross-tenant access fails through browser, API and storage layers.
- Legal holds and retention prevent deletion through supported and bypass write paths.
- Backup/restore, broker interruption, worker recovery and rolling deployment rehearsals pass in staging.
- No ambiguous historical row is automatically classified or rewritten.
- Security monitoring and audit retention have named operational owners.

Required evidence: browser revocation races; API/RBAC denial; PostgreSQL retention and tenant tests; storage access logs; Celery interruption/recovery; deployed TLS and observability captures; backup/restore and deployment runbooks.

### RG-2: Payroll, Statutory, Payments And Settlement Integrity

Gates: `DDG-F-001`, `DDG-F-005`, `DDG-F-006`, `DDG-F-010`, `DDG-F-011`, `DDG-F-012`, `DDG-F-030`, `STG-005`.

Objectives:

- Install approved effective-dated statutory specifications and independent calculation oracles.
- Add an immutable employee payment instruction/status ledger with rejection, reissue and idempotent reconciliation.
- Implement only approved arrears, retro, FnF, leave settlement and proration rules.
- Complete remaining temporal payroll overlap guards where measurements show risk.
- Validate email and finance-provider sandboxes without initiating real transactions.

Completion criteria:

- Synthetic gross-to-net, employer liability, payment and finance totals reconcile exactly at employee and run level.
- Finalized payroll and payslips remain immutable under API, ORM bulk and raw SQL attempts.
- Duplicate submissions/callbacks cannot duplicate adjustment, output, payment or posting.
- Provider failures and out-of-order callbacks recover without premature Paid status.
- Jurisdiction/rule combinations without approved specifications remain unavailable.

Required evidence: independent statutory oracle tests; browser maker/checker flows; API idempotency; PostgreSQL concurrency/immutability; Celery retries; sandbox callback signatures and ordering; exact payroll-to-payment-to-finance reconciliation.

### RG-3: Governed Lifecycle, Authority And Historical Operations

Gates: `DDG-F-002`, `DDG-F-003`, `DDG-F-007`, `DDG-F-008`, `DDG-F-013`, `DDG-F-014`, `DDG-F-015`, `DDG-F-016`, `DDG-F-017`, `DDG-F-018`, `DDG-F-019`, `DDG-F-025`, `DDG-F-026`.

Objectives:

- Implement approved transfer, rehire, overtime and workflow-authority policies only if required for launch.
- Complete retroactive attendance/history evidence and temporal organization/report behavior.
- Certify archive/assignment races, plan downgrade and onboarding recovery.

Completion criteria:

- Business-date resolution preserves earlier employee, manager, organization, attendance and payroll history.
- Concurrent decisions and administrative changes produce one authorized outcome without dangling references.
- Disabled advanced workflows reject UI, API and permission-based access predictably.
- As-of reports are either implemented with approved semantics or clearly restricted to current-state reporting.
- Downgrade and onboarding retries preserve data and create no duplicate tenant/domain records.

Required evidence: production-built browser workflows; API authorization; PostgreSQL effective-date and race tests; immutable audit events; downstream leave/attendance/payroll snapshots; Celery evidence for scheduled escalation only if implemented.

### RG-4: Imports, Reports, Async Reliability And Capacity

Gates: `DDG-F-009`, `DDG-F-020`, `DDG-F-021`, `DDG-F-022`, `DDG-F-023`, `DDG-F-031`, `STG-008`.

Objectives:

- Standardize import idempotency and rollback semantics for enabled modules.
- Add durable checkpoint/replay only for imports that must outlive a request.
- Complete report row/filter/order/audit verification and stale-download cancellation.
- Validate long-term query plans and staging capacity.

Completion criteria:

- Replayed rows and jobs cannot duplicate mutations; partial acceptance is explicit and auditable.
- Worker interruption resumes from a persisted checkpoint or fails safely with a deterministic Retry.
- Every enabled report returns complete ordered filtered rows and an audit event at its supported volume.
- Cancelled/stale downloads never announce success or overwrite newer requests.
- Staging passes the fixed capacity target; local 25-VU results are not substituted for staging evidence.

Required evidence: browser failure/retry/cancellation; API fingerprints; PostgreSQL row/job uniqueness; Celery crash/recovery; export manifests and audits; `EXPLAIN`/`pg_stat_statements`; staged 25/50-VU results.

## Dependencies And Parallelism

```text
Policy decisions and launch feature manifest
  ├── RG-1 security/governance foundation
  ├── RG-2 payroll/statutory/payment implementation
  └── RG-3 lifecycle/authority implementation

RG-1 storage, broker and observability ─┐
RG-2 financial integrity ───────────────┼── real-payroll pilot
RG-3 enabled lifecycle gates ───────────┘

RG-1 + stable staging resources ────────── RG-4 async/volume/capacity
All required phases + unrestricted policies ─ unrestricted launch
```

RG-1 infrastructure and RG-2 calculation design may proceed in parallel after policy inputs are frozen. RG-3 advanced-feature teams may proceed independently, but their features remain disabled until complete. RG-4 performance measurements begin only after affected implementations and staging infrastructure are stable.

## Complexity And Staffing

| Workstream | Relative complexity | Primary skills |
|---|---|---|
| RG-1 | XL | Security, SRE, PostgreSQL, storage, privacy/legal, backend/frontend |
| RG-2 | XL | Payroll domain, tax/legal, finance, PostgreSQL, Celery, browser QA |
| RG-3 | L–XL depending enabled scope | HR domain, workflow, temporal data, reporting, QA |
| RG-4 | L | Async jobs, imports/exports, performance, SRE, QA |

Complexity is relative (`S`, `M`, `L`, `XL`) and intentionally not converted to calendar promises before approved policies, team capacity and provider access are known.

## Pilot Exclusions

These advanced capabilities may remain disabled for a restricted synthetic/shadow pilot: cross-entity transfer, rehire, post-expiry leave cancellation, overtime payroll conversion, automatic arrears, FnF, real payments, parallel approvals, delegation, escalation, pending-request reassignment, future organization-master restructuring, historical as-of organization reporting, biometric ingestion, durable background imports, plan downgrade, support access and irreversible erasure.

These controls cannot be waived when real employee/payroll data or money is involved: applicable statutory calculations, employee payment integrity, RBAC and tenant isolation, protected storage, retention/legal hold, active privileged-access revocation, backup/restore, broker reliability, audit/monitoring, deployment rollback and legacy classification before migration.

## Readiness Gates

| Launch level | Required completion | Decision |
|---|---|---|
| Synthetic/shadow staging | RG-1 staging/security subset; exclusions technically enforced; no real provider actions | Conditional Go after evidence |
| Synthetic/shadow restricted pilot | Above plus supported payroll/leave/attendance regressions and monitored operations | Conditional Go |
| Real-payroll pilot | RG-1 and RG-2 complete; applicable RG-3 gates complete; real-data legal approval; provider sandbox certified | NO-GO today |
| Unrestricted launch | All 40 gates closed or approved as genuinely non-applicable, with full staging certification | NO-GO today |

## Execution Governance

- The tracker is authoritative for gate ownership and evidence links.
- Preserve original failure and rerun history; never replace it with only the latest result.
- A gate cannot be marked Complete by documentation alone when implementation or execution evidence is required.
- Any tenant leakage, financial imbalance, duplicate payment/posting, unauthorized approval, destructive retention bypass or unexplained historical mutation stops the workstream immediately.

RG-0 ends with planning. No remediation implementation is authorized by this document.
