# HRMS Phase-Wise Development And Testing Plan

## 1. Purpose

This document is the historical phase-wise execution plan for finishing the HRMS product layer before payroll work begins. Current payroll depth work is tracked in `docs/hrms-phase-delivery-tracker.md`, `docs/payroll-saas-architecture-plan.md`, and `docs/payroll-source-data-contract.md`.

It combines development scope and testing scope in one place so every phase has:

- clear product outcomes
- backend implementation focus
- web and mobile implementation focus
- API, unit, integration, browser, and visual testing gates
- documentation updates required before closeout
- a release-quality exit condition

This plan complements:

- `docs/hrms-first-completion-plan.md`
- `docs/hrms-phase-delivery-tracker.md`
- `docs/playwright-browser-visual-testing-development-plan.md`
- `docs/ui-ux-makeover-coverage-plan.md`
- `docs/phase0-release-quality-baseline.md`
- `docs/hrms-pilot-setup-notes.md`
- `docs/hrms-release-notes.md`
- `docs/hrms-known-limitations.md`
- `docs/hrms-release-risk-register.md`
- `docs/hrms-module-wise-vertical-coverage.md`
- `docs/payroll-saas-architecture-plan.md`
- `docs/payroll-source-data-contract.md`

Payroll is now beyond the original deferral point: the foundation includes source readiness, setup, locked snapshots, configurable rules, draft calculation, applied adjustment consumption, review, outputs, finance handoff, full-and-final settlement, and governed local durable files. Real external storage/provider integrations remain future payroll depth work.

---

## 2. Current Status Snapshot

Current product posture:

- HRMS-first development is the active mission.
- Payroll foundation work is now active as a depth stream after the original HRMS-first baseline.
- Phase 0 platform hardening is complete.
- Phase 1 HR admin backbone is complete.
- Phase 2 leave and attendance policy execution is complete for the agreed scope.
- Phase 3 employee lifecycle is effectively complete for the agreed scope.
- Phase 4 documents and employee records are substantially complete, with generated HR letter artifacts now in place and deeper artifact governance still open.
- Phase 5 trust layers are substantially advanced, with deeper audit exploration, approval traceability, reporting depth, and provider-level delivery confidence still open.
- Phase 6 HRMS release readiness is the next major consolidation target.
- Payroll depth now extends through full-and-final settlement orchestration, calculation validation hardening, configurable statutory/component validation catalogs, and governed local durable output files, with remaining focus on external storage adapters, provider integrations, acknowledgements, and locked output audit trails.

Current quality posture:

- Backend Django check passes.
- Backend pytest suite passes.
- Web lint, typecheck, and production build pass.
- Mobile typecheck passes.
- Playwright browser smoke tests exist for core routes.
- Playwright visual snapshots exist for the first HRMS baseline screens across laptop and mobile viewports.
- CI includes backend, web, mobile, and browser smoke validation.

Main planning implication:

The project should now shift from broad feature creation to closing operational gaps, expanding regression coverage, and proving that the modern UI remains stable in a real browser.

---

## 3. Delivery Principles

1. Finish HRMS before widening scope.
2. Treat tests as phase deliverables, not cleanup.
3. Keep browser testing close to real user workflows.
4. Use visual regression tests to protect modern screen quality.
5. Keep demo-mode browser coverage deterministic.
6. Add live-backend browser coverage for auth, roles, approvals, and data mutations.
7. Update documentation at every phase closeout.
8. Keep payroll calculation out of scope until HRMS data, permissions, policy execution, lifecycle, documents, and trust layers are stable.
9. Payroll Phase 0 may validate source readiness, but every readiness rule must resolve from tenant/platform configuration rather than client-specific code.

---

## 4. Standard Quality Gates

Every active phase should keep these commands green unless the phase explicitly changes the affected area:

```bash
DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python manage.py check
DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python -m pytest -q
pnpm --dir web lint
pnpm --dir web typecheck
pnpm --dir web build
pnpm --dir web test:e2e
pnpm --dir web test:visual
pnpm --dir mobile typecheck
```

For local browser review:

```bash
pnpm --dir web test:browser
pnpm --dir web test:browser:update
```

For live backend browser coverage, use the resettable live Playwright suite:

```bash
pnpm --dir web test:e2e:live
```

The live config resets a dedicated SQLite database, runs migrations, seeds the demo workspace, starts Django, and starts Next with demo mode disabled. For manual exploration, run Django and Next separately:

```bash
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py bootstrap_demo_workspace
../.venv/bin/python manage.py runserver 127.0.0.1:8000

HRMS_ENABLE_DEMO_DATA=false HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 pnpm --dir web dev
```

---

