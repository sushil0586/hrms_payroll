# HRMS Employee Lifecycle Gap Audit and Delivery Plan

Date: 2026-11-05
Audited revision: `0852d176ee8eb8d958515ea4ba05fa34ea1d6d3c`
Audit type: source and evidence reconciliation; no new execution claimed.

Execution detail: see [Employee Lifecycle Development and Certification Plan](hrms-employee-lifecycle-development-certification-plan.md).

## Sources reviewed

- Employee Management makeover phases 1-6 and their stated acceptance boundaries.
- DB-5 lifecycle transition matrix and DB-6.6 employee lifecycle certification.
- Employee, lifecycle, organization-linked models and effective assignment services.
- HR Admin employee directory, master form, access, bank, imports, onboarding, movements, and exits routes.
- Existing employee and lifecycle API permission gates and focused test locations.

## Current capability map

| Capability | Source/evidence status | Gap disposition |
| --- | --- | --- |
| Employee directory, filters, detail, responsive composition | Implemented and extensively covered by prior makeover evidence | Reconcile on current candidate; add exhaustive sort/page/API-failure cases |
| Employee create/edit wizard | Implemented with field mapping, pending guard, dirty confirmation, and API error handling | Re-execute all field boundaries, duplicate/replay, stale update, and atomic employee/spell/assignment proof |
| Tenant-scoped options and relationship validation | Implemented in UI/API layers with historical focused evidence | Full foreign-reference matrix and every hierarchy combination not yet current-candidate certified |
| Access maintenance | Separate permission `employees.access.manage`; UI and API exist | Fresh-session revocation, privilege escalation, last-admin, inactive/exit linkage need joined proof |
| Bank accounts | UI/API/import paths exist; masking and primary behavior have historical evidence | Concurrent primary changes, uncertain saves, complete RBAC matrix, and payout verification policy remain to certify |
| Employee import | Template/preview/commit UX and client validation exist | Durable server replay and full partial-failure/atomicity contract are not established |
| Bank import | Implemented preview/commit path | Same durable replay and sensitive-evidence certification required |
| Reporting-manager import | Implemented | Existing evidence states effective date/reason are preview-only and updates are immediate; this conflicts with the lifecycle contract |
| Onboarding | Model, list/create/edit routes, statuses, owner/checklist fields exist | Full transition guard, ESS/MSS visibility, duplicate, audit rollback, and notification proof are incomplete |
| Probation review | Model exists | No corresponding first-class employee lifecycle UI/API route was identified in the audited frontend route set |
| Effective assignments and movements | Effective spell/assignment models, DB guards, service, and HR movement UI/API exist | Future activation mechanism, stale approval, correction workflow, and complete MSS joined evidence require work |
| Same-tenant transfer/promotion | Historically passed with PostgreSQL reconciliation | Must be reconciled against current candidate and expanded to all movement types |
| Cross-legal-entity transfer | Explicitly rejected | Blocked pending continuity policy; correct fail-closed behavior |
| Retroactive correction | Model can reference correction | Administrative correction workflow and approval policy absent |
| Exit | Model and HR list/create/edit routes exist | End-to-end approval/clearance/completion orchestration with access and downstream dependencies is not fully certified |
| Rehire | Multiple spells can represent it | Explicitly blocked; no approved identity/tenure/leave/payroll/statutory continuity policy |
| Hard delete | API rejects and DB protection historically verified | Retain and rerun as destructive negative regression |
| Audit | Lifecycle records and broader audit infrastructure exist | Joined per-operation redacted before/after, denied-event, and audit-writer-failure proof is incomplete |
| Notifications | Product notification infrastructure exists | Event-by-event employee lifecycle recipient and retry mapping is not yet demonstrated |
| Accessibility/mobile | Strong makeover evidence for selected surfaces | Actual screen-reader/physical-device evidence and full lifecycle pages remain outside prior acceptance |

## Confirmed gaps requiring development

### G1. Reporting-manager import is not effective-dated

The Phase 6 closure retains EM-P5-H01: manager date and reason are preview-only while updates are immediate. Manager assignment changes must use the same effective-dated history contract as interactive reporting changes. Development must persist the effective date, reason, source reference, actor, and resulting assignment, then make replay durable.

### G2. Import replay protection is session-only

EM-P5-H02 records exact-row replay as session-only. Add a server-owned import batch/idempotency reference, immutable row outcomes, and safe retry semantics before certifying ELC-089 through ELC-092.

### G3. Probation workflow is not a complete product surface

`ProbationReview` supports pending/confirm/extend/separate data, but no dedicated audited frontend route was identified alongside employees, onboarding, movements, and exits. Confirm whether probation is intentionally managed elsewhere. If not, implement queue/detail/decision flow with authorization, validation, feedback, audit, and exit handoff.

### G4. Exit orchestration is not proven end to end

Exit CRUD exists, but completion must atomically reconcile the active spell and assignment, employee projection, access timing, downstream leave/payroll/statutory/document blockers, audit, and notifications. Build or confirm a single authoritative service and expose only valid transitions.

### G5. Future movement activation and correction need explicit ownership

The data model supports planned assignments and correction references. The system needs a deterministic activation mechanism, observable failures, replay protection, and an approved correction workflow. Until then, future movement and retroactive correction cannot be fully certified.

