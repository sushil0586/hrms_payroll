# HRMS 136-Scenario Local Functional Certification

Date: 2026-10-27\
Source revision: `7a55b33e20bfc5ba34f2c15017edd271c2092664` plus the reviewed, uncommitted STG-1E/F/G candidate changes\
Environment: task-owned PostgreSQL 16, Redis 7, Django, Celery and production-built Next.js browser runner\
Decision: **CONDITIONAL overall; all locally executable functional scenarios completed**

## Status Accounting

The frozen staging register remains unchanged: **0 Passed, 0 Failed, 136 Not Run** on shared staging.

Local results use the full frozen evidence contract. Only IDs with completed browser, API, PostgreSQL, ownership and cleanup evidence are counted as Local Passed.

| Local status | Count |
|---|---:|
| Passed | 131 |
| Failed | 0 |
| Blocked | 5 |
| Not Run / incomplete per-ID evidence | 0 |
| **Total** | **136** |

The recovery pass closed all four original execution blockers. Payroll completed through browser-created run, input lock, durable calculation, review submission, approval, final lock, output generation/publication, finance handoff and ESS payslip download. Twelve payroll/output IDs now have complete local evidence; negative, concurrency and failure-recovery IDs remain incomplete.

## Batch Results

| Batch | IDs | Local result | Executed evidence and disposition |
|---:|---|---|---|
| 0 | 0001-0006 | **6 Passed locally** | Existing STG-0 through STG-1G local preflight, build-provenance, evidence-API, security and recovery checks satisfy the local contract. Deployed TLS, backup, monitoring and external-service certification remain staging gates and are not inferred from this result. |
| 1 | 0101-0106 | **6 Passed** | Playwright 6/6; evidence API 6/6; focused PostgreSQL/security/tooling 42 passed; tenant ownership, enterprise entitlement, audit events, negative tenant absence and exact-ID cleanup verified. |
| 2 | 0201-0208 | **8 Passed** | Production-built Playwright 8/8; independent API and PostgreSQL evidence confirmed tenant-owned structure, dependency mappings, duplicate/cycle/cross-tenant/RBAC denials, protected history, transactional audit events and governed cleanup. |
| 3 | 0301-0308 | **8 Passed** | `0305` and `0306` closed through production-built browser forms with authenticated API, exact-ID PostgreSQL, tenant/RBAC, overlap, cross-tenant, configuration-snapshot and actor-audit evidence. All eight Batch 3 IDs are locally passed. |
| 4 | 0401-0410 | **10 Passed** | All ten IDs passed. The final six-ID production-build run covered browser-created Employee B, manager-role provisioning, real login/MSS routing, scoped ESS profile updates, HR-field and cross-tenant denials, PostgreSQL overlap guards, and future effective-dated manager/department history. |
| 5 | 0501-0512 | **12 Passed** | Production-build browser configuration and ESS/MSS workflows passed 12 tests across the connected and ESS suites; 48 PostgreSQL/API/ledger/concurrency regressions passed. Opening, reservation, consumption, rejection, cancellation reversal, carry-forward, expiry, RBAC and tenant isolation reconciled. |
| 6 | 0601-0612 | **12 Passed** | Production-built browser configuration, ESS/MSS regularization and monthly-close workflows passed; 61 PostgreSQL/API derivation, roster, concurrency, RBAC, immutable-close and payroll-input regressions passed. |
| 7 | 0701-0710 | **9 Passed; 1 Blocked** | Focused browser closure passed category/requirement creation and distinct verify/reject decisions. Live SES and external protected storage remain blocked. |
| 8 | 0801-0810 | **9 Passed; 1 Blocked** | Salary history, overlap prevention, cross-tenant rejection and deterministic readiness passed. `0804` remains blocked pending approved statutory rules. |
| 9 | 0901-0910 | **10 Passed** | Duplicate regular run, locked-input mutation, maker self-approval and stale replay were rejected; a distinct checker approved and the final-locked payroll reconciled exactly. |
| 10 | 1001-1010 | **9 Passed; 1 Blocked** | Browser output generation/publication, ESS payslip access, checksums, register, bank advice and finance handoff passed. `1010` requires external provider/storage interruption evidence. |
| 11 | 1101-1110 | **9 Passed; 1 Blocked** | Browser reports/exports and governed import replay passed. Tenant-scoped source identity, canonical retry and concurrent duplicate prevention are verified; `1110` remains blocked by the unapproved crash-recovery contract. |
| 12 | 1201-1208 | **7 Passed; 1 Blocked** | Browser/API/PostgreSQL effective history, future projection, authority, archive/deactivation and cross-tenant safe-denial evidence passed. `1208` remains blocked pending reassignment policy. |
| 13 | 1301-1310 | **10 Passed** | Production-built browser 5/5 and PostgreSQL/API/security/concurrency 21/21 passed. Session, tenant denial, canonical replay, durable jobs, bounded retries, stale-worker recovery and secret-safe audit evidence reconciled. |
| 14 | 1401-1406 | **6 Passed locally** | Final ownership manifest, pre-cleanup inventory, governed teardown, zero-residue checks and isolated resource/restart/error samples passed. Shared-staging operational certification remains separate. |