## 5. Phase 0: Platform Hardening

Status:

- Completed

Objective:

Make the codebase safe to evolve and safe to trust.

Development scope:

- Establish Django project health checks.
- Establish backend smoke and denial-path tests.
- Enforce core workspace and role gates.
- Make demo data behavior explicit.
- Add CI for backend, web, and mobile checks.
- Document release-quality expectations.

Backend testing gate:

- Auth smoke tests cover session, workspace rejection, ESS, MSS, and HR admin role boundaries.
- API tests cover unauthenticated denial and manager-scope denial.
- Django system check passes.

Web testing gate:

- Lint passes non-interactively.
- Typecheck passes.
- Production build passes.
- Workspace entry points handle auth and role-aware access.
- Live API failures show explicit UI states rather than silently falling back to demo data.

Mobile testing gate:

- Mobile typecheck passes.
- Mobile workspace assumptions align with backend role and session contracts.

Browser and visual testing gate:

- Not required for original Phase 0 closeout.
- Now covered retroactively by the initial Playwright route smoke and first visual baseline.

Exit result:

- Completed. Phase 0 remains a regression baseline for all later work.

---

## 6. Phase 1: HR Admin Backbone

Status:

- Completed

Objective:

Make HR admin usable for day-to-day employee and organization administration.

Development scope:

- Employee create, edit, detail, and review flows.
- Employee access provisioning and recovery rules.
- Employee status and access-state alignment.
- Manager assignment and reassignment visibility.
- Organization master CRUD.
- Organization hierarchy and dependency validation.
- Structural consistency across legal entity, branch, location, department, business unit, cost center, designation, and grade.
- Search, filters, warnings, validation, and edit-impact messaging.

Backend testing gate:

- Employee validation tests cover duplicate code, self-manager prevention, date consistency, status/access discipline, and invalid structural mappings.
- Organization tests cover duplicate codes, self-parent prevention, dependency-aware deactivation, and hierarchy consistency.
- Access tests cover empty role prevention, inactive/exited employee access blocking, and role assignment behavior.

Web testing gate:

- HR admin employee list, detail, create, edit, and access screens have stable loading, empty, error, and save states.
- Organization catalog screens support search, selected-record review, active filtering, edit guidance, and dependency warnings.
- Form validation messages are field-specific and actionable.

Mobile testing gate:

- No full HR admin mobile requirement unless admin mobile support becomes a product goal.
- Mobile user-visible employee profile data should remain compatible with backend employee master contracts.

Browser and visual testing gate:

- Add Playwright smoke coverage for:
  - `/hr-admin`
  - `/hr-admin/employees`
  - HR admin organization route set
  - employee detail or selected-record panel
- Add visual snapshots for laptop and mobile widths where responsive behavior exists.
- Assert no horizontal overflow on employee and organization admin screens.
- Confirm dense admin screens remain modern, scannable, and not marketing-style.

Exit result:

- Completed. Phase 1 should now be protected by regression tests and browser route coverage.

---

## 7. Phase 2: Leave And Attendance Policy Execution

Status:

- Completed for agreed HRMS scope

Objective:

Make leave and attendance policies execute real business rules at runtime.

Development scope:

- Leave eligibility and submission rules.
- Leave balance and insufficient-balance handling.
- Attachment-required flows.
- Backdated, notice-period, withdrawal, cancellation, and reapproval rules.
- Leave assignment resolution across supported scopes.
- Attendance regularization validation.
- Attendance preview derivation for holidays, half-days, late marks, overtime, missing punches, weekly off precedence, and policy-driven outcomes.
- Attendance policy and shift assignment resolution across supported scopes.
- Platform baseline policy adoption, governance locks, clone-first edits, detach actions, and lineage visibility.

Backend testing gate:

- Leave denial-path tests cover backdated, short notice, missing attachment, probation ineligibility, insufficient balance, withdrawal blocking, and cancellation blocking.
- Leave assignment tests cover employee, legal entity, branch, department, grade, employment type, manual priority, granularity fallback, multi-scope priority, and ambiguity rejection.
- Attendance tests cover locked records, duplicate pending requests, invalid punch ordering, preview derivation, regularization approval rewrite, policy assignment, shift assignment, rotation, temporary override, and holiday precedence.
- Governance tests cover platform-locked edit rejection, clone detach, tenant-owned editability, and baseline lineage metadata.

Web testing gate:

- Leave and attendance admin screens expose governance state, lineage, locked controls, detach actions, and validation feedback.
- ESS leave submission and history screens explain policy-driven denial or approval states.
- Attendance regularization screens show locked, duplicate, invalid, pending, approved, and rejected states.

