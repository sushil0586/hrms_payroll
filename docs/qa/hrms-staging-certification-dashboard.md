# HRMS/Payroll Staging Certification Dashboard

Last updated: 2026-10-27
Environment: synthetic-only Lightsail staging
Deployed commit: `20d832996ef505f0b6c2df2673204e841e7b6a52`

## Current Decision

| Gate | Decision |
|---|---|
| STG-0 readiness | **CONDITIONAL** |
| STG-0D automation remediation | **PASS** locally |
| STG-1A tooling | **PASS** locally: ownership manifest, exact-ID evidence and governed cleanup verified |
| STG-1B candidate freeze | **PASS** for the reviewed candidate; superseded by the authorized 41-file STG-1C commit |
| STG-1C commit/operations | **CONDITIONAL**: 41-file QA candidate committed locally at `7a55b33e`; no push/deployment occurred |
| STG-1D operational closure | **BLOCKED**: fresh provenance access, tenant-limited evidence access, fingerprint settings, email isolation, off-host restore, and approvals incomplete |
| STG-1E access/security remediation | **CONDITIONAL**: AWS identity restored and local fingerprint/email controls pass; Lightsail IAM, SSH, evidence API, recovery, deployment and approvals remain blocked |
| STG-1F evidence/access closure | **PASS locally**: all six browser workflows passed with independent tenant-safe evidence API assertions; Lightsail/SSH provenance, deployment, recovery and staging execution approvals remain blocked |
| STG-1G release-candidate freeze | **BLOCKED, superseded by STG-1G.1**: fresh 6/6 browser and 36/36 PostgreSQL checks passed, but the original candidate used vulnerable `next@15.5.24`; no commit or deployment |
| STG-1G.1 dependency remediation | **BLOCKED**: Next.js upgraded to 15.5.28; audit reduced to 0 critical/1 high/0 moderate; unresolved Expo CLI `node-forge` advisory has no patched release or approved disposition |
| STG-1G.2 node-forge disposition | **APPROVAL REQUIRED**: no web bundle execution path was found, but `node-forge@1.4.0` is physically present via Expo tooling in the web runtime image; temporary web-only staging acceptance is recommended but not approved; mobile/EAS remains blocked |
| 136-scenario local campaign | **CONDITIONAL**: 131 Local Passed, 0 Failed, 5 Blocked and 0 Not Run/incomplete. Batch 13 recovery/security and Batch 14 governed teardown passed locally; the five policy/provider blockers remain unchanged. These local results do not change staging statuses. |
| STG-1 Batch-1 entry | **BLOCKED**, QA candidate is local-only and staging mutation authorization is absent |
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

Local isolated accounting is maintained separately in `hrms-stg136-local-functional-certification.md`: 131 Passed, 0 Failed, 5 Blocked and 0 Not Run/incomplete. All shared-staging statuses below remain unchanged.

STG-1D reconfirmed public HTTPS and backend health only. AWS credentials were unavailable and known SSH keys were rejected, so the recorded application SHA `20d832996ef505f0b6c2df2673204e841e7b6a52`, backend digest `sha256:e4fcf34a080973cf02bbf1341ab57251c5a827e9782dabd6b8eff169fc12337b`, and web digest `sha256:03bb370c78bf7097c3acdf364443523936084ec183e921580484dc047c061c7a` remain historical rather than fresh STG-1D evidence. No frozen scenario was executed.

## Automation Mapping Readiness

| Classification | Count |
|---|---:|
| Fully Mapped | 114 |
| Partially Mapped | 13 |
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

Batch 1 covers `STG-E2E-0101` through `0106`. Integrated STG-1F local verification passed all six browser workflows in 28.7 seconds with the evidence API required, followed by `42 passed` PostgreSQL/security regressions and independent database reconciliation. STG-1G independently reran all six in 20.9 seconds and passed 36 currently collected PostgreSQL tests, but found a critical Next.js dependency advisory. All six remain `Not Run` on staging: the source is uncommitted/undeployed, the security and operational blockers remain, and no staging mutation window has been authorized.

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
| 14 | 1401-1406 | Cleanup | 6 | Local Passed; staging Not Run | Governed local teardown and zero-residue evidence completed |