## Executed Evidence

### Batch 1

- Browser: `web/tests/e2e/stg0d-batch1-onboarding.spec.ts`, 6 passed with one worker.
- Independent evidence: `manage_staging_onboarding_run evidence` confirmed exact tenant identity, enterprise entitlement, creation/update/first-admin audit events and negative-tenant absence.
- Backend/security: 42 passed across onboarding integrity, staging tooling, email isolation and tenant-safe evidence API tests.
- Neighboring PostgreSQL integrity regression: 19 passed across fiscal periods, attendance close, payroll configuration and payroll adjustments. An initial accidental SQLite invocation failed during migration on PostgreSQL-only trigger SQL and was discarded; the explicit PostgreSQL 16 rerun is the counted result.
- Cleanup: exact seed reference cleanup completed and `verified_absent=true`.

### Fiscal workflow recovery

- Root cause: the disposable tenant-admin fixture lacked the explicit close/reopen permissions required by the existing authorization contract, and the browser test had not handled the governed reason-confirmation dialog.
- The fixture now grants only `finance.periods.close` and `finance.periods.reopen`; the employee persona remains denied.
- Playwright passed 2/2 in 8.8 seconds. PostgreSQL showed tenant and legal-entity calendars, `2026-04` reopened with `reopen_count=1`, and two immutable status events.
- Focused PostgreSQL backend/API regression passed 16/16 across fiscal authorization and staging cleanup/tooling.

### Organization and legal-entity workflow

- `STG-E2E-0201`-`0208` ran as eight serial browser tests against production-built Next.js, Django and PostgreSQL 16; all eight passed in 46.2 seconds.
- Browser-created records were independently read through authenticated backend APIs and then reconciled directly in PostgreSQL. Branch-to-legal-entity/location, department-to-business-unit, cost-center-to-legal-entity and designation-to-grade IDs matched exactly.
- Duplicate department creation returned HTTP 400 and left exactly one case-insensitive code match. An indirect business-unit cycle returned HTTP 400 and left the parent unchanged.
- A real second-tenant legal-entity UUID was absent from browser options and rejected by the API. An ESS identity received HTTP 403 for organization mutation. Neither attempt left a database row or cross-tenant foreign key.
- An unused location was deactivated. The fixture legal entity remained active because linked employees/branches/cost centers produced the expected protected-history rejection.
- Organization writes now create transactionally coupled `OrganizationAuditEvent` rows with tenant, actor, section, item, action and before/after state. The run reconciled 15 events, including create, update and deactivation.
- Focused organization/API/PostgreSQL regression passed 23/23: 11 import/hierarchy/retention tests and 12 API/RBAC/dependency tests. TypeScript, focused ESLint, Django checks, migration drift and the production frontend build passed.
- The first browser attempt exposed locator drift for required-field labels; the second exposed response-body loss after deliberate document navigation. Both were automation-only failures. The final run reads the canonical created resource through the authenticated API and passed 8/8.
- Governed teardown removed both disposable tenants and all task-owned containers/processes; final tenant absence and closed ports were verified.

### Calendar workflow closure

- `STG-E2E-0305` created legal-entity-scoped leave period `STG3-LY-20261027D` through `/hr-admin/leave-year`; API and PostgreSQL agreed on period `f7464ab8-b16a-4fe9-b4c1-bd529d29d7e8`, policy snapshot, dates and tenant ownership.
- `STG-E2E-0306` created calendar `80636784-cdc4-4262-bf9f-a2827a6b204c`, period `0e022049-3932-489e-b3a1-3d8ac5fc6f50` and pay group `c9c6b9f2-ef6f-4d23-b938-afc466047429` through `/hr-admin/payroll-setup`; period and group both reference the browser-created calendar.
- Overlap returned HTTP 409, real foreign-tenant references returned HTTP 400, ESS mutation returned HTTP 403, and PostgreSQL confirmed zero rejected-operation rows.
- Configuration creation now writes one transactionally coupled tenant/actor/resource audit event per leave period, payroll calendar, payroll period and pay group. The final run reconciled exactly four expected events.
- Production-built Playwright passed 2/2 in 28.8 seconds. Focused PostgreSQL calendar/payroll regression passed 32/32; TypeScript, focused ESLint, Django checks, migration drift and production build passed. Historical runner/fixture failures remain in evidence and were not counted.