Mobile testing gate:

- ESS mobile leave and attendance flows align with backend denial behavior.
- MSS mobile approval state displays remain compatible with workflow outcomes.

Browser and visual testing gate:

- Add Playwright workflow smoke for:
  - ESS leave request submission happy path
  - ESS leave denial path with visible error
  - attendance regularization queue review
  - HR admin policy governance screens
- Add visual snapshots for:
  - leave management admin screen
  - attendance management admin screen
  - ESS leave screen
  - MSS approval detail state
- Include viewport checks for dense tables, filter bars, policy badges, and action menus.

Exit result:

- Completed. Future work should treat this phase as a payroll dependency and protect it heavily.

---

## 8. Phase 3: Employee Lifecycle Completion

Status:

- Effectively complete for agreed HRMS scope

Objective:

Make employee journeys work from joining through exit.

Development scope:

- Onboarding checklist execution.
- Document-gated onboarding readiness.
- Probation extension and confirmation.
- Movement and reporting-line changes.
- Exit initiation, approval, clearance, access-safe completion, and status synchronization.
- Rehire readiness for eligible exited employees.
- Lifecycle workflow template instantiation.
- Due-date, SLA, business-day, holiday-aware, escalation, owner, and attention-state logic.
- Queue-ready urgency ranking.
- Lifecycle-linked notifications.

Backend testing gate:

- Tests prove onboarding completion sync, document-gated onboarding block, probation confirmation sync, movement application, exit access block, completed exit status sync, eligible rehire, and ineligible rehire rejection.
- Tests prove checklist and clearance normalization, progress counts, blocking item gates, owner and due-date behavior, template seeding, workflow-instance creation, and escalation behavior.

Web testing gate:

- HR admin lifecycle queues expose attention state, urgency, next due date, escalation status, document blockers, progress, and selected-record detail.
- Lifecycle forms support structured checklist and clearance editing.
- Workflow-template screens support lifecycle SLA authoring without frontend hardcoded contracts.

Mobile testing gate:

- Mobile ESS and MSS surfaces can display lifecycle-related approvals, notifications, and document blockers where applicable.
- Manager approval context remains understandable on smaller screens.

Browser and visual testing gate:

- Add Playwright smoke coverage for:
  - onboarding queue
  - onboarding detail or selected record
  - exit clearance queue
  - lifecycle workflow template authoring
- Add visual snapshots for:
  - lifecycle dashboard or queue
  - onboarding detail with checklist progress
  - exit detail with clearance progress
  - mobile-width lifecycle queue
- Add assertions for no overlap in progress indicators, timeline rows, badges, and action controls.

Exit result:

- Effectively complete. Remaining lifecycle work should be treated as maturity extension, analytics depth, or product-specific workflow expansion.

---

## 9. Phase 4: Documents, Letters, And Employee Records

Status:

- Substantially complete
- Not fully closed

Objective:

Move employee documents and record artifacts into system-managed workflows.

Development scope already substantially covered:

- Storage-backed employee document records.
- HR document review queue.
- Verification, rejection, and re-upload loop.
- ESS self-upload support.
- Lifecycle-linked document gating.
- Expiry summaries and document attention states.
- Manual expiry reminders.
- Scheduled expiry reminder command.
- Document notification events and seeded templates.
- Generated HR letter preview and artifact creation from employee context.
- Generated artifact storage and employee-record linkage through the document artifact model.

Remaining development scope:

- Reusable generated-letter template catalog and versioning beyond the current direct template-body preview/generation flow.
- Version visibility for generated and uploaded artifacts.
- Stronger artifact-level audit history.
- Operational controls for non-core employee artifacts.

Backend testing gate:

- Document upload, re-upload, verify, reject, reminder, expiry scan, and lifecycle gating tests remain green.
- Generated-letter tests cover template rendering, required variable validation, generated artifact creation, generated artifact listing, and artifact download.
- Add tests for document version history and artifact audit records if those models are introduced.

Web testing gate:

- HR admin document queue has stable filters, detail review, verification, rejection, reminder, and source navigation.
- ESS document upload and re-upload states are clear.
- Letter template authoring supports preview, required variables, status, and version awareness.
- Generated letters can be reviewed from employee record context.

Mobile testing gate:

- ESS mobile document center supports review of required, rejected, expiring, expired, and verified document states.
- Upload or re-upload mobile support should be tested if enabled in the mobile product scope.

Browser and visual testing gate:

- Add Playwright workflow smoke for:
  - HR opens document queue and reviews a selected document
  - HR triggers a document reminder
  - employee opens ESS document center
  - HR previews a generated letter template
- Add visual snapshots for:
  - document queue
  - document review panel
  - ESS document center
  - letter template preview