## Readiness Signals

| Signal | State |
|---|---|
| Public HTTPS and health | Green |
| AWS caller identity | Green; expected staging operator verified |
| Lightsail inventory / host SSH | Red: IAM `GetInstances` denied and known keys rejected |
| App/database/broker connectivity | Green |
| Migration compatibility | Green |
| TypeScript/Django/static checks | Green |
| Five-portal read-only smoke history | Green, historical evidence only |
| PostgreSQL financial guards | Green locally; fresh staging execution pending |
| SES synthetic delivery | Green with bounce-reconciliation limitation |
| Tenant-safe Batch-1 evidence API | Green locally: integrated browser 6/6 and PostgreSQL/security 42/42; disabled by default and not deployed |
| Runtime dependency audit | Amber/red: Next.js 15.5.28 closes critical runtime findings; one high Expo CLI `node-forge` advisory remains open. Web bundle reachability was not found, but the package is physically present in the web image; security-owner exception approval or image/toolchain remediation is required |
| Disposable fixture safeguards | Green on PostgreSQL; SQLite invocation invalid |
| Strict production preflight | Red: five blockers |
| External protected storage | Red |
| Off-host backup and restore | Red |
| Central monitoring/alerts | Red/unverified current state |
| Real provider/payment | Red/disabled |
| Host functional capacity | Amber: one worker only |

## Candidate And Working Tree

