# HRMS Execution Plan

## 1. Purpose

This document is the live execution tracker for the current HRMS build.

It is intended to answer five practical questions:

- what is already implemented
- what is partially implemented
- what is still missing
- what is the highest-value next delivery sequence
- what technical gaps must be closed before the product can be treated as production-ready

This version has been updated to reflect the codebase state reviewed on June 19, 2026.

---

## 2. Current Project Position

The project is no longer just a scaffold.

It is now best described as:

- a strong multi-tenant HRMS foundation
- a working ESS and MSS MVP slice across backend, web, and mobile
- a substantially completed HR admin backbone across employee and organization operations
- an operations-capable HRMS that has completed the agreed backbone, policy, and lifecycle slices, has pushed document operations into real workflow depth, and is now moving deeper into trust layers and wider release readiness

The main gap is no longer architecture discovery.
The main gap is operational completion and quality maturity.

---

## 3. Verified Build Status

## 3.1 Foundation Confirmed In Place

The following is already present in the repository:

- product planning and architecture documents
- Django backend with tenant-aware HRMS domain models
- REST API layer for auth, ESS, MSS, and large parts of HR admin
- Next.js web app with login, ESS, MSS, and a broad HR admin route surface
- Expo mobile app with ESS and MSS flows
- token-based auth/session bridge for web
- secure session restore for mobile
- demo bootstrap and fallback data for local exploration
- OpenAPI schema and Swagger surface on backend

## 3.2 Functional Areas With Real Working Coverage

These areas have meaningful implementation, even if they are not yet enterprise-ready:

- login, session, logout
- employee self-service dashboard
- manager approval inbox
- leave request submission
- leave request approve/reject actions
- leave request cancel and withdraw endpoints
- attendance regularization submission
- attendance regularization approve/reject actions
- HR admin dashboard
- HR admin employee listing and detail APIs
- HR admin organization snapshot and section CRUD APIs
- leave type and leave policy administration APIs
- attendance policy administration APIs
- policy assignment flows
- lifecycle queue and onboarding/probation/movement/exit APIs
- document category, requirement, and employee document APIs
- notification template, event, and queue APIs
- report export endpoints

## 3.3 Areas That Exist But Are Still Operationally Incomplete

- workflow orchestration depth
- policy and rules enforcement depth
- production-safe permissions and route protection
- document storage and upload lifecycle
- notification delivery channels
- reporting breadth and trustability
- mobile runtime validation on devices
- QA automation and CI

---

## 4. Domain Status By Area

## 4.1 HR Admin Web

Status: `Backbone Complete`, ready to hand off into policy execution

What is working now:

- HR admin landing workspace
- employee workspace routes
- organization workspace routes
- policy administration routes
- attendance operations routes
- lifecycle routes
- document operations routes
- notifications routes
- reports routes

What is still missing or shallow:

- import flows
- stronger audit visibility in admin screens
- broader release-grade regression depth beyond backbone smoke coverage
- deeper cross-module behavior that belongs to later policy and lifecycle phases

## 4.2 Employee Self-Service and Manager Self-Service

Status: `Working MVP`

What is working now:

- login
- dashboard retrieval
- leave submission
- attendance regularization submission
- manager review and decision actions
- session restore on mobile

What is still missing or shallow:

- richer workflow detail views
- richer employee document-center depth
- notification center
- stronger offline behavior
- more complete leave and attendance history experiences

## 4.3 Policy Execution

Status: `Completed For Agreed Scope`

What is working now:

- leave runtime already enforces core rules such as notice, backdated submission, probation eligibility, attachment requirements, and balance availability
- attendance regularization already enforces policy allowance and regularization-reason requirements
- attendance regularization now also blocks locked attendance rows, duplicate pending requests on the same record, and invalid requested punch ordering
- backend smoke coverage now proves the main leave denial-path rules through the ESS submission API instead of relying only on service-layer assumptions
- backend smoke coverage now also proves leave lifecycle runtime behavior for employee withdrawal of pending leave, policy-blocked withdrawal, withdrawal notice-window blocking, direct cancellation of approved leave, cancellation notice-window blocking, attachment-required cancellation blocking, cancellation requests that require reapproval before final cancellation, and rejection of cancellation reapproval that restores the approved leave state
- backend smoke coverage now also proves leave policy assignment resolution returns the winning scoped policy across all currently supported leave assignment scopes including employee, legal entity, branch, department, grade, and employment type, with manual priority acting as the explicit HR override, equal-priority matches falling back to the more granular scope, combined matching scopes outranking broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity blocked at save time, and the winning leave policy assignment changing a real leave submission outcome
- backend smoke coverage now also proves attendance holiday, weekly-off, half-day, late, and overtime derivation through preview and approval-driven runtime paths, now covers holiday-versus-weekly-off precedence explicitly, and it enforces missing-punch `absent` derivation instead of silently defaulting those cases to `present`
- backend smoke coverage now also proves that attendance policy assignment resolution returns the winning record across all currently supported attendance assignment scopes including employee, legal entity, branch, location, department, grade, and employment type, with manual priority acting as the explicit HR override, equal-priority matches falling back to the more granular scope, combined matching scopes outranking broader single scopes when priority is equal, ambiguous active overlaps at the same priority and same granularity blocked at save time, and shift assignment resolution returning the winning record while longer weekly-rotation sequences resolve correctly, temporary overrides beat rotation windows when intended, and winning attendance policy and shift assignments change real regularization outcomes including weekly-off derivation
- platform policy adoption now creates real tenant runtime records for leave types, leave policies, shifts, holiday calendars, holidays, and attendance policies instead of storing adoption as metadata only
- tenant runtime policies now preserve source-traceability metadata such as source kind, source pack code, source item key, source version, managed-by-platform state, delegation mode, and platform-locked fields
- HR admin policy edits now enforce platform-governed delegation rules so locked or clone-only policies cannot be edited as ordinary tenant-native records
- HR admin can now detach clone-only leave and attendance policies from the platform baseline and continue editing them as tenant-owned clones without breaking existing assignments or references
- cloned leave types, shifts, and holiday calendars now also preserve delegation metadata and enforce governance rules through tenant HR admin edit APIs
- tenant HR admins can now also detach cloned leave types, shifts, and holiday calendars when a platform-seeded baseline master must become tenant-owned without breaking current references
- HR admin payloads for leave types, leave policies, attendance policies, shifts, and holiday calendars now expose normalized governance state fields so frontend screens can show lock, detach, and lineage intent without inferring it from raw metadata alone
- HR admin list and edit screens for leave types, leave policies, attendance policies, shifts, and holiday calendars now render governance badges, lineage notices, detach actions, and direct-edit gating based on those normalized governance fields
- governed controls now disable directly inside the edit forms across leave types, leave policies, attendance policies, shifts, and holiday calendars, with grouped locking for governed config sections and inline lock hints for field-level controls

What is still missing or shallow:

- any future product-confirmed leave expansion such as sandwich handling
- any future attendance expansion beyond the currently agreed runtime and collision branches
- stronger automated coverage for more complex multi-scope assignment combinations beyond the now-covered winning-policy and winning-shift cases

## 4.3.1 Policy Ownership and Delegation

Status: `Foundation Implemented`

What is defined now:

- a new `Platform Policy Admin` role concept for first-time baseline policy ownership
- a baseline-pack and tenant-adoption design for leave, attendance, workflow, and document-policy rollout
- a clear boundary that runtime engines should still read tenant-owned effective records
- platform staff APIs now exist for tenant creation, onboarding updates, first-admin provisioning, platform policy-pack publication, tenant adoption, and activation handoff
- baseline adoption now updates onboarding readiness through actual tenant policy-pack adoption records instead of a purely manual state change
- tenant runtime leave and attendance records now clone from platform packs with traceability and governance metadata
- tenant HR admins can detach clone-only policies when the platform baseline should stop governing that specific runtime record
- tenant HR admin APIs now expose and enforce governance metadata on cloned leave types, shifts, and holiday calendars as well as policy rows
- tenant HR admin detach flows now extend across cloned leave types, shifts, and holiday calendars so non-policy baseline masters are no longer governance dead ends
- tenant HR admin APIs now also expose normalized frontend-ready governance fields such as governance state, edit mode, detach availability, locked-field count, and lineage summary
- the current frontend now consumes those governance fields on the major HR admin policy and runtime-master pages instead of leaving them as backend-only metadata
- the current frontend now also applies field-level lock UX for the first governance-critical controls instead of only blocking at submit time