- Mask volatile dates or generated artifact ids where needed.

Exit criteria:

- HR can upload, review, reject, request re-upload, remind, and generate expected employee artifacts from inside the product.
- Employees can see document requirements and respond to rejected or missing document requests.
- Critical document and letter actions are permission-protected, auditable, and covered by backend plus browser tests.

Recommended next action:

- Close deeper artifact-governance history and operational controls if Phase 4 needs more release depth before payroll planning.

---

## 10. Phase 5: Trust Layers

Status:

- Substantially advanced
- Active closeout candidate

Objective:

Give HR, employees, managers, and platform operators enough visibility to trust what happened, what is pending, and what changed.

Development scope already substantially covered:

- Notification event catalog.
- Notification templates.
- In-app notification center for ESS and MSS.
- HR admin notification queue, retry, preview, and diagnostics.
- Tenant channel configuration for in-app, email, SMS, push, and WhatsApp.
- Extensible delivery backend registry.
- Queue processing command.
- Notification filters by module, subject type, channel, priority, and delivery status.
- Operational CSV export foundation.
- HR admin reports dashboard baseline.

Remaining development scope:

- Deeper audit viewers for leave approval traceability and richer drill-down where operators need source-record pivots.
- Stronger workflow timeline actions for future reassignment/delegation mutations beyond the current read-only trace view.
- Provider-level delivery diagnostics and configuration confidence.
- Broader HR reports that connect workforce, lifecycle, attendance, leave, documents, approvals, and notifications.
- Drill-down navigation from dashboard metrics to underlying records.
- Stronger export filters, saved exports, and audit preparation views.

Backend testing gate:

- Notification queue tests cover event creation, template resolution, delivery attempt, retry, read state, and channel configuration.
- Audit tests cover actor, timestamp, source record, before/after summary where available, and tenant isolation.
- Report/export tests cover filters, permissions, CSV shape, empty states, and cross-tenant denial.
- Workflow trace tests cover approval, rejection, escalation, reassignment, and timeline ordering.

Web testing gate:

- HR admin notification center, diagnostics, reports, audit, and workflow timeline screens are complete enough for operators.
- ESS and MSS notification inboxes support filters, pagination, detail review, read state, and source navigation.
- Reports and dashboards explain counts and allow useful drill-down.

Mobile testing gate:

- Mobile notification and approval surfaces show the same important trust signals as web: status, source, date, actor where relevant, and next action.

Browser and visual testing gate:

- Add Playwright workflow smoke for:
  - HR notification diagnostics drill-down
  - HR notification queue filtering
  - ESS notification read-state change
  - MSS notification source navigation
  - HR audit center review
  - HR reports export surface
- Add visual snapshots for:
  - notification diagnostics
  - notification queue
  - ESS notification center
  - MSS notification center
  - audit center
  - reports dashboard
- Browser assertions should check that filters, dense metric rows, diagnostic alerts, and timeline rows do not overflow or overlap.

Exit criteria:

- A user can understand why a notification was sent, whether it was delivered, whether it was read, and what source record triggered it.
- An operator can review who changed a workflow-driven record, when it changed, what decision path it took, and what is still pending.
- Reports and dashboards are strong enough for review, follow-up, and audit preparation without leaving the platform.
- Trust-layer screens feel complete across HR admin, ESS, and MSS.

Recommended next action:

- Close audit and approval timeline depth first, then improve reporting drill-downs and delivery-provider diagnostics.

---

## 11. Phase 6: HRMS Release Readiness

Status:

- Planned next consolidation phase

Objective:

Prepare HRMS as a stable product base for pilot usage and payroll foundation work.

Development scope:

- Resolve open Phase 4 generated letter gaps.
- Resolve open Phase 5 audit, workflow traceability, and reporting gaps.
- Remove or clearly flag any demo-only product behavior from release workflows.
- Review role and permission boundaries across HR admin, ESS, MSS, platform admin, and unauthenticated users.
- Review seeded data, tenant bootstrap, and setup flows.
- Review dependency security advisories and upgrade plan.
- Improve supportability through logs, management commands, health checks, and operator documentation.
- Define release notes, pilot setup checklist, and known limitations.

Backend testing gate:

- Full backend suite passes.
- Add regression tests for any release-blocking bug fixes.
- Add tenant isolation tests for critical HRMS APIs.
- Add permission matrix tests for HR admin, employee, manager, and platform staff.
- Add seed/bootstrap tests for pilot workspace setup.

Web testing gate:

- Lint, typecheck, and production build pass.
- No release-critical screen depends on unmarked demo fallback behavior.
- Primary workspaces expose useful loading, empty, error, success, and permission-denied states.
- Dependency/security advisory review is documented.