### Employee onboarding and access closure

- `STG-E2E-0402`, `0405`, `0406`, `0407`, `0409`, and `0410` passed as six serial browser workflows in 32.5 seconds against production-built Next.js, Django and PostgreSQL 16. Together with the four previously certified IDs, Batch 4 is 10/10 locally passed.
- Employee B was created through the HR Admin wizard with persisted legal entity, branch, business unit and department ownership. PostgreSQL confirmed an effective-dated baseline assignment and a separate planned 2030 assignment.
- HR Admin updated Manager A access through the browser; API and PostgreSQL confirmed active membership plus the manager role. Manager A used the real login form, opened MSS approvals, and received HTTP 403 from the HR employee API.
- The confirmed self-service gap was remediated narrowly: employees may edit preferred name, personal email and phone, while legal name, work email, employment, organization, payroll and statutory fields remain server-denied. Each committed update writes an immutable employee lifecycle audit event.
- A real foreign-tenant department was absent from browser options and rejected by the API. PostgreSQL concurrency/history regressions rejected overlapping and cross-tenant employment assignments.
- The 2030 manager/department movement created a planned assignment while the current employee projection and pre-2030 assignment remained unchanged. The first response-body and owner-option failures were automation drift; the final exact-label run is the counted result.
- Focused PostgreSQL regressions passed 13/13; the profile-specific subset passed 2/2. TypeScript, focused ESLint, Django checks, migration drift and production build passed.

### Leave lifecycle closure

- `STG-E2E-0501`-`0512` passed against isolated PostgreSQL 16. HR Admin created the leave type and effective carry-forward policy through production-built browser forms; ESS submitted requests and MSS approved/rejected through actual controls.
- The ESS suite passed 9/9 and the connected Batch 5 suite passed 3/3. Focused PostgreSQL/API/ledger/concurrency regressions passed 48/48.
- The 12.00 opening balance, 0.50 reservation/withdrawal, 1.00 consumption/cancellation reversal, rejected-request no-op, 18-to-10 carry-forward and 8.00 forfeiture examples reconciled without duplicate or mutable ledger effects.
- Cross-tenant, unauthorized-manager, insufficient-balance, overlap, closed-period and unsafe post-expiry mutations were rejected. The unresolved product policy was not loosened; the safe restriction is the certified behavior.

### Attendance, roster and monthly-close closure

- `STG-E2E-0601`-`0612` passed locally using production-built browser workflows plus independent PostgreSQL 16 evidence.
- Browser evidence covered regular and overnight shift creation, weekly off, holiday/policy visibility, ESS correction submission and recovery, MSS approve/reject, duplicate prevention, monthly reconciliation, approval and close.
- PostgreSQL/API regressions passed 61/61 and independently proved derivation precedence, roster rollout rollback/replay, payable/LOP reconciliation, concurrent decisions, close/reopen protection, tenant isolation and payroll-input snapshot linkage.
- The first run's production demo-data preflight failure and the authenticated request-context mismatch are retained as historical automation/environment evidence. Final reruns passed after a test-only same-origin request correction.

### Documents and notifications

- Nine Batch 7 IDs passed locally. Production-built browser document workflows completed all existing coverage plus a focused 2/2 closure run; notification workflows passed 3/3.
- PostgreSQL/API/email/Celery coverage passed 35/35. Exact recipient allowlisting, To/CC/BCC denial, bounded retry, duplicate suppression, cross-scope denial, private download and physical-object cleanup passed.
- `0701` and `0705` now pass through real HR browser actions with canonical API/PostgreSQL evidence. `0710` remains externally blocked: local capture does not certify live SES or private object-storage infrastructure.

### Salary and statutory configuration

- Browser salary/payroll setup CRUD passed 2/2 together; the readiness/input-blocker journey passed 1/1 against the production build.
- The final focused salary/readiness/RBAC PostgreSQL selection passed 8/8. Explicit period dates removed the readiness fixture's wall-clock dependency.
- Browser-created salary component, structure, version, line and assignment writes reconciled to ten actor-attributed audit events. Failure injection proved audit-write failure rolls back the salary mutation.
- `0801`-`0803` and `0805`-`0810` pass locally. `0804` remains blocked by the unapproved statutory specification.
- The versioned oracle approves deterministic non-statutory arithmetic only. Statutory configuration remains blocked pending qualified owner approval.

