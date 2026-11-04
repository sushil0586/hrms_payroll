# HRMS Leave Module Confidence Scorecard

Date: 2026-11-04

Verdict: CONDITIONAL - CORE CONNECTED WORKFLOWS PASS; 95% MODULE GATE REMAINS OPEN

## Scoring method

Scores use the evidence weights defined in `hrms-leave-95-confidence-program.md`:

- Functional browser lifecycle: 25
- API and PostgreSQL integrity: 20
- RBAC and tenant isolation: 15
- Validation and feedback: 10
- Audit and replay/concurrency: 10
- Accessibility and responsive UI: 10
- Recovery, cleanup, and reproducibility: 10

No module can reach 95 while a required P0 scenario lacks executable evidence, a current suite depends on removed fixtures, or a policy decision remains unsigned.

## Module confidence

| Module | Confidence | Complete workflow evidence | Missing evidence preventing 95% |
| --- | ---: | --- | --- |
| Leave types | 94% | Create, duplicate validation, edit, deactivate/archive, referenced-record protection, filters, sorting, pagination, modal/panel controls, RBAC and responsive axe evidence | Concurrent stale edit and complete generated boundary matrix need a current per-ID run |
| Leave policies | 90% | Create/edit, preview, effective dates, archive protection, policy resolution, auto-approval backend, filters, sorting and tenant denial | Full accrual/proration/carry-forward/expiry/restriction matrix and browser worker-timer proof |
| Policy assignments | 88% | Create/edit/deactivate, scope filters, resolution preview, CSV import, overlap handling, foreign-tenant denial and refresh persistence | Replay/crash recovery, full precedence matrix, stale/concurrent writes and historical fixture replacement |
| Leave balances | 97% | Credit/debit validation, maker-checker approve/reject, immutable ledger reconciliation, retry, stale-read prevention, pagination and RBAC | Maintain current regression; no open P0 gap found in canonical scope |
| HR leave requests | 94% | Filters, inspect/review, approval/rejection validation, retry, imports, foreign access denial, responsive and axe evidence | Concurrent reviewer race, complete override matrix and every cancellation reconciliation branch |
| ESS leave application | 93% | Entitlements, complete required validation, date rules, attachment requirement, submit, uncertain outcome handling, filters, details, mobile and persistence | Full hour/portion/calendar/restriction matrix, concurrent overlapping submissions and all policy combinations |
| ESS request lifecycle | 92% | Pending withdrawal, approved cancellation governance, duplicate suppression, durable state and feedback | Every withdrawal/cancellation window, evidence-required branch, payroll-lock interaction and concurrency branch |
| MSS approvals and history | 91% | Approve/reject, missing reason, history, delegation revocation, attachment visibility, keyboard/mobile and authorization | Two-manager approve/reject chains, manager reassignment, >25 history rows, combined identities and permission combinations |
| Attachments and evidence | 86% | Valid/invalid/oversized/spoofed files, private download, employee/tenant denial, version trail and pending-state preservation | Approved replacement/removal/retention policy, expiry/archive lifecycle, protected-storage recovery and full audit evidence |
| Leave year operations | 94% | Period creation, duplicate validation, close preview, maker controls, input lock, worker completion, report reconciliation and tenant denial | Recovery/interruption rehearsal, reopen policy matrix and large-data boundaries |
| Imports | 91% | Valid assignment import, malformed rows, lookup retry, atomic leave-request rollback and audit reconciliation | Crash recovery and durable replay proof for every import family |
| Reports and exports | 92% | Filters, all supported sorting, pagination, complete multi-page export, manifest checks, retry and employee denial | Large-volume performance boundary and complete accessibility/format matrix for every report |
| Notifications | 75% | Backend event contracts, notification queue/review/diagnostics UI and retry controls | Isolated provider delivery, every leave event, recipient allowlist, deduplication, retry exhaustion, template rendering and redaction |
| Audit trail | 93% | Mutation attribution, denied operations, imports, balances, requests and policy operations represented | Complete per-scenario audit reconciliation and central-retention proof are not local-module complete |
| Tenant isolation and RBAC | 97% | Foreign tenant IDs, employee/manager/HR boundaries, maker-checker separation and direct API denial pass | Maintain regression; staging identity qualification remains separate |
| UI consistency and accessibility | 92% | 11/11 static structural surfaces ready; current desktop/tablet/mobile, keyboard, focus restoration and scoped axe checks pass | Full matched visual baseline and accessibility scan for every state of every screen |