Mobile testing gate:

- Mobile typecheck passes.
- ESS/MSS release-critical mobile flows are reviewed against seeded backend behavior.
- Any mobile gaps are documented as pilot limitations or fixed before release.

Browser and visual testing gate:

- Expand Playwright Tier 0 and Tier 1 coverage:
  - login
  - workspace selector
  - HR admin dashboard
  - employee directory
  - organization masters
  - leave
  - attendance
  - lifecycle
  - documents
  - notifications
  - audit
  - reports
  - ESS dashboard
  - ESS leave
  - ESS documents
  - ESS notifications
  - MSS approvals
  - MSS notifications
- Add live-backend Playwright tests for:
  - login with seeded users
  - HR admin route access
  - ESS route access
  - MSS approval route access
  - unauthorized workspace denial
  - at least one API-backed approval or state-change flow
- Visual snapshots should exist for laptop and mobile widths for all release-critical screens.
- No release-critical page should have horizontal overflow at mobile width.

Exit criteria:

- HRMS can support a serious pilot or internal beta without frequent engineering intervention.
- Release-critical screens pass browser smoke and visual regression checks.
- Backend, web, and mobile quality gates are green.
- Known limitations are documented.
- Payroll foundation work can begin without depending on unstable HRMS source data.

---

## 12. Phase 7: Payroll Readiness Handoff

Status:

- Deferred until Phase 6 is complete

Objective:

Prepare the HRMS data foundation for payroll without starting full payroll implementation prematurely.

Development scope:

- Confirm employee master fields needed by payroll are stable.
- Confirm organization structure, cost centers, locations, departments, grades, and employment types are reliable.
- Confirm leave and attendance outputs needed for payroll are deterministic and auditable.
- Confirm lifecycle events such as joining, confirmation, movement, notice, exit, and rehire are reflected correctly in employee state.
- Confirm document and audit trails can support payroll compliance review.
- Define payroll input contracts from HRMS.
- Define payroll-readiness reports and validation checks.

Testing gate:

- Add contract tests for HRMS outputs that payroll will consume.
- Add fixtures for joiner, mid-cycle joiner, exited employee, on-notice employee, employee with unpaid leave, employee with attendance exceptions, and transferred employee.
- Add export/report tests for payroll input data.
- Add permission tests for salary-sensitive or future payroll-adjacent fields.

Browser and visual testing gate:

- Add browser coverage for payroll-readiness reports only if those reports are part of HRMS release.
- Do not create payroll processing screens in this phase unless the product explicitly starts payroll.

Exit criteria:

- Payroll can start with stable HRMS contracts, known data sources, and tested assumptions.
- Payroll planning can reference real HRMS behavior instead of expected future behavior.

Architecture planning result:

- Payroll must be SaaS-ready, tenant-scoped, configuration-first, snapshot-based, audit-friendly, and country-pack driven.
- Payroll behavior must come from effective-dated tenant configuration, formula/rule definitions, pay groups, payroll calendars, source snapshots, and compliance packs rather than hardcoded client logic.
- The architecture plan is documented in `docs/payroll-saas-architecture-plan.md`.
- The HRMS-to-payroll source-data contract is documented in `docs/payroll-source-data-contract.md`.

---

## 13. Immediate Sprint Plan

### Sprint A: Browser Coverage Expansion

Status:

- Completed for top-level Tier 1 HRMS route and visual baseline coverage

Goal:

- Turn the first Playwright baseline into useful HRMS coverage across operational screens.

Development tasks:

- Add Tier 1 route list for HR admin leave, attendance, lifecycle, documents, notifications, audit, and reports.
- Add route metadata for expected headings and workspace shell expectations.
- Stabilize selectors for repeated controls such as filters, table rows, detail panels, and action buttons.

Testing tasks:

- Add route smoke tests for Tier 1 screens.
- Add mobile no-overflow checks for dense HR admin screens.
- Add visual snapshots for the Tier 1 baseline.
- Keep `pnpm --dir web test:e2e` and `pnpm --dir web test:visual` green.

Exit gate:

- All release-critical top-level HRMS routes load in Chromium in demo mode.
- All Tier 1 visual snapshots are reviewed and intentionally accepted.

Completed result:

- Tier 1 route smoke coverage now includes organization, policies, attendance operations, lifecycle, documents, notifications admin, audit, reports, ESS documents, ESS notifications, and MSS notifications.
- The operational visual baseline now includes laptop and mobile screenshots for those Tier 1 routes.
- The shared browser helper continues to enforce no horizontal overflow.
- Sprint A surfaced and closed a demo API routing bug in audit data loading and a mobile PageIntro overflow issue on the organization screen.

