# HRMS Leave 95% Confidence Program

Date: 2026-11-04

Status: IN PROGRESS

## Execution record

### Baseline gate - 2026-11-04

- Added `pnpm audit:leave-ui`, covering 11 leave-related screen surfaces against the shared structural contract.
- Static UI readiness: **11/11 READY_FOR_BROWSER_CERTIFICATION** after reconciling shared `PageIntro` headers, side-panel details, and read-only report applicability.
- Fresh PostgreSQL 16 document, integrity, notification, and leave auto-approval regression: **48 passed**, 0 failed.
- The three emitted warnings are upstream Django/Python `asyncio.iscoroutinefunction` deprecations.
- These results establish Phase 2 backend readiness. They do not promote attachments or notifications above 95% until browser lifecycle, isolated provider, retention, private-storage, audit, accessibility, responsive, and cleanup evidence is complete.

## Objective

Raise every leave module above 95% evidence-backed confidence while making all leave screens follow the same interaction and visual contract. A score is earned from reproducible evidence, not estimated from test volume.

## Certification rule

A module may report at least 95% only when:

- Every P0 security, tenant-isolation, financial-integrity, and durable-persistence control passes.
- No unresolved Failed case exists.
- Browser behavior is independently reconciled with API and PostgreSQL state for mutations.
- Required audit events identify actor, tenant, resource, action, and outcome without sensitive payloads.
- Desktop, tablet, mobile, keyboard, focus, live-region, and scoped axe checks pass.
- Success, warning, validation, loading, empty, retry, and failure states are truthful and non-duplicative.
- Run-owned tenants, files, jobs, processes, ports, and containers are removed.
- Current canonical tests are reproducible without archived evidence scripts or fixed local ports.

The weighted score is:

| Evidence area | Weight |
| --- | ---: |
| Functional browser lifecycle | 25 |
| API and PostgreSQL integrity | 20 |
| RBAC and tenant isolation | 15 |
| Validation and feedback | 10 |
| Audit and replay/concurrency | 10 |
| Accessibility and responsive UI | 10 |
| Recovery, cleanup, and reproducibility | 10 |

Any failed P0 control caps the module below 95%, regardless of arithmetic score.

## Shared UI contract

Every applicable screen must use the same compact structure:

1. Standard page header with eyebrow, title, supporting copy, summary, and aligned primary action.
2. Explicit filters with Apply and Clear; Enter submits search; dropdown-only changes are included.
3. Table-local loading, stable dimensions, sortable headers, bounded pagination, and a useful empty state.
4. One field message per invalid field and one non-duplicative summary focused on the first correction.
5. Red danger states, orange warnings, green success, and neutral informational states with accessible semantics.
6. One five-second success toast plus a durable header receipt when navigation or dialog closure can hide it.
7. Inspect remains a side panel unless the workflow requires a modal decision; Edit/Create use consistent forms.
8. Close, Cancel, Save, Remove, Approve, Reject, Withdraw, retry, pagination, and ellipsis actions are keyboard operable and tested.
9. Disabled controls use disabled semantics and a not-allowed cursor; no false success or duplicate submission.
10. Tables remain contained on mobile/tablet and expose a labelled keyboard-scroll region.

## Module gates and execution order

| Order | Module | Current confidence | Primary gap to 95% | Required closure |
| ---: | --- | ---: | --- | --- |
| 1 | Attachments and evidence | 86% | Retention/removal and private-storage lifecycle | Replacement, approval, expiry, archive, download denial, cleanup and audit campaign |
| 2 | Notifications and email | 75% | Provider delivery and event coverage | Isolated provider simulation, retry/idempotency, recipient policy, templates and event matrix |
| 3 | Policy assignments | 88% | Historical browser contracts and overlap evidence | Current fixture, stale/concurrent updates, assignment precedence, imports and audit |
| 4 | MSS approvals/history | 91% | Multi-level and reassignment history branches | Approve/reject chains, reassignment, pagination, combined identities and denial branches |
| 5 | Leave policies | 90% | Complete boundary and visual evidence | Entitlement, carry-forward, expiry, negative balance, effective dates and consistent UI |
| 6 | ESS leave | 93% | Exhaustive lifecycle and attachment policy | Apply, edit where supported, withdraw/cancel, evidence, refresh, retry and mobile |
| 7 | Leave types | 94% | Full validation/sort/page boundary matrix | Duplicate/invalid values, archive protection, filters, feedback and panel lifecycle |
| 8 | HR leave requests | 94% | Concurrent review and recovery branches | Override, retry, stale decision, imports, audit and reconciliation |
| 9 | Leave year | 94% | Recovery and large-data boundaries | Close/reopen policy, lock protection, retry, pagination and reconciliation |
| 10 | Leave balances | 97% | Maintain regression confidence | Preserve maker-checker, replay, stale reads, history and tenant denial |
| 11 | Reports and exports | 92% | Full export/accessibility matrix | Sort/filter/page/export completeness, failure retry and tenant denial |

Current confidence values are baselines, not promoted verdicts. They change only after the required evidence is recorded.

## Phases

### Phase 1 - Contract and harness closure

- Replace removed evidence-directory fixtures with repository-owned helpers.
- Remove fixed ports and unauthenticated proxy assumptions.
- Tag historical superseded suites and map each contract to a current canonical test.
- Run `pnpm audit:leave-ui` and resolve every static REVIEW finding before visual certification.

### Phase 2 - Documents and notifications

- Certify the complete employee-document lifecycle and approved retention policy.
- Certify every leave notification event with an isolated provider, retry, deduplication, recipient, redaction, and audit evidence.
- Do not use real employee documents or external recipients.

### Phase 3 - Configuration and assignment

- Certify leave types, policies, assignments, balances, and leave-year operations.
- Cover create/read/update/archive, validation, conflict resolution, concurrency, effective dates, imports, maker-checker, and tenant isolation.
- Capture matched desktop/tablet/mobile screenshots for every administration screen.

### Phase 4 - Connected ESS and MSS lifecycle

- Execute HR Admin configuration -> ESS request -> MSS decisions -> ESS withdrawal/cancellation -> HR reconciliation.
- Include multi-level approval, mixed ESS/MSS identity, manager reassignment, pagination, filters, browser history, API failure, and empty states.
- Reconcile every mutation with API, PostgreSQL, audit, and notification evidence.

### Phase 5 - Reports, resilience, and staging gate

- Certify reports/exports, large data, stale pages, interrupted reads, idempotent retries, and cleanup.
- Run the complete canonical campaign on a fresh production build and isolated PostgreSQL.
- After separate authorization, execute a bounded staging campaign; local evidence alone cannot establish staging confidence.

## Required QA record per scenario

- Stable scenario ID and exact acceptance contract.
- Persona, tenant, run ID, application revision, and fixture reference.
- Browser action, exact feedback, accessibility result, and responsive viewport.
- Authenticated API request/status and PostgreSQL before/after state.
- Audit and notification references where applicable.
- RBAC and tenant-isolation result.
- Replay/concurrency/recovery result where applicable.
- Exact-ID cleanup result and final verdict.

## Exit criteria

- Every module scores at least 95 with all P0 controls passed.
- No current canonical suite depends on removed artifacts.
- All leave pages pass the shared UI contract and visual review.
- One connected local campaign passes without retries hiding failures.
- Remaining policy decisions have named Product and QA approval.
- Staging is reported separately and only after actual authorized execution.