### Batch 9 connected payroll

- The protected production-browser workflow passed 1/1 in 1.3 minutes with its diff checksum unchanged.
- Browser and PostgreSQL evidence proves run creation, one locked input, one durable calculation, refresh restoration, review submission, approval/final lock and exact INR 50,000 gross/net reconciliation.
- Four Celery jobs succeeded in one attempt with exact completed counts for calculation, generation, publication and finance handoff.
- `0901`, `0902`, `0905`, `0906`, `0907`, `0909` and `0910` pass locally. `0903`, `0904` and `0908` remain incomplete pending exact negative browser evidence and a distinct checker identity.

### Payroll workflow recovery

- Root causes included a development runner that did not dispatch reliably, a missing covering accounting period, absent Celery beat, and stalled Next.js same-route query transitions on payroll review/output links.
- Payroll query tabs and output-batch selection now use explicit document navigation. The separately modified payroll test was not changed; its diff SHA-256 remained `8befa44fdf26f010e0995193a70ed41a31421df4c03d4920ba5610628c11cebb`.
- Production-built Playwright passed 1/1 in 55.9 seconds after the April 2026 fiscal prerequisite passed 2/2. Run `DB610_1793073327697` (`34ee1da9-9416-4f4d-83ae-d4beec38f60c`) is final locked; calculation `20aa1e88-5553-44c1-b101-9af4ea070a35` completed; review `6e01ac0e-057b-409f-a4db-b3a87740bfef` is locked.
- Independent PostgreSQL reconciliation found gross INR 50,000.00, deductions INR 0.00 and net INR 50,000.00 across calculation, review, published batch, payslip, register, bank advice and finance handoff. Five artifacts have SHA-256 checksums and the handoff posts to the April 2026 accounting period on 2026-04-30.
- Celery recorded four succeeded terminal jobs: calculation 1/1, output generation 1/1, publication 2/2 and finance handoff 3/3; each completed in one attempt with no error code.
- PostgreSQL payroll/configuration/concurrency regressions passed 26/26. An accidental SQLite invocation produced 10 PostgreSQL-trigger migration errors and was discarded; 16 SQLite-compatible tests passed in that uncounted invocation.

### Recovery/security regression

- ESS logout/relogin now uses the real login form in a fresh browser page and passed protected-route recovery without prior-session data leakage.
- Lost-response replay returned the canonical success with exactly one leave mutation.
- MSS now authenticates through the real browser login path and passed manager/employee scoped-context assertions.

### Additional eligible browser regressions

- Employee production certification: 1/1 passed in 25.8 seconds after aligning current feedback text, accepting explicit access confirmations, and using browser-session API verification.
- Roster/shift compact regression: 1/1 passed in 8.0 seconds after replacing the unauthenticated standalone request context with the active browser session.
- TypeScript and focused ESLint passed; Django checks passed; migration drift was zero.
- A first backend invocation accidentally selected SQLite and was discarded because PostgreSQL-only trigger SQL correctly failed there. The explicit PostgreSQL 16 rerun passed 16/16.
- Governed cleanup removed the connected tenant plus two earlier interrupted DD6 workspaces; the final `pw-qa-%` tenant count was zero. Django, Next.js, Celery worker/beat, PostgreSQL and Redis task-owned processes/containers were stopped.

## Findings

- No cross-tenant leak, unauthorized administrator creation, duplicate committed leave, payroll corruption or unexplained financial discrepancy was observed.
- The only fully certified local batch is onboarding (`0101`-`0106`).
- Batch 2 organization coverage is PostgreSQL-valid through the new exact-ID suite; the older mock suite remains UI-only evidence and is no longer the Batch 2 certification source.
- Fiscal close permissions, ESS recovery, MSS authentication and payroll Actions integration are closed.
- The separate modification in `web/tests/e2e/db6-payroll-processing.spec.ts` remained untouched and uncommitted.
- `GHSA-86w9-cpqp-85rv` remains open in the security backlog; audit suppression was not introduced.

## Release Impact

Local accounting is now **131 Passed / 0 Failed / 5 Blocked / 0 Not Run or incomplete**. The five unchanged blockers are `0710`, `0804`, `1010`, `1110` and `1208`. Shared staging remains **0 Passed / 0 Failed / 136 Not Run**, and production payroll remains **NO-GO**.