### Sprint B: Live Backend Browser Tests

Status:

- Completed for seeded auth, role access, unauthorized redirect, resettable seeded data, MSS workflow mutation coverage, and workflow trace persistence verification

Goal:

- Prove that browser workflows work against Django APIs, not only demo data.

Development tasks:

- Add Playwright live-backend config or project.
- Add seeded credential helpers.
- Add auth helpers for HR admin, employee, and manager personas.
- Make seeded test data deterministic enough for browser workflows.

Testing tasks:

- Test login against seeded backend users.
- Test HR admin route access.
- Test ESS route access.
- Test MSS route access.
- Test unauthorized denial.
- Test one approval or state-change workflow end to end.

Exit gate:

- Live-backend browser tests can run locally with seeded data.
- CI strategy is documented, even if live backend browser tests remain local-only at first.

Completed result:

- A separate live Playwright config now resets a dedicated SQLite database, runs migrations, seeds the workspace, starts Django on an isolated backend port, and starts Next on an isolated web port with demo mode disabled.
- Seeded login helpers now cover HR admin, employee, and manager personas.
- Live browser tests prove unauthenticated HR admin redirect, HR admin workspace access, employee ESS access, employee HR admin denial, manager MSS access, and one real manager rejection mutation.
- The manager rejection test now verifies the selected request is removed from the live pending queue and appears in the HR admin workflow trace API with rejected status, employee context, and decision note timeline detail.
- HR admin landing access is guarded before data loading so unauthorized users redirect without triggering noisy forbidden admin data fetches.

### Sprint C: Phase 4 And Phase 5 Closeout

Goal:

- Close the highest-value HRMS gaps before release readiness.

Development tasks:

- Add generated HR letter template and preview flow.
- Store generated letters as employee artifacts.
- Add audit viewer depth for documents, lifecycle, notifications, and attendance approvals.
- Add workflow timeline depth for approvals, escalation, reassignment, and completion.
- Improve reports dashboard drill-downs and export review surfaces.

Testing tasks:

- Add backend tests for generated letter rendering and artifact creation.
- Add backend tests for audit timeline and workflow traceability.
- Add Playwright tests for document queue, letter preview, audit center, reports dashboard, and notification diagnostics.
- Add visual snapshots for new trust-layer screens.

Completed C1 result:

- Added demo-mode Playwright operational queue flows for employee directory filtering and selected master detail review.
- Added browser coverage for organization structural-layer switching and active-status filtering.
- Added lifecycle inbox coverage for item-type filtering, selected page bulk controls, and the demo-mode bulk owner guardrail.
- Added employee document queue coverage for expiry filtering and reminder candidate selection.
- Added notification queue coverage for pending queue filtering and retry candidate selection.
- Added audit center coverage for source and search filters.
- Validation: `pnpm --dir web test:e2e`, `pnpm --dir web lint`, and `pnpm --dir web typecheck` pass.

Completed C2 result:

- Added configuration-form browser behavior coverage for employee create validation/date warnings and organization department create validation.
- Added leave and attendance policy preview guardrail coverage so missing setup produces clear in-form messages before saving.
- Added workflow template behavior coverage for adding and removing approval steps.
- Added notification template behavior coverage for channel-specific subject/title enablement and preview validation.
- Added laptop and mobile visual snapshots for six representative high-risk forms: employee create, department create, leave policy create, attendance policy create, workflow template create, and notification template create.
- Validation: `pnpm --dir web test:e2e`, `pnpm --dir web test:visual`, `pnpm --dir web lint`, and `pnpm --dir web typecheck` pass.

Completed C3 result:

- Added Tier 2 workflow browser coverage for HR admin attendance regularization filtering and full review navigation.
- Added notification diagnostics drill-down coverage into the retry-ready notification queue.
- Added ESS notification source navigation coverage from employee document notifications into the document center.
- Added MSS approval queue switching coverage from leave approvals into attendance regularization decision context.
- Validation: `pnpm --dir web test:e2e`, `pnpm --dir web lint`, and `pnpm --dir web typecheck` pass.

Completed C4 result:

- Added edit-mode governance browser coverage for platform-managed leave and attendance policies, including locked-field assertions and detach-action visibility.
- Added assignment-form browser coverage for leave policy assignments, attendance policy assignments, workflow template assignments, document requirements, and employee shift assignment rotation controls.
- Added mocked server validation and conflict-response coverage where demo-mode assignment forms call Next API routes.
- Added laptop and mobile visual snapshots for seven governance and assignment routes.
- Validation: `pnpm --dir web test:e2e`, `pnpm --dir web test:browser:update`, `pnpm --dir web test:visual`, `pnpm --dir web lint`, and `pnpm --dir web typecheck` pass.

