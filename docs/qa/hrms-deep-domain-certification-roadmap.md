# Deep Domain Certification Roadmap

Date: 2026-10-17  
Input: `hrms-deep-domain-scenario-matrix.csv` and `hrms-deep-domain-gap-register.csv`

## Execution Principles

- Preserve the frozen 963-case and DB-6 evidence; rerun only affected neighboring coverage.
- Use production-built local browser flows for supported user actions, independent API/PostgreSQL verification, and real Celery where work is asynchronous.
- Use disposable Enterprise tenants with deterministic IDs, dates, managers, policies, periods, and ownership manifests.
- Keep one worker for mutable browser suites; never share mutable employee, leave, attendance, or payroll state across batches.
- Reproduce before remediation. Classify automation drift, fixture gaps, policy blockers, environment failures, and genuine defects separately.
- Stop on unresolved P0 security, payroll, leave-balance, payment, tenant-isolation, or historical-integrity defects.

## Controlled Sequence

| Phase | Scenarios | Objective | Entry dependency |
| --- | --- | --- | --- |
| DD-Policy | 7 blocked | Obtain explicit decisions for transfer, rehire, expiry restoration, approval reassignment, erasure/export, and legacy classification | Business/legal owners |
| DD-1 | Employee lifecycle gaps | probation, exit, access revocation, and connected FnF | Approved transfer/rehire exclusions or rules |
| DD-2 | Document gaps | expiry, replacement failure, hold enforcement, reminder idempotency | Protected synthetic storage |
| DD-3 | Leave gaps | proration, correction review, encashment and payroll settlement | Leave policy fixtures; expiry decision where applicable |
| DD-4 | Attendance gaps | roster retroactivity, policy exceptions, overtime, import replay | Approved overtime rules or explicit exclusion |
| DD-5 | Payroll gaps | statutory oracle, arrears/reversals, provider partial rejection, FnF reconciliation | DD-1/DD-3/DD-4 evidence |
| DD-6 | ESS/MSS gaps | session/offline recovery and multi-context access | Stable employee/manager fixtures |
| DD-7 | Approval gaps | multi-level routing, delegation, escalation, revocation, reassignment | Approved authority policies |
| DD-8 | Organization/history gaps | effective restructure, as-of reports, concurrency, import rollback | DB-5 temporal architecture |
| DD-9 | Notification/import/export gaps | checkpoint recovery, volume/audit, revocation races | Isolated providers/storage |
| DD-10 | Subscription/governance gaps | downgrade, support revocation, offboarding controls | Legal/security approvals |
| DD-Final | all affected P0/P1 | connected regression and risk reconciliation | DD-1 through DD-10 dispositioned |

## Suite Design

Each suite should retain a lifecycle manifest containing tenant, legal entity, employee, employment spell, manager assignment, policy, period, request, close, payroll, artifact, and job identifiers as relevant. Every browser mutation must be reconciled against its API response, database ownership/effective dates, audit event, and downstream state.

Negative matrices should include invalid input, unauthorized role, cross-tenant substitution, stale state, duplicate click, idempotency replay, concurrency race, provider failure, worker interruption, retry exhaustion, and browser refresh. Boundary matrices should include fiscal/leave year edges, overnight work, effective-date cutovers, expiry instants, rounding thresholds, inactive references, and archived parents.

## Acceptance

A scenario may move to `Verified` only with executed evidence for every applicable layer. Policy-blocked scenarios remain blocked until an accountable owner approves the rule. API-only setup cannot replace browser certification for user-facing workflows. A missing feature is not a test failure until the intended requirement is approved; a security or financial invariant violation is an immediate P0 stop.

## Recommended First Batch

Begin with **DD-1 Employee Lifecycle and FnF** because it drives leave settlement, access revocation, payroll settlement, payslips, payment, finance, documents, and retention. Execute DD-EL-004 through DD-EL-006 while retaining DD-EL-007 and DD-EL-008 as policy blockers. This creates prerequisites for DD-3 and DD-5 without duplicating the already verified hire/history/archive cases.

No DD execution was started in DD-0.