Weighted overall local confidence: **90%**.

This is not an average that can override module gates. Each module must independently reach 95%.

## Complete workflow status

| Workflow | Status | Evidence |
| --- | --- | --- |
| HR Admin type -> policy -> assignment -> opening balance | PASS for canonical path | Setup 17/17 and balance 8/8 browser packages plus PostgreSQL reconciliation |
| ESS full-day request -> MSS rejection -> ESS/HR history | PASS | Connected lifecycle browser proof, durable request state, released reservation and feedback |
| ESS request -> MSS approval -> balance reconciliation | PASS for canonical path | Connected action suite and canonical balance/history evidence |
| Pending withdrawal | PASS for canonical configured path | Policy enforcement, duplicate suppression, durable status and balance evidence |
| Approved cancellation | PASS for canonical configured path | Governed cancellation branch and durable history evidence |
| HR request review and retry after transport uncertainty | PASS | 8/8 HR request campaign, retained draft/note and authoritative retry |
| Maker-checker balance action | PASS | Maker restriction, checker rejection non-mutation, approval exactly once |
| Assignment and request imports | PASS for bounded paths | Assignment import and atomic request rollback evidence |
| Leave-year preview -> close -> reconciliation | PASS for canonical path | 11/11 correctness campaign with worker completion and protected inputs |
| Reports -> filters -> paging -> export -> denial | PASS for canonical path | Complete backend-page export and tenant/RBAC checks |
| Two-level Manager 1 approve -> Manager 2 reject | NOT FULLY CERTIFIED | Intermediate-state backend behavior exists; complete browser/API/audit/notification chain remains required |
| Reporting-manager reassignment before/after decision | NOT FULLY CERTIFIED | Historical visibility exists; full governed reassignment matrix remains required |
| Every leave notification through provider delivery | NOT FULLY CERTIFIED | Backend contracts pass; isolated provider campaign remains required |
| Approved document replacement/removal/retention | POLICY AND QA OPEN | Fail-closed behavior remains; Product/QA retention decision is required |
| Worker interruption and import replay recovery | PARTIAL | Bounded idempotency evidence exists; all import/worker families are not complete |

## Verified regression inventory

- Fresh PostgreSQL leave campaign: 107 passed in the latest focused connected run.
- Current HR actions/requests/balances/setup browser group: 53/53 passed.
- Leave setup: 17/17 passed.
- Leave balances: 8/8 passed.
- Balance refresh/retry: 4/4 passed.
- Canonical correctness, reports and leave-year: 11/11 passed.
- Fresh document, integrity, notification and auto-approval PostgreSQL baseline: 48/48 passed.
- Static shared-UI readiness: 11/11 leave surfaces ready for browser certification.
- TypeScript and targeted ESLint: passed.

## Work required to exceed 95% per module

1. Complete the document retention/replacement decision and run the full private-file lifecycle.
2. Run isolated-provider notification coverage for every leave event and retry state.
3. Replace the remaining historical fixture dependencies with repository-owned helpers.
4. Execute the complete policy boundary matrix and assignment concurrency/replay matrix.
5. Execute multi-level MSS decisions, reassignment, pagination, dual identity and scoped-permission combinations.
6. Execute every withdrawal/cancellation policy branch including payroll locks and expired entitlement.
7. Produce matched visual, keyboard, live-region, mobile/tablet and axe evidence for every module state.
8. Reconcile every attempted catalogue ID with API, PostgreSQL, audit, notification and cleanup evidence.
9. Run one uninterrupted canonical connected campaign on a fresh production build.
10. Qualify staging separately after explicit authorization; local scores do not imply staging confidence.