Completed C5 result:

- Added HR admin generated-letter APIs for preview, create/list/detail, and artifact download.
- Added variable rendering for employee context plus supplied payload values, with explicit missing-variable validation before storage.
- Added generated letter artifact storage using the existing document artifact model and linked each generated letter to the target employee.
- Added the `/hr-admin/generated-letters` workspace with preview, generation, artifact list, and document-control navigation.
- Added Playwright behavior coverage for preview, generation, validation errors, and no-horizontal-overflow on the new screen.
- Added laptop and mobile visual snapshots for generated HR letters and refreshed the document control visual baseline after adding the generated-letter card.
- Validation: `DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python manage.py check`, `DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python -m pytest -q`, `pnpm --dir web test:e2e`, `pnpm --dir web test:browser:update`, `pnpm --dir web test:visual`, `pnpm --dir web lint`, `pnpm --dir web typecheck`, and `pnpm --dir web build` pass.

Completed C6 result:

- Added HR admin workflow trace APIs for list and detail review of runtime workflow instances.
- Added nested trace payloads for employee context, current owner, workflow steps, assignments, overdue steps, action logs, and ordered timeline events.
- Added module, status, search, and pagination support for workflow trace review.
- Expanded `/hr-admin/workflows` from a template hub into a workflow control screen with runtime trace metrics, filters, step trace, and recent timeline rows.
- Added Playwright behavior coverage for workflow trace filters, rejected/pending trace switching, timeline visibility, and no-horizontal-overflow.
- Added laptop and mobile visual baseline coverage for the workflow control timeline screen.
- Validation: `DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python backend/manage.py check`, `DJANGO_DB_ENGINE=django.db.backends.sqlite3 ../.venv/bin/python -m pytest -q`, `pnpm --dir web lint`, `pnpm --dir web typecheck`, `pnpm --dir web build`, `pnpm --dir web test:e2e`, `pnpm --dir web test:browser:update`, and `pnpm --dir web test:visual` pass.

Completed C7 result:

- Hardened the live Playwright config so the suite uses a dedicated resettable SQLite database and root `.venv` Python by default.
- Added live API helpers that authenticate seeded personas without leaking session cookies between API calls.
- Expanded the live MSS manager decision test from UI-only confirmation to persisted backend verification through the manager pending queue and HR admin workflow trace API.
- Added an HR admin landing-page access guard so denied users redirect before admin dashboard data fetching begins.
- Validation: `pnpm --dir web lint`, `pnpm --dir web typecheck`, and `pnpm --dir web test:e2e:live` pass.

Exit gate:

- Phase 4 can be closed except optional artifact-governance extensions.
- Phase 5 can be closed for release-readiness purposes.

### Sprint D: HRMS Release Candidate

Goal:

- Move from feature completion to release readiness.

Development tasks:

- Resolve release-blocking bugs.
- Review dependency/security advisories.
- Review demo/live environment behavior.
- Prepare pilot setup checklist and release notes.
- Document known limitations.

Testing tasks:

- Run the full standard quality gate.
- Run full Playwright smoke and visual suites.
- Review screenshots manually.
- Run seeded backend workflow checks.
- Add tests for any release-blocking fixes.

Exit gate:

- HRMS is ready for serious pilot use after the remaining dependency advisory is remediated or accepted as a documented release exception.
- Payroll readiness handoff can begin after that release-risk decision is closed.

Completed D1 result:

- Ran the full HRMS release-readiness gate across backend, web, mobile, browser, visual, and live-backend checks.
- Upgraded the web runtime from `next@15.3.2` to `next@15.5.21` to clear critical and high Next.js advisories while keeping the app on the 15.x line.
- Added root `pnpm` overrides for vulnerable transitive packages in the mobile toolchain where patched versions are available: `@xmldom/xmldom`, `brace-expansion`, `browserslist`, `js-yaml`, `nanoid`, `postcss`, `sharp`, `shell-quote`, `tar`, `undici`, and `uuid`.
- Reduced JavaScript production audit findings from 73 vulnerabilities, including 2 critical, to one unique high-severity `image-size` advisory reported twice through React Native Metro. The advisory reports no patched version (`<0.0.0`), so this remains an upstream mobile dependency risk.
- Validation: `DJANGO_DB_ENGINE=django.db.backends.sqlite3 .venv/bin/python backend/manage.py check`, `DJANGO_DB_ENGINE=django.db.backends.sqlite3 ../.venv/bin/python -m pytest -q`, `.venv/bin/python -m pip check`, `pnpm --dir web lint`, `pnpm --dir web typecheck`, `pnpm --dir mobile typecheck`, `pnpm --dir web build`, `pnpm --dir web test:e2e`, `pnpm --dir web test:visual`, and `pnpm --dir web test:e2e:live` pass.
- Remaining release-risk decision: upgrade the Expo/React Native/Metro mobile stack when an upstream fix removes `image-size`, or document a release exception if mobile pilot scope does not expose this tooling path.