### G6. Stale-write contract is incomplete

Employee master, access, bank, onboarding, movement, and exit forms need a consistent concurrency token/version strategy for protected updates. Current pending-button guards prevent duplicate clicks but do not alone prevent stale writes from separate sessions.

### G7. Lifecycle notification matrix is not frozen

Define event, recipient, channel, template, tenant setting, retry, deduplication, and failure policy for onboarding, access, manager change, confirmation, movement, and exit events. No real email is required for local certification; provider behavior must use an isolated adapter.

## Policy decisions that must remain blocked

| Decision | Required owners | Minimum approved content |
| --- | --- | --- |
| Cross-entity transfer | HR, Payroll, Finance, Statutory, Product, QA | Leave treatment; payroll/statutory registrations; fiscal owner; service continuity; document/history ownership; effective-date and rollback rules |
| Rehire | HR, Payroll, Benefits/Statutory, Security, Product, QA | Identity reuse; new spell; tenure/benefit continuity; prior access; prior exit; leave/payroll/statutory handling; historical visibility |
| Retroactive correction | HR governance, Payroll, Audit, Product, QA | Authority, window, downstream recalculation, evidence, maker-checker, immutable superseded history |
| Exit dependencies | HR, Payroll, Finance, IT/Security, Legal | Access-disable timing; payroll/FnF; leave settlement; documents; assets; retention; cancellation boundary |
| Import atomicity | Product, HR Ops, QA | All-or-nothing versus eligible-row commit; retry and rollback behavior; batch limits and approvals |

## Phase-wise development and QA plan

### Phase EL-0 - Contract freeze and traceability

- Review the functional contract and 100 scenarios with Product, HR, Security, Payroll/Finance, and QA.
- Mark mandatory/optional/blocked scenarios and assign policy owners.
- Map every scenario to route, API, model/service, permission, audit event, and automated test.
- Exit gate: no unowned P0 requirement and no silent policy assumption.

### Phase EL-1 - Employee master and directory closure

- Reconcile directory/filter/sort/pagination/detail behavior.
- Complete field validation, duplicate/replay, uncertain outcome, stale update, deactivation, and hard-delete denial.
- Standardize loading, empty/error, consolidated feedback, five-second toast, persistent receipt, focus, and mobile behavior.
- QA target: ELC-001 through ELC-032 with browser/API/PostgreSQL/audit proof.

### Phase EL-2 - Access and payout controls

- Complete role provisioning/revocation, privilege boundaries, last-admin, persona switching, and inactive/exit behavior.
- Complete bank account masking, primary-account concurrency, tenant isolation, failure/retry, and audit.
- QA target: ELC-033 through ELC-047, including fresh-session tests.

### Phase EL-3 - Onboarding and probation

- Verify or implement probation queue and decision surface.
- Enforce onboarding transition rules, duplicate prevention, owner/template scope, privacy, audit, and notification contracts.
- QA target: ELC-048 through ELC-058.

### Phase EL-4 - Effective movements and manager history

- Move reporting-manager import onto effective assignment services.
- Add durable idempotency, stale approval protection, planned activation, and observable activation failures.
- Complete all supported same-tenant movement types and MSS historical/current scope.
- Keep cross-entity and correction scenarios blocked until approved.
- QA target: ELC-059 through ELC-074 plus concurrency and point-in-time downstream regressions.

### Phase EL-5 - Exit and post-exit

- Centralize exit transition service and downstream blocker evaluation.
- Reconcile access, spell/assignment, employee projection, leave/payroll/statutory/documents, audit, and notifications atomically.
- Preserve rehire as blocked unless its policy is approved and implemented.
- QA target: ELC-075 through ELC-084.

### Phase EL-6 - Imports and operational evidence

- Add server-owned import batches and durable row idempotency.
- Certify malformed files, ambiguity, partial failure, replay, masking, audit rollback, notifications, responsive behavior, and cleanup.
- QA target: ELC-085 through ELC-100.

### Phase EL-7 - Joined certification

- Run one connected isolated PostgreSQL/Django/Redis-Celery/production-built Next.js campaign.
- Use one Playwright worker initially, then the required browser matrix for critical paths.
- Reconcile API, PostgreSQL, audit, RBAC, tenant isolation, accessibility, responsive views, and exact-ID cleanup.
- Run TypeScript, ESLint, production build, Django checks, migration drift, targeted security scan, and neighboring leave/attendance/document/payroll-input regressions.
- Publish Passed/Failed/Blocked/Not Run totals without borrowing historical results.

## Recommended immediate implementation slice

Start with **EL-1 Employee master and directory closure**. It is the foundation for every later fixture and has the lowest policy dependency. The first executable batch should cover ELC-001 through ELC-032, while development specifically evaluates stale-write protection and atomic employee/spell/assignment creation before expanding lifecycle state.

## Audit verdict

**CONDITIONAL / NOT YET FULLY CERTIFIED.** The repository contains a mature employee directory/form implementation and strong historical tests for same-tenant lifecycle integrity. It does not yet support a defensible claim that every employee lifecycle scenario works end to end on the current candidate. Seven implementation gaps and five policy decisions remain explicit, with cross-entity transfer, correction, and rehire correctly blocked.