What is still missing:

- actual platform-role and permission implementation
- pack-authoring CRUD depth for items and delegation rules through first-class APIs and UI
- runtime cloning for workflow and document-policy families
- broader field-aware governance enforcement beyond the current leave, attendance, shift, and holiday admin edit surfaces
- richer detached-state audit, approval, or reconciliation flows for non-policy baseline masters if product governance needs more than direct detach
- richer grouped lock messaging and rationale if product wants something beyond the current inline hints and grouped governed-section banners

Reference:

- `docs/platform-policy-admin-and-delegation-design.md`

Why this matters:

- it solves who owns the first safe policy setup for a tenant
- it separates platform-governed baselines from tenant operational editing
- it avoids mixing policy seeding concerns directly into runtime rule evaluation

## 4.3 Leave Management

Status: `Working Base, Rules Still Shallow`

Working now:

- leave types
- leave policy endpoints
- leave requests
- manager approvals
- balance surfaces
- admin adjustment surfaces
- platform policy adoption can now create real tenant leave types and leave policies from a published baseline pack
- leave policies can now carry baseline-source metadata and platform-governed edit locks
- clone-only leave policies can now be detached into tenant-owned editable variants in place
- leave types cloned from platform packs now also carry delegation metadata and enforce locked-field governance through HR admin APIs
- clone-only platform-seeded leave types can now be detached into tenant-owned editable variants in place

Still pending:

- hard rule enforcement during submission
- eligibility and notice period logic
- attachment handling
- sandwich and backdated rules
- clearer history and audit views

## 4.4 Attendance Management

Status: `Working Base, Operations Partial`

Working now:

- attendance summary surfaces
- regularization flows
- admin attendance records
- shifts
- holiday calendars
- shift assignments
- roster templates
- platform policy adoption can now create real tenant shifts, holiday calendars, holidays, and attendance policies from a published baseline pack
- attendance policies can now carry baseline-source metadata and platform-governed edit locks
- clone-only attendance policies can now be detached into tenant-owned editable variants in place
- shifts and holiday calendars cloned from platform packs now also carry delegation metadata and enforce locked or clone-only governance through HR admin APIs
- clone-only platform-seeded shifts and holiday calendars can now also be detached into tenant-owned editable variants in place

Still pending:

- check-in/check-out operations
- geolocation attendance
- richer exception handling
- biometric/import/API integrations
- lock/reopen discipline
- stronger rule execution for late marks and overtime

## 4.5 Lifecycle

Status: `Complete For Agreed Current Scope`

Working now:

- lifecycle queue
- onboarding CRUD
- probation review CRUD
- movement CRUD
- exit CRUD
- owner/status bulk actions
- onboarding completion now enforces checklist/date readiness and can sync employee joining state into the employee master
- onboarding completion now also evaluates mandatory employee document rules and blocks completion when due required documents are still missing or unverified
- onboarding checklist snapshots are now normalized into a predictable item structure with progress counters and blocking versus non-blocking checklist semantics
- onboarding checklist items now also support owner, due-date, overdue, and escalation-ready runtime signals so lifecycle review surfaces can behave more like operational queues
- onboarding checklist items now also maintain embedded action history and last-action metadata when completion, owner, or due-date changes happen
- onboarding checklist items can now emit in-app overdue reminders and escalation notifications to their configured owner when lifecycle attention thresholds are reached
- onboarding checklist items can now also declare an `escalation_owner`, allowing escalations to route to a fallback person instead of only re-alerting the primary owner
- onboarding checklist items can now also opt into `auto_reassign_on_escalation`, which transfers ownership to the escalation owner when escalation is triggered
- onboarding checklist items now also persist explicit escalation state through `is_escalated` and `escalated_at`, so the system can distinguish between escalation becoming due and escalation already being actioned
- onboarding payloads and listings now also expose record-level attention state, urgency rank, next due date, next escalation date, and summary text so lifecycle review surfaces can sort by real urgency instead of raw creation time
- probation confirmation and extension decisions now sync employee probation and confirmation dates into the employee master
- completed movements now require meaningful target changes, validate structural consistency before save, and apply approved target structure to the employee master
- exit approval and completion now enforce stronger date sequencing, block completion while employee access is still live, and sync employee status into `on_notice` or `exited`
- rehire-ready onboarding now exists for exited employees, using exit eligibility plus exit-date guardrails before reactivating the employee master
- onboarding records can now auto-create a real lifecycle workflow instance when HR uses a configured onboarding template code, replacing a purely manual `workflow_reference` convention
- onboarding records can now also auto-seed structured checklist items from the active lifecycle workflow template when HR starts from a template code without providing a custom checklist yet
- onboarding template-seeded checklist items can now derive `due_on` automatically from workflow-step rule metadata such as `due_anchor` and `due_offset_days`, and those due dates now refresh when the onboarding anchor date changes later
- lifecycle workflow template steps now also support fallback anchor rules such as `due_anchor_candidates`, and template save validation now rejects invalid lifecycle anchors before those rules can leak into runtime
- template-derived lifecycle items now also preserve custom non-working weekday definitions as part of their SLA metadata, so later due-date refreshes keep using the same working-day assumptions instead of falling back to a hardcoded weekend
- HR admin workflow options now also expose frontend-ready lifecycle SLA authoring metadata, including supported rule-snapshot fields, offset-unit choices, non-working weekday values, and trigger-specific due-anchor presets so workflow-template editors can stay declarative instead of hardcoding those contracts
- onboarding checklist snapshots now also auto-sync tenant document requirement rules into document-derived checklist items with due dates, blocking semantics, and verified-document compliance state
- exit clearance snapshots are now normalized into structured clearance items with progress counters, blocking versus non-blocking semantics, and completion gating
- exit records can now auto-create a real lifecycle workflow instance when clearance starts from a configured clearance workflow template code inside the clearance snapshot
- exit clearance can now also auto-seed structured clearance items from the active lifecycle workflow template when HR starts from a template code without providing custom items yet
- exit template-seeded clearance items can now derive `due_on` automatically from workflow-step rule metadata such as `due_anchor` and `due_offset_days`, and those due dates now refresh when the exit anchor date changes later
- the same lifecycle workflow template rule contract now supports fallback anchors for exit clearance as well, so template authors can safely prefer one milestone and fall back to another when needed
- lifecycle workflow template rules now also support `business_days` offsets, allowing due dates to skip weekends and matching tenant holiday-calendar dates instead of relying only on raw calendar-day math
- exit clearance items now also support owner, due-date, overdue, and escalation-ready runtime signals so offboarding review can surface aging work instead of only open counts
- exit clearance items now also maintain embedded action history and last-action metadata when completion, owner, or due-date changes happen
- exit clearance items can now emit in-app overdue reminders and escalation notifications to their configured owner when offboarding attention thresholds are reached
- exit clearance items can now also declare an `escalation_owner`, allowing escalations to route to a fallback person instead of only re-alerting the primary owner
- exit clearance items can now also opt into `auto_reassign_on_escalation`, which transfers ownership to the escalation owner when escalation is triggered
- exit clearance items now also persist explicit escalation state through `is_escalated` and `escalated_at`, so repeat saves do not keep treating the same escalation as a first-time event
- exit payloads and listings now also expose record-level attention state, urgency rank, next due date, next escalation date, and summary text so offboarding queues can surface the riskiest work first
- the combined lifecycle queue now uses those same attention signals to rank onboarding and exit records by urgency rather than only ordering everything by creation time
- the HR admin workflow editor now consumes backend lifecycle SLA authoring metadata so lifecycle rule creation is guided end to end without frontend hardcoding
- HR admin onboarding and exit authoring now support structured lifecycle item editing and template-trigger selection instead of relying only on raw JSON-oriented payloads
- lifecycle onboarding and exit queue/detail surfaces now expose stronger progress, attention, next-due, escalation, and document-blocker signals for operational review