Completed D2 result:

- Added pilot setup notes covering local service startup, seeded users, pre-pilot quality gates, manual smoke paths, operational commands, and pilot entry criteria.
- Added HRMS pilot candidate release notes covering included product scope, validation results, dependency updates, pilot recommendation, and payroll handoff status.
- Added known limitations covering mobile dependency risk, payroll deferral, mobile coverage limits, provider integration maturity, reporting maturity, workflow mutation scope, audit depth, and operational deployment requirements.
- Added release-risk register with a recommended web-only/internal pilot exception path for the remaining mobile Metro `image-size` advisory.

---

## 14. Regression Matrix By Product Area

| Product Area | Backend Tests | Web Tests | Playwright Smoke | Visual Baseline | Mobile Tests | Release Priority |
|---|---|---|---|---|---|---|
| Auth and workspace access | Required | Required | Required | Optional | Required | P0 |
| Tenant isolation | Required | Optional | Live-backend required | Optional | Optional | P0 |
| HR admin dashboard | Optional | Required | Required | Required | Not applicable | P0 |
| Employee master | Required | Required | Required | Required | Profile compatibility | P0 |
| Organization masters | Required | Required | Required | Required | Not applicable | P0 |
| Employee access and roles | Required | Required | Required | Recommended | Not applicable | P0 |
| Leave policies and requests | Required | Required | Required | Required | Required | P0 |
| Attendance and regularization | Required | Required | Required | Required | Required | P0 |
| Lifecycle onboarding and exit | Required | Required | Required | Required | Recommended | P0 |
| Documents and records | Required | Required | Required | Required | Required for ESS | P0 |
| Generated HR letters | Required | Required | Required | Required | Optional | P1 |
| Workflows and approvals | Required | Required | Required | Required | Required for MSS | P0 |
| Notifications | Required | Required | Required | Required | Required | P0 |
| Audit center | Required | Required | Required | Required | Optional | P0 |
| Reports and exports | Required | Required | Required | Required | Optional | P0 |
| Provider delivery integrations | Required when enabled | Required when enabled | Recommended | Optional | Optional | P1 |
| Payroll readiness exports | Required before payroll | Required before payroll | Recommended | Optional | Optional | P0 before payroll |

---

## 15. Documentation Closeout Rule

At the end of each phase or sprint, update the relevant docs:

- `docs/hrms-first-completion-plan.md`
- `docs/hrms-phase-delivery-tracker.md`
- `docs/hrms-execution-plan.md`
- `docs/ui-ux-makeover-coverage-plan.md`
- `docs/playwright-browser-visual-testing-development-plan.md`
- `docs/model-structure-and-relationships.md` when models change
- `docs/nexora-target-gap-analysis.md` when overall completion estimate changes

Each closeout should record:

- what changed
- what tests were added
- what quality gates passed
- what remains open
- what moved to a later phase

---

## 16. Definition Of Done For HRMS

HRMS should be considered done enough to hand off into payroll only when:

- HR admin can operate employee, organization, lifecycle, document, workflow, notification, audit, and report surfaces without engineering help.
- ESS and MSS users can complete common self-service and approval tasks on web and supported mobile surfaces.
- Leave and attendance policies produce deterministic, tested operational outcomes.
- Lifecycle state changes synchronize correctly to employee master data.
- Documents and generated employee artifacts are handled inside the product.
- Notifications, audit trails, reports, and workflow timelines provide enough trust for real operations.
- Role and tenant boundaries are tested.
- Browser smoke and visual tests cover release-critical screens.
- Backend, web, and mobile quality gates are green.
- Known limitations are documented.
- Payroll can depend on HRMS source data without reworking foundational HR flows.

---

## 17. Next Decision

The recommended next execution move is:

1. Record the release-owner decision for the remaining mobile `image-size` advisory in the release-risk register.
2. Review the configurable payroll architecture and HRMS source-data contract before writing payroll models.
3. Build the first payroll-readiness slice around source summaries and readiness blockers before calculation.
4. Close only release-blocking provider-level delivery diagnostics and reporting drill-down gaps.
5. Broaden live-backend mutation coverage for additional approval/review actions chosen by release risk.