- QA/tooling candidate: committed locally as `7a55b33e20bfc5ba34f2c15017edd271c2092664`; not pushed or deployed.
- `web/tests/e2e/db6-payroll-processing.spec.ts`: preserved separate four-line Actions-tab automation repair, unchanged at diff SHA-256 `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`; unstaged and uncommitted.
- STG-1D adds documentation and dashboard reconciliation only; no application, migration, infrastructure, database, or scenario status changed.
- STG-1E adds local-only fingerprint and staging email controls with PostgreSQL/email regression evidence; nothing was deployed.
- STG-1F adds the local-only bounded evidence API, PostgreSQL security tests and opt-in Playwright integration; the application candidate has no new immutable SHA and remains undeployed.
- STG-1F integrated local verification completed browser-to-API-to-PostgreSQL evidence for all six frozen onboarding scenarios; staging counts remain unchanged at 136 `Not Run`.
- STG-1G prepared an exact 32-file manifest but did not approve or commit it because the dependency audit found a critical Next.js advisory. Fresh local browser and PostgreSQL checks do not change staging scenario status.
- STG-1G.1 prepared a 36-file manifest, upgraded Next.js to 15.5.28, passed 6/6 browser and 36/36 PostgreSQL checks, and reduced audit findings to one high Expo CLI advisory. No staging result or authorization changed.
- STG-1G.2 reproduced the raw 0 critical/1 high/0 moderate audit, verified no `node-forge` match in the production Next.js artifact, confirmed unnecessary physical presence through Expo tooling in the web runtime image, and left mobile/EAS Not Verified after the Android export failed before bundling. The recommended temporary web-only exception is not approved.
- Functional recovery closed fiscal authorization/dialog automation, ESS reauthentication, MSS browser authentication, employee feedback/confirmation drift, browser-session API verification and payroll same-route query navigation. Fiscal Playwright passed 2/2, payroll processing/output passed 1/1 in 55.9 seconds, DD6 passed 3/3, employee production passed 1/1, roster compact passed 1/1, and focused PostgreSQL payroll regressions passed 26/26. Payroll, payslip, register, bank advice and finance handoff reconcile to INR 50,000.00; remaining Batch 9/10 negative and failure-recovery IDs are incomplete.
- Batch 2 now uses `stg136-batch2-organization.spec.ts` instead of mock-only evidence. Eight browser scenarios passed in 46.2 seconds with exact authenticated API and PostgreSQL reconciliation, transactional organization audit rows, real cross-tenant/RBAC denials, protected-history behavior and complete two-tenant teardown. The additive audit migration and application changes are local-only and undeployed.
- Batch 3 is locally complete at 8/8. The dedicated `stg136-batch3-calendar-closure.spec.ts` closed `0305` and `0306` with real leave-year and payroll-setup forms, exact API/PostgreSQL IDs, four transactional actor audit events, overlap/cross-tenant/RBAC denials, 32/32 focused backend regressions and governed cleanup. Shared staging remains 136 Not Run.
- Batch 4 is locally complete at 10/10. The dedicated `stg136-batch4-employee-access-history.spec.ts` closed the remaining six IDs with production-build browser actions, authenticated API checks, exact PostgreSQL history/audit reconciliation, 13/13 focused backend regressions and governed cleanup. Shared staging remains 136 Not Run.
- Batch 5 is locally complete at 12/12. Production-built browser suites passed 12/12 and focused PostgreSQL/API/ledger/concurrency tests passed 48/48. Effective policy configuration, ESS submission, MSS approval/rejection, cancellation restoration, overlap/insufficient-balance/cross-tenant denials, expiry protection and append-only ledger reconciliation passed. Shared staging remains 136 Not Run.
- Batch 6 is locally complete at 12/12. Production-built browser coverage passed configuration, ESS/MSS regularization and monthly-close workflows; focused PostgreSQL/API attendance, roster, concurrency and payroll-input regressions passed 61/61. Shared staging remains 136 Not Run.
- Batch 7 is locally 9 Passed and 1 Blocked; `0710` needs live SES/private-storage evidence. Batch 8 is 9 Passed and 1 Blocked; `0804` needs approved statutory rules. Batch 9 is locally complete at 10 Passed. Batch 10 is 9 Passed and 1 Blocked; `1010` needs external provider/storage interruption evidence. Shared staging remains 136 Not Run.
- Batch 11 is locally 9 Passed and 1 Blocked. Source fingerprints, actor-attributed batch outcomes, per-row idempotency, canonical replay and concurrent duplicate prevention passed in the production browser and PostgreSQL; `1110` remains blocked pending an approved crash-recovery contract.
- Batch 12 is locally 7 Passed and 1 Blocked. Production lifecycle browser coverage passed 1/1 plus 6/6 neighboring authority/history journeys; focused PostgreSQL lifecycle, RBAC, concurrency and history regressions passed 23/23. `1208` remains blocked because pending-request reassignment policy is unapproved. Shared staging remains 136 Not Run.

No application code, migration, infrastructure, database or scenario status changed in STG-1D.

## Next Milestone

Name the security owner and either approve the exact STG-1G.2 time-limited web-only exception (with expiration and remediation ticket) or require removal of Expo dependencies from the web runtime image. Mobile/EAS remains outside the candidate.

## Final Local Closure (2026-10-27)

- Frozen scope reconciled as 136 IDs in 14 execution batches plus Batch 0 preflight.
- Local result: **131 Passed / 0 Failed / 5 Blocked / 0 incomplete**.
- Shared staging result remains **0 Passed / 0 Failed / 136 Not Run**.
- Blockers remain `0710`, `0804`, `1010`, `1110`, and `1208`; none was converted without policy or external evidence.
- Representative PostgreSQL validation preserved payroll immutability and identified a legacy seed-cleanup conflict with protected history. Cleanup now retains protected notification and payroll access history and reports retained counts; no database guard was weakened.
- TypeScript, focused ESLint, Django checks, migration drift and the Next.js 15.5.28 production build passed. The raw dependency result remains 0 critical / 1 high (`GHSA-86w9-cpqp-85rv`).
- Candidate remains uncommitted and undeployed. The separate payroll Playwright repair remains excluded with diff SHA-256 `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.
