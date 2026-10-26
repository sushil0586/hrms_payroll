# HRMS/Payroll Staging Certification Dashboard

Last updated: 2026-10-26
Environment: synthetic-only Lightsail staging
Deployed commit: `20d832996ef505f0b6c2df2673204e841e7b6a52`

## Current Decision

| Gate | Decision |
|---|---|
| STG-0 readiness | **CONDITIONAL** |
| STG-0D automation remediation | **PASS** locally |
| STG-1A tooling | **PASS** locally: ownership manifest, exact-ID evidence and governed cleanup verified |
| STG-1B candidate freeze | **PASS** for 38-file commit readiness; no commit authorization received |
| STG-1C commit/operations | **BLOCKED**: commit approval absent; provenance, evidence role, backup and execution governance incomplete |
| STG-1 Batch-1 entry | **BLOCKED**, QA candidate remains uncommitted and staging mutation authorization is absent |
| Start STG-1 immediately | **NO**, explicit mutation authorization is absent |
| Synthetic functional staging | Conditional GO after STG-1 entry criteria |
| Real-payroll staging | NO-GO |
| Production | NO-GO |

## Scenario Status

| Status | Count |
|---|---:|
| Passed | 0 |
| Failed | 0 |
| Blocked | 0 |
| Skipped | 0 |
| Not Run | 136 |
| **Total** | **136** |

No historical local or earlier staging result has been copied into this new register.

STG-1 performed read-only provenance and entry-gate checks only. The deployed application is commit `20d832996ef505f0b6c2df2673204e841e7b6a52`, backend digest `sha256:e4fcf34a080973cf02bbf1341ab57251c5a827e9782dabd6b8eff169fc12337b`, and web digest `sha256:03bb370c78bf7097c3acdf364443523936084ec183e921580484dc047c061c7a`. No frozen scenario was executed.

## Automation Mapping Readiness

| Classification | Count |
|---|---:|
| Fully Mapped | 95 |
| Partially Mapped | 32 |
| Automation Missing | 2 |
| Environment Blocked | 7 |
| **Total** | **136** |

These are mapping-readiness classifications, not staging execution results. All 136 scenarios remain `Not Run`. The immutable per-ID cross-reference is maintained in `hrms-stg0a-scenario-automation-mapping.csv`.

## Batch-1 Entry Review

| Readiness | Count |
|---|---:|
| Automation ready | 6 |
| Automation requires review | 0 |
| Automation blocked | 0 |
| Authorized for staging execution | 0 |

Batch 1 covers `STG-E2E-0101` through `0106`. STG-1A verified the integrated tooling locally with PostgreSQL (`19 passed`) and browser (`6 passed`) evidence. All six remain `Not Run` on staging: the candidate is uncommitted and no staging mutation window has been authorized.

## Batch Dashboard

| Batch | IDs | Scope | Count | Status | Entry dependency |
|---:|---|---|---:|---|---|
| 0 | 0001-0006 | Preflight | 6 | Not Run | QA commit/mapping freeze |
| 1 | 0101-0106 | Tenant onboarding | 6 | Not Run | Disposable tenant approval |
| 2 | 0201-0208 | Organization | 8 | Not Run | Batch 1 |
| 3 | 0301-0308 | Calendars | 8 | Not Run | Batch 2; approved dates |
| 4 | 0401-0410 | Employees/access | 10 | Not Run | Batch 2; persona manifest |
| 5 | 0501-0512 | Leave | 12 | Not Run | Batch 3/4; policy exclusions |
| 6 | 0601-0612 | Attendance | 12 | Not Run | Batch 3/4/5 |
| 7 | 0701-0710 | Documents/notifications | 10 | Not Run | Recipient allowlist; storage limits |
| 8 | 0801-0810 | Salary/readiness | 10 | Not Run | Approved synthetic oracle |
| 9 | 0901-0910 | Payroll | 10 | Not Run | Batches 5/6/8; checker identity |
| 10 | 1001-1010 | Outputs/finance | 10 | Not Run | Batch 9; provider exclusion |
| 11 | 1101-1110 | Reports/import/export | 10 | Not Run | Enabled catalogue approval |
| 12 | 1201-1208 | Lifecycle/history | 8 | Not Run | Policy blockers retained |
| 13 | 1301-1310 | Recovery/security | 10 | Not Run | Maintenance approval where disruptive |
| 14 | 1401-1406 | Cleanup | 6 | Not Run | All executed batches reconciled |

## Readiness Signals

| Signal | State |
|---|---|
| Public HTTPS and health | Green |
| App/database/broker connectivity | Green |
| Migration compatibility | Green |
| TypeScript/Django/static checks | Green |
| Five-portal read-only smoke history | Green, historical evidence only |
| PostgreSQL financial guards | Green locally; fresh staging execution pending |
| SES synthetic delivery | Green with bounce-reconciliation limitation |
| Disposable fixture safeguards | Green on PostgreSQL; SQLite invocation invalid |
| Strict production preflight | Red: five blockers |
| External protected storage | Red |
| Off-host backup and restore | Red |
| Central monitoring/alerts | Red/unverified current state |
| Real provider/payment | Red/disabled |
| Host functional capacity | Amber: one worker only |

## Candidate Changes Awaiting Review

- `web/tests/e2e/db6-payroll-processing.spec.ts`: preserved four-line Actions-tab automation repair.
- `docs/qa/hrms-staging-complete-e2e-test-plan.md`: untracked approved planning artifact.
- `docs/qa/hrms-staging-e2e-workflow-register.csv`: untracked grouped 136-scenario register.
- Four STG-0 deliverables created in this assessment.

No application code, migration, infrastructure, database or scenario status changed in STG-0.

## Next Milestone

Review and commit the exact QA/tooling candidate, then request explicit authorization for the approved execution window and cleanup owner. Do not execute Batch 1 before those gates close.