Still pending:

- broader lifecycle template execution beyond the now-complete onboarding and exit bootstrap if additional lifecycle milestones should become template-driven later
- richer lifecycle analytics and reporting beyond the current attention-state, next-due, urgency-ordering, and blocker surfaces
- deeper document-platform work that belongs to the next phase, including upload storage lifecycle, re-upload loops, and broader artifact governance

## 4.6 Documents

Status: `Substantially Complete For Agreed Current Scope`

Working now:

- category setup
- requirement rules
- employee document listing and review surfaces
- storage-backed employee document uploads for HR admin and ESS flows
- verification approval and rejection behavior with re-upload guidance
- lifecycle-linked document compliance gating for onboarding readiness
- queue-level document attention summaries including missing, expired, expiring, and future-due counts
- manual HR-triggered expiry reminder actions for selected employee documents
- system-driven document expiry reminder command support for scheduled scans
- document notification event coverage for onboarding attention, upload submitted, re-upload requested, and expiry attention
- notification catalog seed data for document operational flows in the demo workspace

Still pending:

- generated HR letters
- broader artifact-governance workflows beyond the current upload, review, reminder, and compliance loop

## 4.7 Notifications

Status: `Multi-Channel Foundation Implemented`

Working now:

- notification definitions
- template surfaces
- queue/listing surfaces
- queue filtering by module and subject type for operational triage
- document-focused event coverage and seeded template and event catalog examples
- tenant-scoped channel delivery configurations for in-app, email, SMS, push, and WhatsApp routing
- an extensible delivery backend registry with safe default backends for each supported channel
- queue processing command support so pending notifications can be delivered through configured backends instead of remaining queue-only records
- delivery logging now has a clearer operational path through backend processing and per-channel configuration

Still pending:

- richer provider integrations beyond the current extensible default backbone
- retry/failure management
- end-user notification center

## 4.8 Reports and Audit

Status: `Early Operational Layer`

Working now:

- dashboard surfaces
- at least first report export paths

Still pending:

- full HR operational reports
- approval timeline visibility
- audit viewers
- trustworthy cross-domain analytics

## 4.9 Payroll

Status: `Not Started As A Delivery Stream`

Payroll remains a future workstream and should not begin until HR admin, policies, attendance, lifecycle, and reporting are more stable.

---

## 5. Technical Maturity Status

## 5.1 Backend

Status: `Functionally Rich, Structurally Overloaded`

Observed concerns:

- very large API aggregation layer
- incomplete service-layer separation
- automated backend coverage has started, but is still smoke-level
- permissions have started hardening, but page-level and deeper action-level controls still need follow-through
- background jobs and storage integrations are not yet mature

## 5.2 Web

Status: `Broad Surface, Better Than Docs, Still Needs Hardening`

Observed concerns:

- docs were behind the actual implementation
- route and role protection still need deeper action-level follow-through beyond workspace entry
- linting has been configured, but the delivery baseline still needs continued cleanup and build validation

## 5.3 Mobile

Status: `Useful MVP, Still Centralized`

Observed concerns:

- large single-app shell
- limited device validation evidence
- missing native attachment/location flows
- partial offline resilience

## 5.4 Quality and Delivery

Status: `Early Baseline Established`

Current gaps:

- backend tests now exist, but coverage is still narrow
- CI baseline now exists, but release discipline is still early
- no staging or release workflow documented
- observability and secrets management are still pending

---

## 6. Execution Risks

The biggest current risks are:

- low change safety because automated coverage is still narrow
- growing maintenance cost from oversized backend and frontend files
- shipping broader module coverage before stabilizing the existing operational core

---

## 7. Recommended Delivery Order

The project should now move from breadth-first expansion to completion-first execution.

Current active phase:

- `Phase 5: Reporting, Notifications, and Audit Trust`
- focus: building on the now-substantially-complete document and lifecycle foundation with stronger notification delivery, auditability, timelines, and operational reporting trust

Phase 0 completed baseline:

