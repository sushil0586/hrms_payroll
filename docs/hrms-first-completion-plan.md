# HRMS-First Completion Plan

## 1. Purpose

This document is the historical practical plan for completing HRMS before starting payroll and the wider Nexora Workforce Management Platform scope. Payroll depth work has since started and is tracked in the payroll architecture, source-data contract, and phase delivery tracker docs.

It translates the existing vision, architecture, and gap analysis into a focused execution path.

It is meant to answer:

- what HRMS means in the context of this product
- what is already good enough to build on
- what still must be completed before HRMS can be considered finished
- what order we should execute in
- what gates had to be cleared before payroll began

This plan assumes:

- HRMS was the immediate product mission for this baseline
- payroll is now active as a configurable SaaS depth stream
- new adjacent domains should not distract the team until HRMS is stable and operationally complete

---

## 2. HRMS Completion Definition

For this product, HRMS should be considered complete only when the following are true:

- HR admin can operate the platform without engineering help for day-to-day employee and organization maintenance
- ESS and MSS flows are reliable across web and mobile for common employee and manager actions
- leave and attendance policies do not just exist as records, but are enforced consistently
- lifecycle operations work end-to-end from onboarding through exit
- documents and letters are managed as part of the system, not outside it
- workflows, notifications, reports, and audit traces are good enough for real operating teams
- permissions, testing, and deployment discipline are strong enough that payroll can safely depend on the platform

If these conditions are not met, HRMS is still in progress even if many screens and APIs exist.

---

## 3. Current Position

Current position, in simple terms:

- architecture direction is strong
- core HRMS model foundation is strong
- web admin coverage is broader than earlier docs suggested
- ESS and MSS have a real MVP slice
- HRMS is not yet operationally finished

Best current characterization:

- HRMS foundation: strong
- HRMS operations: substantial, increasingly system-driven, and now document-aware across lifecycle and notification flows
- HRMS production readiness: mid stage

Estimated progress toward finished HRMS:

- HRMS scope completion: `75% to 85%`
- HRMS operational readiness: `55% to 65%`

---

## 4. What Is Already Strong

These are the areas we should treat as foundational assets, not restart:

- tenant-first architecture
- IAM and membership model
- organization master model
- employee master base
- leave model and request base
- attendance model and regularization base
- lifecycle model base
- document and letter base
- workflow engine base
- notification base
- broad HR admin route and API surface

These parts are not fully complete, but they are strategically correct and worth hardening rather than replacing.

---

## 5. What Must Be Finished For HRMS

The required HRMS completion scope is:

## 5.1 Platform Hardening

- backend test foundation
- lint and CI
- route and API permission hardening
- live versus demo behavior discipline
- improved service-layer separation in high-risk areas

## 5.2 HR Admin Operations

- employee create, edit, detail, and access management
- manager assignment maintenance
- organization masters CRUD completion
- search, filters, list operations, and validation polish
- operational admin UX improvements

## 5.3 ESS and MSS Maturity

- richer request histories and detail views
- mobile workflow detail maturity
- notification center
- broader end-user document center depth
- stronger session and offline behavior

## 5.4 Leave Completion

- balance and eligibility validation
- notice period logic
- attachment requirements
- sandwich and backdated rules
- better history, adjustment, and audit support

## 5.5 Attendance Completion

- check-in/check-out flow
- exception handling
- rule execution for late marks and overtime
- lock and reopen discipline
- import and API readiness polish

## 5.6 Lifecycle Completion

- onboarding checklist depth
- confirmation flow
- transfer and promotion maturity
- exit clearance depth
- rehire support
- lifecycle-linked workflow and document automation

## 5.7 Documents and Letters Completion

- upload lifecycle maturity and storage-backed artifact handling
- verification loop and rejection review
- re-upload handling
- expiry reminders and reminder operations
- generated HR letters
- broader employee-record artifact governance

## 5.8 Workflow, Notifications, Reports, and Audit Completion

- stronger workflow orchestration
- delegation, escalation, send-back, timeline
- notification delivery beyond in-app
- operational dashboards and exports
- change history, audit viewers, approval traceability

---

## 6. What Does Not Belong In The Immediate HRMS Completion Scope

These should remain explicitly out of the near-term HRMS completion stream:

- payroll processing
- statutory compliance engine
- asset management
- recruitment
- performance management
- learning management
- travel and expense
- general helpdesk/service desk

They are valid future modules, but they should not consume the current completion capacity.

---

## 7. Execution Principles

The team should follow these principles while finishing HRMS:

- finish before widening
- harden before expanding
- enforce policies, not just store them
- prefer end-to-end usable verticals over broad but shallow module coverage
- do not begin payroll until HRMS data and operations are trusted
- keep the workflow, notification, and configuration engines generic enough for future modules

---

## 8. Phase-Wise HRMS Completion Plan

Current active phase:

- `Phase 5: Complete Trust Layers`

## Phase 0: Stabilize The Delivery Base

Objective:

Make the current platform safe to evolve.

Priority outcomes:

- lint works non-interactively
- CI exists
- backend tests cover critical flows
- permissions and route protection are reviewed
- demo fallback is controlled and explicit

Exit criteria:

- typecheck, build, Django check, and backend tests run in CI
- at least first critical-path tests exist for auth, leave, attendance, and approvals
- role and permission issues identified in review are resolved or explicitly tracked

Current progress snapshot:

- web linting is now configured to run non-interactively
- web typecheck is passing after baseline cleanup
- CI baseline has been added for web, mobile, and backend validation
- backend smoke tests now cover auth, employee request submission, manager approvals, and HR admin denial
- backend smoke tests now also cover unauthenticated workspace rejection and manager-scope denial behavior
- permission review and workspace permission rules are now documented
- initial HR admin API role gating has been enforced using the `hr-admin` membership role
- session data now includes default-membership role codes so the web app can gate workspaces consistently
- ESS, HR admin, and MSS workspace entry points now enforce authentication or role-aware access at the page level
- web demo data now requires explicit environment enablement instead of silently replacing live API failures
- core web workspaces now render explicit failure states when live data loading breaks

Phase 0 completion closeout:

- first backend decomposition targets are now documented in `docs/phase0-backend-decomposition-targets.md`
- minimum release-quality expectations are now documented in `docs/phase0-release-quality-baseline.md`
- MSS workspace access now aligns with workflow-approver-aware backend approval rules

## Phase 1: Complete HR Admin Backbone

Objective:

Make HR admin genuinely usable for operating the system.

Priority outcomes:

- employee masters complete
- organization masters complete
- employee detail and access management mature
- manager assignment is operable
- search, filters, validation, and UX states are reliable

Exit criteria:

- HR can create, update, review, and manage employees and org masters without engineer intervention
- employee and organization administration is stable enough for real tenant onboarding

Current Phase 1 starting point:

- the platform hardening baseline is complete
- Phase 1 should now focus on employee master, access, manager assignment, and organization master reliability
- Phase 1 backend work should follow the decomposition direction defined in `docs/phase0-backend-decomposition-targets.md`
- the first stabilization slice is now in place for employee-master validation safety
- the second stabilization slice is now in place for employee access provisioning discipline
- the third stabilization slice is now in place for employee-directory access visibility and detail-level access summary signals
- the fourth stabilization slice is now in place for organization-master validation safety and hierarchy-maintenance discipline
- the fifth stabilization slice is now in place for organization-catalog review usability and faster master-data auditing
- the sixth stabilization slice is now in place for organization dependency visibility so edit impact can be reviewed before structural changes are saved
- the seventh stabilization slice is now in place for organization change-control guardrails around deactivation while records are still in active use
- the eighth stabilization slice is now in place for employee status and access-state discipline so inactive or exited employees cannot retain live access by mistake
- the ninth stabilization slice is now in place for employee structural-mapping consistency across core organization relationships
- the tenth stabilization slice is now in place for relation-aware employee form guidance so dependent structural fields narrow automatically during editing
- the eleventh stabilization slice is now in place for employee review warnings, richer date validation, and offboarding-oriented access recovery guidance
- the twelfth stabilization slice is now in place for organization warning-state review and edit-impact visibility across the master-data catalog
- the thirteenth stabilization slice is now in place for organization cleanup guidance during deactivation and manager reassignment visibility in employee review
- the fourteenth stabilization slice is now in place for form-level recovery guidance and field-specific validation feedback across employee, access, and organization administration

Phase 1 completion closeout:

- HR admin employee master, employee access, and organization master flows are now operationally usable without engineering intervention
- employee and organization review surfaces now expose enough context to support safe day-to-day administration
- Phase 1 quality gates are green across backend smoke tests, Django checks, web lint, and web typecheck

## Phase 2: Complete Policy Execution

Objective:

Make leave and attendance configuration behave correctly at runtime.

Priority outcomes:

- leave rules enforced
- attendance rules enforced
- adjustment and assignment flows trustworthy
- workflow templates more realistic

Exit criteria:

- major leave and attendance rules are executed consistently in create, submit, approve, and review flows
- policy assignment outcomes are understandable and testable

Current Phase 2 starting point:

- Phase 1 HR admin backbone is complete and stable
- the first Phase 2 slice is now in place for attendance regularization safety enforcement
- a dedicated Phase 2 execution matrix now exists in `docs/phase2-policy-execution-matrix.md`

Phase 2 progress snapshot:

- attendance regularization now blocks locked-record submissions
- attendance regularization now blocks duplicate pending requests against the same attendance record
- attendance regularization now blocks invalid requested check-in and check-out ordering
- targeted backend smoke coverage now includes the first negative-path policy-execution protections for attendance regularization
- targeted backend smoke coverage now also proves leave submission denial behavior for backdated requests, short notice, missing required attachments, probation ineligibility, and insufficient balance

## Phase 3: Complete Employee Lifecycle

Objective:

Make the system cover meaningful employee journeys from joining through exit.

Priority outcomes:

- onboarding depth
- probation and confirmation depth
- movement and reporting change maturity
- exit and clearance maturity
- document and workflow linkage

Exit criteria:

- onboarding to exit has usable screens, state transitions, and audit trail
- lifecycle workflows no longer feel like placeholders
- Phase 3 is now effectively complete for the agreed current scope, including employee-state sync, workflow-template-driven onboarding and exit execution, guided lifecycle SLA authoring, queue urgency signals, and document-gated onboarding readiness

## Phase 4: Complete Documents, Letters, and Employee Records

Objective:

Move document handling into a real system workflow.

Priority outcomes:

- upload and re-upload flows
- verification and rejection loop
- expiry reminders
- generated HR letters
- storage integration

Exit criteria:

- document operations are system-driven rather than mostly metadata-driven
- critical employee record artifacts can be uploaded, reviewed, and generated end-to-end
- Phase 4 is now substantially complete for the agreed current scope, with storage-backed employee-document records, HR review and rejection loops, ESS self-upload support, lifecycle-linked document gating, expiry summaries, manual reminder actions, scheduled reminder support, document notification events, and generated HR letter artifacts now in place
- broader artifact-governance depth remains the main carried-forward gap from this phase

Remaining pending items to close Phase 4 fully:

- broader employee-record artifact governance, including stronger lifecycle control for non-core employee artifacts beyond the current document upload, review, reminder, and compliance loop
- deeper artifact history and operational controls where product may require richer version visibility, artifact-level auditability, or stronger record-management discipline across employee-document families

## Phase 5: Complete Trust Layers

Objective:

Give operators enough visibility and reliability to trust the platform.

Priority outcomes:

- notifications across meaningful channels
- reports and exports
- audit viewers
- workflow timelines
- operational dashboards

Exit criteria:

- HR, managers, and admins can understand what happened, what is pending, and what changed
- reporting and notification surfaces are usable for real operations
- Phase 5 is now substantially advanced through in-app notification event and template coverage, tenant channel-delivery configuration, an extensible email, SMS, push, and WhatsApp delivery backbone, notification queue filtering by module and subject type, seeded document-notification catalog data, operational export surfaces, richer notification diagnostics, actionable admin navigation, and ESS plus MSS notification-center inboxes, while deeper audit exploration and broader reporting trust still remain open

Current status:

- `Phase 5` is `substantially completed`, but not fully closed
- the biggest trust-layer gap that has now been closed is the end-user notification center for both employee and manager workspaces
- the remaining work is now concentrated in audit depth, approval traceability, reporting depth, and richer delivery-provider maturity rather than basic notification scaffolding

Completed or substantially completed in Phase 5:

- admin notification templates, event definitions, queue review, retry handling, preview, and test-send flows
- tenant-scoped delivery-channel configuration for in-app, email, SMS, push, and WhatsApp
- extensible multi-channel delivery backbone with queue processing support
- notification diagnostics with alerts, recommendations, quick actions, and filtered navigation into queue, template, and event surfaces
- notification queue review filters by module, subject type, channel, priority, and delivery status
- operational CSV export foundation for workforce, approvals, lifecycle, documents, and notification queue review
- HR admin reports dashboard base with delivery-health visibility
- ESS notification center with inbox filters, pagination, detail review, read-state control, and source-link navigation
- MSS notification center with manager-scoped inbox review, read-state control, pagination, and source-link navigation

Remaining pending items to close Phase 5 fully:

- richer provider integrations beyond the current extensible delivery backbone, so real production-grade delivery providers can be configured with stronger operational confidence
- deeper delivery observability and failure explanation where operators may need clearer provider-level troubleshooting and richer delivery-log interpretation
- audit viewers that allow HR, managers, and admins to explore meaningful system change history without relying on raw record inspection
- stronger workflow action controls for reassignment/delegation/send-back mutations beyond the current read-only workflow trace timeline
- fuller HR operational reporting depth beyond the current dashboard and export baseline, including stronger cross-domain analytics that connect workforce, lifecycle, approvals, documents, and notifications
- broader trust-layer drill-down surfaces where users can move cleanly from a metric, alert, or export summary into the exact underlying operational record set

Explicit deferral inside Phase 5 follow-on work:

- HR-admin leave-request audit-feed depth is intentionally deferred for a later extension rather than being treated as part of the current completed trust-layer slice
- the current audit-center implementation should be treated as valid and intentionally scoped around lifecycle history, document review history, notification delivery history, and attendance-approval traceability
- workflow traceability now has a read-only HR-admin API and UI surface, and live-backend browser coverage verifies a manager rejection mutation through the workflow trace; future work should add controlled reassignment/delegation/send-back mutations after release-readiness risk review

Practical closeout criteria for the remaining Phase 5 work:

- a user can explain why a notification was sent, whether it was delivered, whether it was read, and what source record triggered it
- an operator can review who changed a workflow-driven record, when it changed, what decision path it took, and what is still pending
- reports and dashboards are strong enough that real operating teams can use them for review, follow-up, and audit preparation without leaving the platform
- trust-layer screens feel complete across admin, ESS, and MSS rather than stopping at basic lists and exports

## Phase 6: HRMS Release Readiness

Objective:

Declare HRMS complete enough to become the stable base for payroll.

Priority outcomes:

- core regression coverage exists
- HR admin, ESS, MSS, lifecycle, leave, attendance, and documents all meet release bar
- no critical dependency on demo-only fallback behavior
- release, staging, and supportability basics exist
- first release-readiness quality gate is green across backend, web, mobile typecheck, browser behavior, visual regression, and live-backend workflow checks
- JavaScript production audit critical findings are cleared; one high-severity mobile Metro `image-size` advisory remains because the audit feed reports no patched version

Exit criteria:

- platform can support a serious HRMS pilot or internal beta without frequent engineering intervention after the remaining mobile dependency advisory is remediated or accepted as a release exception
- payroll can begin without standing on unstable HR foundations after that release-risk decision is closed

---

## 9. Recommended Work Sequence

The best order is:

1. platform hardening
2. HR admin backbone
3. leave and attendance runtime enforcement
4. lifecycle completion
5. documents and letters completion
6. reports, notifications, and audit trust layers
7. release readiness review
8. only then payroll foundations

This order matters because payroll will depend on:

- correct employee data
- correct attendance data
- correct leave effects
- reliable workflows
- auditability

---

## 10. Suggested Priority Labels

Use these labels to manage the HRMS-first backlog:

- `P0`
  Required before payroll can start
- `P1`
  Required to make HRMS operational
- `P2`
  Valuable for maturity, can follow core completion
- `P3`
  Useful but deferrable

Suggested status labels:

- `Completed`
- `In Progress`
- `Ready Next`
- `Blocked`
- `Later`

---

## 11. Immediate Next 12 Workstreams

These are the strongest next workstreams for HRMS-first completion:

1. backend API tests for auth, leave, attendance, and approvals
2. web lint and CI pipeline setup
3. HR admin employee create/edit/detail completion
4. HR admin organization masters completion
5. manager assignment and access administration
6. leave rule enforcement
7. attendance rule enforcement
8. check-in/check-out flow
9. onboarding, confirmation, and exit workflow depth
10. generated letters and broader employee-record artifact governance
11. notifications delivery and end-user notification center
12. reports, export, audit, and workflow timeline views

---

## 12. Critical Gates Before Payroll

Payroll should not start until the following are true:

- employee masters are trustworthy
- organization masters are trustworthy
- leave balances and attendance effects are reliable
- lifecycle events reflect real employee state
- document and audit traces are acceptable
- permissions and approvals are stable
- tests and CI reduce regression risk

If payroll starts before these gates are met, the team will likely build compensation logic on top of unstable HR source data.

---

## 13. Summary

The mission is not to build more modules right now.

The mission is to finish HRMS well enough that it becomes a dependable operating platform and a safe foundation for payroll.

The right practical strategy is:

- stabilize the platform
- finish HR admin
- enforce leave and attendance behavior
- complete lifecycle and documents
- add trust layers
- then open payroll