- non-interactive web linting baseline added
- first CI workflow added across web, mobile, and backend checks
- first backend smoke test suite added for auth, leave, attendance, approvals, HR admin denial, unauthenticated denial, and manager-scope denial
- permission review documented and first HR admin workspace and web-entry guards enforced
- web demo mode made explicit instead of silent fallback
- workspace failure UI added for live-load problems

Most recent completed phase:

- `Phase 3: Lifecycle Completion`
- onboarding, probation, movement, exit, and rehire flows now update real employee-master state instead of behaving only as isolated operational rows
- onboarding and exit can now instantiate real lifecycle workflow instances from workflow template codes, seed structured work items, and derive SLA dates from validated lifecycle rule metadata
- lifecycle work items now expose due dates, overdue and escalation state, owner routing, queue urgency, embedded action history, and frontend-guided lifecycle SLA authoring instead of acting as shallow placeholders
- document-linked onboarding readiness, upload review loops, expiry reminders, and document notification events are now materially deeper than the original Phase 3 closeout and have shifted the remaining priority away from raw document scaffolding and toward trust-layer maturity

## Phase A: Operational Hardening

Focus:

- test foundation
- lint and CI setup
- permission hardening
- clearer live vs demo behavior
- backend/service refactoring in high-risk areas

Why first:

- every future module becomes cheaper and safer once the platform is trustworthy

## Phase B: HR Admin Completion

Focus:

- employee master completion
- organization master completion
- stronger create/edit/detail flows
- manager assignment and access administration

Why next:

- HR admin data quality is the operating backbone for every later module

## Phase C: Policies and Rule Enforcement

Focus:

- leave rule enforcement
- attendance rule enforcement
- workflow template maturity
- configuration publish and override discipline
- platform baseline policy ownership and tenant delegation model

Why next:

- configuration-first value only becomes real when policies reliably drive behavior

## Phase D: Lifecycle and Document Completion

Focus:

- onboarding and probation depth
- transfer/promotion/exit completeness
- document upload and verification lifecycle
- generated letters

Why next:

- this is where the system begins to feel like a true HR operating platform

## Phase E: Reporting, Notifications, and Audit Trust

Focus:

- exports and dashboards
- audit trails and viewers
- delivery channels
- operational monitoring

Why next:

- customers need visibility, traceability, and communication before scale

Current execution status:

- `Phase E / Phase 5 equivalent` is now `substantially completed`, not fully finished
- notification delivery and inbox foundations are now materially deeper than the earlier plan baseline
- the remaining work has shifted away from template and queue scaffolding and toward trust-depth, traceability, and richer reporting

What is now in place:

- admin notification template, event, delivery-config, diagnostics, preview, test-send, and queue-review flows
- actionable diagnostics navigation into queue, template, and event review surfaces
- ESS notification center for employees
- MSS notification center for managers
- report/export baseline across core operational queues

Still pending to close this phase:

- richer real-world provider integration depth
- deeper audit viewers
- stronger approval and workflow timeline exploration
- broader cross-domain reporting and analytics depth
- tighter operational drill-down from alerts and metrics into change history and approval traces

Scoped deferment note:

- HR-admin leave-request audit-feed expansion is intentionally deferred to a later extension
- the current audit-center delivery should be read as covering document review, lifecycle history, notification delivery, and attendance-approval traceability first

## Phase F: Payroll Program Start

Focus:

- payroll domain design validation
- salary structures
- payroll inputs and periods
- payslips, deductions, and compliance engine foundations

Why last:

- payroll depends on stable employee, leave, attendance, and policy foundations

---

## 8. Suggested Next Two Working Sprints

## Sprint 1

- configure ESLint and make lint non-interactive
- add first backend API tests for auth, leave request, and approval flows
- document live vs demo behavior rules
- review role-based access in HR admin routes and APIs

## Sprint 2

- complete employee create/edit/detail flows
- complete organization masters CRUD polish
- add stronger form validation and error handling
- add first CI pipeline for typecheck, build, Django check, and tests

---

## 9. Summary

This codebase now has more real HRMS product surface than the older docs suggested.

The right move is not to widen scope quickly.
The right move is to harden the current platform, complete the HR admin and policy verticals, and then start payroll from a more stable operational base.
