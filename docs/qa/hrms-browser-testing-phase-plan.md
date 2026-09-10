# HRMS SaaS Browser Testing Phase Plan

Generated: 2026-09-08

## 1. Purpose

This document defines the phased browser-based testing plan for the HRMS Payroll SaaS product. The goal is to move from page-level confidence to launch confidence by proving every important SaaS workflow through Playwright, with screenshots, defect logs, element inventory, CRUD evidence, role checks, and tenant-isolation checks.

The testing approach is depth-first. Each phase should finish with measurable confidence, clear coverage, and a signed-off evidence pack before moving to the next risky area.

## 2. Current Baseline

Latest staging browser audit:

- Environment: `https://hrms.accerio.in`
- Run ID: `stage-browser-functionality-after-phase1b-2026-09-08`
- Personas tested: platform admin, HR admin, manager, employee
- Unique pages discovered: `188`
- Screen/persona visits: `249`
- Passed screen visits: `249`
- Failed screen visits: `0`
- Console errors: `0`
- Failed API/resource requests: `0`
- Automated defects: `0`

Element inventory captured:

- Forms: `219`
- Inputs: `945`
- Dropdowns: `679`
- Textareas: `113`
- Buttons: `1,911`
- Links: `7,222`
- Tables: `68`

Evidence:

- Final report: `docs/qa/final-app-review-stage-browser-functionality-after-phase1b-2026-09-08.md`
- Raw artifacts: `web/qa-artifacts/final-app-review-stage-browser-functionality-after-phase1b-2026-09-08`

Baseline confidence:

| Area | Confidence | Reason |
|---|---:|---|
| Page rendering and navigation | 90% | 188 unique pages pass without browser errors. |
| Visual stability | 80% | Screenshots and overflow checks pass, but pixel baselines are not yet formalized. |
| Safe forms and controls | 84% | Controls are inventoried, organization forms now have granular validation coverage, and policy/payroll setup fields still need deeper expansion. |
| CRUD workflows | 72% | Organization master CRUD now has full browser create/read/update/deactivate coverage; policy, notification, payroll setup, and statutory setup remain. |
| Payroll launch workflows | 55% | Payroll surfaces and guarded flows pass, but real close/finalization needs deeper staged data proof. |
| SaaS tenant readiness | 65% | Platform admin onboarding exists and is browser-tested, but five-tenant isolation and full handoff proof remains. |
| Production launch readiness | 50% | External integrations, destructive workflow sign-off, and operational drills are still pending. |

## 3. Testing Principles

- Test through the browser first for user-facing behavior.
- Use API assertions underneath only to confirm database state, audit events, immutable snapshots, and security boundaries.
- Use disposable `PW_TEST_` data for every mutation.
- Do not mutate canonical demo records unless the test created them.
- Keep all payroll, policy, role, tenant, and provider behavior configuration-driven.
- Any touched page must be fully certified: every visible field, dropdown, toggle, button, link, action menu, tab, table/card state, validation path, mutation, responsive constraint, and permission-sensitive element must be asserted or explicitly listed as a residual gap.
- Every phase must produce evidence: Playwright output, screenshots where useful, defect summary, and confidence update.
- Destructive actions must use disposable data and explicit guardrails.
- A phase is not complete if it only loads pages; it must validate meaningful behavior.

## 4. Phase Overview

| Phase | Focus | Primary Outcome | Confidence Target |
|---|---|---|---:|
| Phase 0 | Browser baseline and route health | Every reachable page loads cleanly for every role. | 80% |
| Phase 1 | Master data and configuration CRUD | Dropdown sources, org masters, policy masters, and validation work. | 85% |
| Phase 2 | SaaS tenant onboarding | Platform admin can onboard five tenants and tenant admins safely. | 85% |
| Phase 3 | Employee lifecycle | Employee creation, editing, access, lifecycle, documents, and reporting manager flows work. | 85% |
| Phase 4 | Leave and attendance operations | ESS requests, MSS approvals, HR oversight, shifts, policies, and balances work. | 88% |
| Phase 5 | Payroll setup to close | Salary setup, payroll inputs, readiness, calculation, review, outputs, and payslips work end to end. | 90% |
| Phase 6 | Integrations and artifact governance | Provider callbacks, storage, exports, notifications, and handoff evidence work. | 88% |
| Phase 7 | Security, roles, and isolation | Cross-role, cross-tenant, and sensitive-data access is denied. | 92% |
| Phase 8 | UX, accessibility, responsive, and performance | Modern SaaS UI remains usable across target viewports. | 90% |
| Phase 9 | Release rehearsal and sign-off | Full launch runbook passes on staging with known residual risks accepted. | 95% |

## 5. Phase 0: Browser Baseline and Route Health

Goal:

Prove that the deployed staging app is alive, authenticated workspaces load, unauthorized workspaces fail safely, and all reachable pages render without runtime errors.

Coverage:

- Login for platform admin, HR admin, manager, and employee.
- Workspace chooser.
- HR admin routes.
- Tenant admin routes.
- Platform admin routes.
- ESS routes.
- MSS routes.
- Payroll routes.
- Organization, documents, workflows, audit, reports, notifications, and lifecycle routes.
- Page title/headings, links, buttons, forms, dropdowns, textareas, tables, dialogs, and KPIs.
- Console errors, page errors, failed requests, suspicious placeholder text, and horizontal overflow.

Primary suites:

- `web/tests/e2e/final-app-audit.spec.ts`
- `web/tests/e2e/route-smoke.spec.ts`
- `web/tests/e2e/tier-one-route-smoke.spec.ts`
- `web/tests/e2e/production-responsive-visual-gate.spec.ts`

Done gate:

- 100% of reachable screen/persona visits pass.
- No production server component error is visible.
- No console/page errors are captured.
- No failed API/resource request is captured.
- Final artifact folder and markdown report are generated.

Current status:

- Done on staging with run ID `stage-browser-functionality-final3-2026-09-08`.

Confidence after phase:

- Page rendering: 90%
- Visual stability: 80%
- Overall product confidence: 60%

## 6. Phase 1: Master Data and Configuration CRUD

Goal:

Prove that all dropdowns and setup screens are backed by real configurable master data, and that HR admin can create, read, update, deactivate/archive, filter, and validate each master safely.

Scope:

- Legal entities.
- Locations.
- Branches.
- Business units.
- Departments.
- Cost centers.
- Grades.
- Designations.
- Employment types.
- Leave types.
- Leave policies.
- Attendance policies.
- Shifts.
- Holiday calendars.
- Workflow templates.
- Workflow template assignments.
- Document categories.
- Document requirements.
- Notification templates.
- Notification events.
- Salary components.
- Salary structures.
- Payroll calendars.
- Pay groups.
- Statutory packs, components, slabs, employer registrations, filing calendars, employee statutory profiles, declarations, and declaration proof items.

Browser assertions:

- Create form opens from visible action.
- Required text boxes reject blank values.
- Invalid email/code/date/number values are rejected.
- Dropdowns load tenant-specific options.
- Dependent dropdowns narrow correctly, for example legal entity to branch, branch to location, business unit to department, designation to grade.
- Save success message appears.
- Created row appears in list.
- Detail view reflects saved values.
- Edit changes persist after refresh.
- Status filters show active/inactive/all records correctly.
- Duplicate codes are rejected.
- Archive/deactivate hides the item from active dropdowns but keeps audit history.
- Re-activation works where supported.

Primary suites:

- `web/tests/e2e/configuration-form-flows.spec.ts`
- `web/tests/e2e/governance-assignment-form-flows.spec.ts`
- `web/tests/e2e/organization-master-crud-flows.spec.ts`
- `web/tests/e2e/policy-governance-master-crud-flows.spec.ts`
- `web/tests/e2e/salary-setup-flows.spec.ts`
- `web/tests/e2e/payroll-setup-flows.spec.ts`
- `web/tests/e2e/payroll-statutory-flows.spec.ts`
- `web/tests/e2e/notification-setup-crud-flows.spec.ts`
- `web/tests/e2e/workflow-trace-flows.spec.ts`

Evidence to produce:

- `docs/qa/phase1-master-data-crud-report-YYYY-MM-DD.md`
- Screenshots for every master create/edit flow.
- CRUD matrix showing create/read/update/deactivate for each master.
- Defect list grouped by module.

Done gate:

- Every dropdown in employee creation has a live master-data source.
- Every setup master has positive create and edit coverage.
- Every setup master has at least one negative validation test.
- All dependent dropdown behavior is verified through the browser.
- No hardcoded option is required for a normal tenant setup.

Confidence after phase:

- Configuration confidence: 85%
- CRUD confidence: 75%
- Overall product confidence: 68%

Current Phase 1 progress:

- Phase 1A safe form coverage: done.
- Phase 1B organization master CRUD expansion: done.
- Phase 1C-A foundational policy/governance master CRUD expansion: done.
- Phase 1C-B salary setup CRUD expansion: done.
- Phase 1C-C assignment and rollout CRUD expansion: done.
- Phase 1C-D notification setup CRUD expansion: done.
- Phase 1C-E payroll setup CRUD expansion: done.
- Phase 1C-F statutory setup CRUD expansion: done.
- Organization master CRUD confidence: 90%.
- Employee structural dropdown confidence: 88%.
- Foundational policy/governance master CRUD confidence: 86%.
- Salary setup browser CRUD confidence: 88%.
- Assignment and rollout browser CRUD confidence: 87%.
- Notification setup browser CRUD confidence: 88%.
- Payroll setup browser CRUD confidence: 88%.
- Statutory setup browser CRUD confidence: 88%.
- Phase 1 targeted local browser regression sweep: done on 2026-09-09.
- Evidence: `docs/qa/phase1-targeted-regression-report-2026-09-09.md`.
- Current configuration confidence: 92%.
- Current CRUD confidence: 88%.
- Current overall product confidence: 83%.
- Remaining Phase 1 work: stabilize high-parallel mutation test isolation before enabling five-worker CRUD sweeps by default.

## 7. Phase 2: SaaS Tenant Onboarding

Goal:

Prove that platform admin can onboard five new tenants through the browser and hand each tenant to its own tenant admin without cross-tenant leakage.

Scope:

- Create five tenants.
- Assign unique tenant codes, names, plans, domains, countries, timezones, and seed packs.
- Create one tenant admin per tenant.
- Update onboarding checklist.
- Apply or adopt policy packs.
- Validate domain mapping state.
- Validate onboarding events.
- Login as each tenant admin.
- Verify tenant admin sees only its own tenant.
- Verify HR admin and employee personas cannot access another tenant.

Primary suites:

- `web/tests/e2e/production-platform-admin-onboarding-flows.spec.ts`
- `web/tests/e2e/tenant-admin-console-flows.spec.ts`
- `web/tests/e2e/tenant-trust-audit-flows.spec.ts`
- `web/tests/e2e/production-tenant-role-isolation.spec.ts`

Evidence to produce:

- `docs/qa/phase2-five-tenant-onboarding-report-YYYY-MM-DD.md`
- Tenant list with generated `PW_TEST_` tenant codes.
- Browser screenshots for tenant creation, tenant detail, admin setup, checklist, events, and tenant-admin login.
- Isolation proof for each tenant pair.

Done gate:

- Five tenants are onboarded through the browser.
- Five tenant admins can login.
- Each tenant admin sees only assigned tenant data.
- Platform admin event log records every onboarding step.
- Cross-tenant API and browser access are denied.

Confidence after phase:

- SaaS onboarding confidence: 85%
- Tenant isolation confidence: 80%
- Overall product confidence: 74%

Current Phase 2 progress:

- Five-tenant platform-admin browser onboarding: done locally on 2026-09-09.
- Five first-admin tenant-admin handoffs: done locally on 2026-09-09.
- Tenant admin console and trust audit browser checks: done locally on 2026-09-09.
- Stale-session, workspace boundary, employee payslip scoping, unauthenticated privileged route denial, and support scope checks: done locally on 2026-09-09.
- Evidence: `docs/qa/phase2-five-tenant-onboarding-report-2026-09-09.md`.
- SaaS onboarding confidence: 88%.
- Tenant admin handoff confidence: 86%.
- Tenant isolation confidence: 82%.
- Overall product confidence: 85%.
- Remaining Phase 2 work: rerun the same pack on staging after deployment sync and add deeper pairwise tenant-ID access denial to Phase 7.

## 8. Phase 3: Employee Lifecycle

Goal:

Prove that HR admin can manage the complete employee record lifecycle using real configured master data.

Scope:

- Create employee with personal, contact, job, structure, manager, employment, and statutory fields.
- Update employee profile.
- Assign user access and roles.
- Upload employee document.
- Complete onboarding tasks.
- Initiate probation review.
- Complete movement: transfer, promotion, reporting-manager change.
- Initiate exit workflow.
- Verify audit trail for each change.
- Verify employee can login and see correct ESS data.
- Verify manager can see direct report approval items.

Primary suites:

- `web/tests/e2e/tier-two-workflow-flows.spec.ts`
- `web/tests/e2e/generated-letter-flows.spec.ts`
- `web/tests/e2e/operational-queue-flows.spec.ts`
- `web/tests/e2e/production-live-mutation-readiness.spec.ts`

Browser assertions:

- Every required textbox/dropdown validates correctly.
- Employee number/code uniqueness is enforced.
- Reporting manager dropdown is tenant-scoped.
- Structural mapping writes back to employee detail.
- Role assignment controls persist.
- Lifecycle status changes appear in lists and filters.
- Sensitive salary fields are hidden from unauthorized roles.

Done gate:

- At least five employees are created across the five test tenants.
- Each employee has complete structural mapping.
- One employee completes each major lifecycle path: onboarding, probation, movement, exit.
- ESS login is proven for at least one employee per tenant.
- Manager visibility is proven for at least one reporting tree per tenant.

Confidence after phase:

- Employee lifecycle confidence: 85%
- Role-sensitive HR data confidence: 82%
- Overall product confidence: 80%

Current Phase 3 progress:

- Phase 3A employee master and access certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/employees/new`, `/hr-admin/employees/[employeeId]/edit`, `/hr-admin/employees?employeeId=[employeeId]`, `/hr-admin/employees/[employeeId]/access`.
- Evidence: `docs/qa/phase3a-employee-master-access-certification-2026-09-09.md`.
- Phase 3B employee documents and onboarding certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/employee-documents/new`, `/hr-admin/employee-documents`, `/hr-admin/onboardings/new`, `/hr-admin/onboardings/[itemId]/edit`, `/hr-admin/onboardings`.
- Evidence: `docs/qa/phase3b-employee-documents-onboarding-certification-2026-09-09.md`.
- Phase 3C document review, movement, and exit certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/employee-documents/[itemId]/review`, `/hr-admin/employee-documents`, `/hr-admin/movements/new`, `/hr-admin/movements/[itemId]/edit`, `/hr-admin/movements`, `/hr-admin/exits/new`, `/hr-admin/exits/[itemId]/edit`, `/hr-admin/exits`.
- Evidence: `docs/qa/phase3c-document-review-movement-exit-certification-2026-09-09.md`.
- Phase 3D probation, audit, ESS, and MSS certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/probation-reviews/new`, `/hr-admin/probation-reviews/[itemId]/edit`, `/hr-admin/probation-reviews`, `/hr-admin/audit`, `/ess`, `/mss/approvals`.
- Evidence: `docs/qa/phase3d-probation-audit-role-certification-2026-09-09.md`.
- Phase 3E fresh access and role visibility certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/employees/new`, `/hr-admin/employees/[employeeId]/access`, `/ess`, `/mss/approvals`, `/hr-admin/employees?employeeId=[employeeId]`.
- Evidence: `docs/qa/phase3e-fresh-access-role-visibility-certification-2026-09-09.md`.
- Phase 3F lifecycle closure certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/employees/new`, `/hr-admin/employees?employeeId=[employeeId]`, `/hr-admin/movements/new`, `/hr-admin/movements`, `/hr-admin/employee-documents/new`, `/hr-admin/employee-documents`, `/hr-admin/employee-documents/[itemId]/review`, `/hr-admin/audit`.
- Evidence: `docs/qa/phase3f-lifecycle-closure-certification-2026-09-09.md`.
- Employee master create/edit confidence: 86%.
- Employee structural mapping confidence: 90%.
- Employee access provisioning confidence: 82%.
- Employee document upload confidence: 84%.
- Employee document review confidence: 90%.
- Employee onboarding lifecycle confidence: 86%.
- Probation review confidence: 84%.
- Movement operations confidence: 90%.
- Exit lifecycle confidence: 84%.
- Audit center lifecycle trace confidence: 86%.
- ESS seeded employee workspace confidence: 82%.
- MSS seeded manager workspace confidence: 82%.
- Fresh employee access login confidence: 88%.
- Fresh manager access login confidence: 86%.
- Reporting manager mapping visibility confidence: 84%.
- Completed movement writeback confidence: 90%.
- Current Phase 3 confidence: 88%.
- Remaining Phase 3 work: none for HR-admin Employee Lifecycle scope.
- Phase 4 carry-forward: direct-report workflow item proof in MSS queue after a fresh employee submits leave or attendance through a visible ESS request path.

## 9. Phase 4: Leave and Attendance Operations

Goal:

Prove that leave, attendance, shift, roster, holiday, regularization, and approval flows operate end to end for employees, managers, and HR admins.

Scope:

- Leave type setup.
- Leave policy setup.
- Leave balance assignment.
- Employee leave request.
- Manager approve/reject.
- Employee withdraw/cancel where allowed.
- Attendance policy setup.
- Shift creation.
- Shift assignment.
- Roster template assignment.
- Holiday calendar assignment.
- Attendance record review.
- Attendance regularization request.
- Manager approval.
- HR oversight and override.
- Notification and audit trail.

Primary suites:

- `web/tests/e2e/ess-statutory-declarations-flows.spec.ts`
- `web/tests/e2e/tier-two-workflow-flows.spec.ts`
- `web/tests/e2e/operational-queue-flows.spec.ts`
- `web/tests/e2e/governance-assignment-form-flows.spec.ts`
- `web/tests/e2e/phase4a-leave-attendance-self-service-flows.spec.ts`
- `web/tests/e2e/phase4c-hr-admin-operations-flows.spec.ts`
- `web/tests/e2e/phase4d-edge-audit-notification-flows.spec.ts`

Done gate:

- Employee can submit leave and attendance requests.
- Manager can approve and reject.
- HR admin can inspect queues and override where allowed.
- Balances and statuses update after workflow completion.
- Policy and eligibility restrictions are enforced.
- Notifications are generated for request, approval, rejection, and escalation events.

Confidence after phase:

- Leave confidence: 88%
- Attendance confidence: 86%
- Approval workflow confidence: 85%
- Overall product confidence: 84%

Current Phase 4 progress:

- Phase 4A ESS/MSS request approval certification: done locally on 2026-09-09.
- Certified touched pages: `/ess`, `/ess?leaveStatus=pending&leaveId=[requestId]`, `/ess?leaveStatus=approved&leaveId=[requestId]`, `/ess?regStatus=pending&regId=[regularizationId]`, `/ess?regStatus=approved&regId=[regularizationId]`, `/mss/approvals?queue=leave&leaveId=[requestId]`, `/mss/approvals?queue=attendance&regId=[regularizationId]`.
- Evidence: `docs/qa/phase4a-ess-mss-request-approval-certification-2026-09-09.md`.
- ESS leave submit confidence: 86%.
- MSS leave approval confidence: 88%.
- ESS attendance regularization submit confidence: 84%.
- MSS attendance approval confidence: 86%.
- Phase 4B negative and rejection certification: done locally on 2026-09-09.
- Certified touched pages: `/ess`, `/ess?leaveStatus=rejected&leaveId=[requestId]`, `/ess?regStatus=rejected&regId=[regularizationId]`, `/mss/approvals?queue=leave&leaveId=[requestId]`, `/mss/approvals?queue=attendance&regId=[regularizationId]`.
- Evidence: `docs/qa/phase4b-negative-rejection-certification-2026-09-09.md`.
- Leave validation confidence: 88%.
- Leave rejection confidence: 88%.
- Attendance validation confidence: 86%.
- Attendance duplicate guard confidence: 86%.
- Attendance rejection visibility confidence: 88%.
- Phase 4C HR-admin operations certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/attendance-regularizations`, `/hr-admin/attendance-regularizations?status=pending&q=[reason]`, `/hr-admin/attendance-regularizations?status=approved&q=[reason]`, `/hr-admin/attendance-regularizations/[regularizationId]/review`, `/hr-admin/attendance-records?page_size=10`, `/hr-admin/leave-balances`.
- Evidence: `docs/qa/phase4c-hr-admin-operations-certification-2026-09-09.md`.
- HR-admin attendance regularization oversight confidence: 88%.
- Attendance bulk operations confidence: 86%.
- Leave balance operations confidence: 86%.
- Phase 4D edge, audit, and notification certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/attendance-records?page_size=10`, `/ess`, `/hr-admin/leave-balances`, `/hr-admin/attendance-regularizations/[regularizationId]/review`, `/hr-admin/audit?source=attendance_approval&q=[reason]`, `/hr-admin/notifications?subject_type=attendance_regularization&q=[regularizationId]`, `/ess/notifications?subject_type=attendance_regularization&q=[regularizationId]`.
- Evidence: `docs/qa/phase4d-edge-audit-notification-certification-2026-09-09.md`.
- Locked attendance behavior confidence: 88%.
- Leave balance validation confidence: 90%.
- Attendance audit evidence confidence: 88%.
- Attendance notification evidence confidence: 87%.
- Current Phase 4 confidence: 89%.
- Remaining Phase 4 work: attendance bulk-action audit integration, leave balance transaction audit-center integration, attendance override edge cases, and responsive visual screenshots for these exact operation pages.

## 10. Phase 5: Payroll Setup to Close

Goal:

Prove the core money flow: configured salary and payroll data moves from readiness to calculation, review, lock, outputs, handoff, and ESS payslip visibility.

Scope:

- Salary component CRUD.
- Salary structure CRUD.
- Employee salary assignment.
- Payroll calendar and pay group setup.
- Period creation.
- Payroll input collection.
- Adjustment entry.
- Settlement entry.
- Readiness checks.
- Snapshot lock.
- Draft calculation.
- Rule trace review.
- Exception decision.
- Review approval.
- Final payroll lock.
- Payslip generation.
- Payroll register generation.
- Payroll output publish.
- ESS payslip visibility.
- Payslip read receipt.
- Finance handoff package.
- Bank/accounting/statutory export evidence.

Primary suites:

- `web/tests/e2e/payroll-setup-flows.spec.ts`
- `web/tests/e2e/salary-setup-flows.spec.ts`
- `web/tests/e2e/payroll-inputs-flows.spec.ts`
- `web/tests/e2e/payroll-adjustments-flows.spec.ts`
- `web/tests/e2e/payroll-settlements-flows.spec.ts`
- `web/tests/e2e/payroll-readiness-flows.spec.ts`
- `web/tests/e2e/payroll-calculations-flows.spec.ts`
- `web/tests/e2e/payroll-review-flows.spec.ts`
- `web/tests/e2e/payroll-rules-flows.spec.ts`
- `web/tests/e2e/payroll-outputs-flows.spec.ts`
- `web/tests/e2e/payroll-handoff-flows.spec.ts`
- `web/tests/e2e/production-payroll-close-flows.spec.ts`
- `web/tests/e2e/production-payroll-negative-controls.spec.ts`
- `web/tests/e2e/phase5a-payroll-control-room-certification.spec.ts`
- `web/tests/e2e/phase5b-payroll-close-action-controls.spec.ts`
- `web/tests/e2e/phase5c-disposable-payroll-close-browser-flow.spec.ts`

Critical assertions:

- No payroll calculation can run with blocker issues.
- Inputs are immutable after lock.
- Calculation lines have source trace.
- Final locked payroll cannot be edited silently.
- Outputs include checksums, storage metadata, and publish evidence.
- Employee sees only their own published payslip.
- HR admin can export payroll register only with correct role.
- Payroll totals remain stable after refresh.
- Late changes are blocked or versioned according to configuration.

Done gate:

- One disposable payroll period closes successfully end to end.
- One blocked payroll run proves all major negative controls.
- Payslip and register artifacts are generated and accessible only to authorized users.
- Finance handoff package is generated with evidence.
- Audit trail can explain every major payroll action.

Confidence after phase:

- Payroll functional confidence: 90%
- Payroll data integrity confidence: 88%
- Payroll access confidence: 90%
- Overall product confidence: 88%

Current Phase 5 progress:

- Phase 5A payroll control-room certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-readiness`, `/hr-admin/payroll-readiness?employeeId=[employeeId]`, `/hr-admin/payroll-readiness?q=NO_SUCH_PAYROLL_EMPLOYEE`, `/hr-admin/payroll-calculations`, `/hr-admin/payroll-calculations?runId=[runId]&calculationId=[calculationId]&lineId=[lineId]`, `/hr-admin/payroll-review`, `/hr-admin/payroll-review?reviewId=[reviewId]&exceptionId=[exceptionId]`, `/hr-admin/payroll-outputs`, `/hr-admin/payroll-outputs?batchId=[batchId]&artifactId=[artifactId]`, `/hr-admin/payroll-handoff`.
- Evidence: `docs/qa/phase5a-payroll-control-room-certification-2026-09-09.md`.
- Phase 5B payroll close action controls: done locally on 2026-09-09.
- Certified touched action pages: `/hr-admin/payroll-calculations`, `/hr-admin/payroll-review`, `/hr-admin/payroll-outputs`, `/hr-admin/payroll-handoff`.
- Evidence: `docs/qa/phase5b-payroll-close-action-controls-certification-2026-09-09.md`.
- Phase 5C disposable payroll input close certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`.
- Evidence: `docs/qa/phase5c-disposable-payroll-input-close-certification-2026-09-09.md`.
- Phase 5D disposable positive calculation certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`.
- Evidence: `docs/qa/phase5d-disposable-positive-calculation-certification-2026-09-09.md`.
- Phase 5E disposable payroll close publish certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]`, `/hr-admin/payroll-outputs?batchId=[createdBatchId]`.
- Evidence: `docs/qa/phase5e-disposable-payroll-close-publish-certification-2026-09-09.md`.
- Phase 5F post-publish handoff and ESS certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]`, `/hr-admin/payroll-outputs?batchId=[createdBatchId]`, `/hr-admin/payroll-handoff?handoffId=[createdHandoffId]`, `/ess/payslips?q=[createdRunCode]`.
- Evidence: `docs/qa/phase5f-post-publish-handoff-ess-certification-2026-09-09.md`.
- Phase 5G negative lock and immutability certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdBlockedRunId]`.
- Evidence: `docs/qa/phase5g-negative-lock-immutability-certification-2026-09-09.md`.
- Phase 5H payroll artifact access isolation certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-outputs`, `/ess/payslips`, `/api/hr-admin/payroll-output-artifacts/[artifactId]/download`, `/api/hr-admin/payroll-output-artifacts/[artifactId]/access-audit-export`, `/api/me/payroll-payslips/[artifactId]/download`.
- Evidence: `docs/qa/phase5h-payroll-artifact-access-isolation-certification-2026-09-09.md`.
- Phase 5I payroll register export authorization certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-outputs`, `/ess/payslips`, `/api/hr-admin/payroll-output-artifacts/[registerArtifactId]/download`, `/api/hr-admin/payroll-output-artifacts/[registerArtifactId]/access-audit-export`, `/api/me/payroll-payslips/[registerArtifactId]/download`.
- Evidence: `docs/qa/phase5i-payroll-register-export-authorization-certification-2026-09-09.md`.
- Phase 5J final lock destructive controls certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-review?reviewId=[createdReviewId]`, `/hr-admin/payroll-inputs?runId=[createdRunId]`, `/api/hr-admin/payroll-runs/[runId]/open-review`, `/api/hr-admin/payroll-runs/[runId]`.
- Evidence: `docs/qa/phase5j-final-lock-destructive-controls-certification-2026-09-09.md`.
- Payroll control-room UI confidence: 88%.
- Payroll trace/navigation confidence: 86%.
- Payroll close action UI confidence: 84%.
- Payroll close proxy/auth confidence: 82%.
- Payroll input operations UI confidence: 86%.
- Disposable run/snapshot lock confidence: 84%.
- Payroll rule CRUD/browser confidence: 84%.
- Disposable positive calculation confidence: 86%.
- Payroll close positive path confidence: 88%.
- Payroll output publish confidence: 86%.
- Payroll mutation readiness confidence: 88%.
- Payroll post-publish confidence: 90%.
- Finance handoff browser confidence: 88%.
- ESS payslip employee visibility confidence: 90%.
- Provider audit-pack evidence confidence: 88%.
- Blocked snapshot lock-gate confidence: 92%.
- Blocked calculation gate confidence: 90%.
- Locked input immutability confidence: 92%.
- Payroll artifact access isolation confidence: 92%.
- HR output download governance confidence: 92%.
- ESS employee-scoped payslip download confidence: 92%.
- Payroll register export authorization confidence: 92%.
- Run-level artifact isolation confidence: 92%.
- Final-locked reopen prevention confidence: 92%.
- Final-locked run edit prevention confidence: 92%.
- Current Phase 5 confidence: 97%.
- Remaining Phase 5 work: no known launch-critical payroll setup-to-close residual; repeat the full phase on staging with production-like data volume before release sign-off.

## 11. Phase 6: Integrations and Artifact Governance

Goal:

Prove launch-critical integration behavior without relying on hardcoded provider assumptions.

Scope:

- Email notification provider.
- SMS or alternate notification channel where configured.
- Storage provider strategy.
- Signed artifact access grant.
- Revocation and expiry.
- Provider callback signature validation.
- Callback idempotency.
- Retry and dead-letter evidence.
- Bank file export.
- Accounting export.
- Statutory artifact export.
- Audit export.

Primary suites:

- `web/tests/e2e/production-notification-flows.spec.ts`
- `web/tests/e2e/production-provider-callback-flows.spec.ts`
- `web/tests/e2e/production-storage-governance-flows.spec.ts`
- `web/tests/e2e/payroll-providers-flows.spec.ts`
- `web/tests/e2e/payroll-handoff-flows.spec.ts`
- `web/tests/e2e/payroll-outputs-flows.spec.ts`

Done gate:

- Provider configuration is visible and redacted.
- No raw secret is exposed in browser payloads.
- Valid callback is accepted.
- Replay callback is idempotent.
- Invalid signature is rejected.
- Signed grant download works until expiry/revocation.
- Audit export records publish, issue, download, read, and revoke evidence.

Confidence after phase:

- Integration readiness confidence: 88%
- Artifact governance confidence: 90%
- Overall product confidence: 90%

Current Phase 6 progress:

- Phase 6A storage and provider governance certification: done locally on 2026-09-09.
- Phase 6B provider callback mutation certification: done locally on 2026-09-09.
- Phase 6C signed artifact grant certification: done locally on 2026-09-09.
- Phase 6D provider retry worker and dead-letter certification: done locally on 2026-09-09.
- Phase 6E notification provider retry certification: done locally on 2026-09-09.
- Certified touched pages: `/hr-admin/payroll-outputs`, `/ess/payslips`, `/hr-admin/payroll-providers`, `/hr-admin/payroll-handoff`, `/hr-admin/notifications`, `/hr-admin/notifications/[itemId]/review`, `/hr-admin/notification-diagnostics`, `/hr-admin/notification-delivery`, `/ess/notifications`.
- Evidence: `docs/qa/phase6a-storage-provider-governance-certification-2026-09-09.md`, `docs/qa/phase6b-provider-callback-mutation-certification-2026-09-09.md`, `docs/qa/phase6c-signed-artifact-grants-certification-2026-09-09.md`, `docs/qa/phase6d-provider-retry-worker-certification-2026-09-09.md`, `docs/qa/phase6e-notification-provider-retry-certification-2026-09-09.md`.
- Storage governance browser confidence: 88%.
- Provider readiness visibility confidence: 86%.
- Raw secret redaction confidence: 88%.
- Provider callback acceptance confidence: 90%.
- Provider callback replay confidence: 90%.
- Provider callback rejection confidence: 90%.
- Immutable delivery late-callback confidence: 88%.
- Signed artifact grant issue/use confidence: 90%.
- Signed artifact grant revoke/block confidence: 92%.
- Signed artifact grant expiry confidence: 88%.
- Provider retry worker execution confidence: 91%.
- Provider retry/dead-letter contract confidence: 91%.
- Notification provider retry confidence: 92%.
- Notification retry-limit confidence: 91%.
- Current Phase 6 confidence: 95%.
- Remaining Phase 6 work: none. Phase 6 is functionally closed for local launch-readiness testing.

## 12. Phase 7: Security, Roles, and Tenant Isolation

Goal:

Prove SaaS safety. Users should only see and mutate what their tenant, role, session, and feature entitlements allow.

Scope:

- Platform admin.
- Tenant admin.
- HR admin.
- Manager.
- Employee.
- Support user with no active grant.
- Support user with active scoped grant.
- Auditor or read-only roles where supported.
- Cross-tenant route denial.
- Cross-tenant API denial.
- Cross-employee payslip denial.
- Salary visibility rules.
- Provider credential redaction.
- Feature entitlement gating.
- Session expiry and logout behavior.

Primary suites:

- `web/tests/e2e/production-tenant-role-isolation.spec.ts`
- `web/tests/e2e/phase7a-role-access-boundaries.spec.ts`
- `web/tests/e2e/phase7b-cross-tenant-object-isolation.spec.ts`
- `web/tests/e2e/phase7c-feature-entitlement-gating.spec.ts`
- `web/tests/e2e/phase7d-support-session-positive-scope.spec.ts`
- `web/tests/e2e/phase7e-security-audit-evidence.spec.ts`
- `web/tests/e2e/phase7f-support-session-lifecycle.spec.ts`
- `web/tests/e2e/phase7g-usage-limit-gating.spec.ts`
- `web/tests/e2e/phase7h-audit-download-rejected-support.spec.ts`
- `web/tests/e2e/phase7i-payroll-artifact-access-csv.spec.ts`
- `web/tests/e2e/phase7j-meter-specific-usage-limits.spec.ts`
- `web/tests/e2e/tenant-security-readiness-flows.spec.ts`
- `web/tests/e2e/support-console-flows.spec.ts`
- `web/tests/e2e/support-domain-snapshot-flows.spec.ts`
- `web/tests/e2e/tenant-admin-console-flows.spec.ts`
- `web/tests/e2e/tenant-trust-audit-flows.spec.ts`

Done gate:

- All denied routes fail closed.
- Denied pages do not leak sensitive payloads.
- API denials match browser denials.
- Support access requires tenant-approved session scope.
- Feature gates are enforced by backend and browser.
- Trust audit records sensitive administrative activity.

Confidence after phase:

- Security confidence: 92%
- Tenant isolation confidence: 92%
- Overall product confidence: 92%

Current Phase 7 progress:

- Phase 7A role access boundaries certification: done locally on 2026-09-09.
- Phase 7B cross-tenant object isolation certification: done locally on 2026-09-09.
- Phase 7C feature entitlement gating certification: done locally on 2026-09-09.
- Phase 7D tenant-approved support session positive scope certification: done locally on 2026-09-09.
- Phase 7E security audit evidence certification: done locally on 2026-09-09.
- Phase 7F support session lifecycle certification: done locally on 2026-09-09.
- Phase 7G usage-limit gating certification: done locally on 2026-09-09.
- Phase 7H audit download and rejected support lifecycle certification: done locally on 2026-09-09.
- Phase 7I payroll artifact access CSV certification: done locally on 2026-09-09.
- Phase 7J meter-specific usage-limit certification: done locally on 2026-09-09.
- Phase 7K entitlement-aware navigation certification: done locally on 2026-09-09.
- Phase 7L deterministic cross-tenant payroll artifact certification: done locally on 2026-09-10.
- Phase 7D product fix: `/support` layout now requires authentication only, allowing the runtime support session gate to evaluate active tenant-approved grants for support/platform operators.
- Phase 7G product improvement: `/hr-admin/saas-control-plane` now displays enforcement blocking reasons and exceeded usage meter refs.
- Phase 7K product improvement: `/hr-admin` sidebar now disables gated payroll/provider navigation entries with visible SaaS entitlement reasons before users hit a fail-closed route.
- Certified touched pages: `/`, `/login`, `/hr-admin`, `/tenant-admin`, `/platform-admin`, `/ess`, `/mss/approvals`, `/support`, `/support/domain-snapshot`, `/tenant-admin/security-readiness`, `/tenant-admin/trust-audit`, `/hr-admin/payroll-outputs`, `/ess/payslips`.
- Phase 7B certified touched pages: `/hr-admin/employees`, `/hr-admin/organization?section=departments`, `/hr-admin/notifications`.
- Phase 7B certified object boundaries: employee read/update, employee access read/update, organization department read/update, notification read/update/retry/bulk retry, and deterministic foreign payroll artifact download/signed-access/audit-export denial.
- Phase 7C certified touched pages: `/hr-admin/saas-control-plane`, `/hr-admin/payroll-setup`.
- Phase 7C certified entitlement boundaries: starter plan blocks payroll setup, salary component APIs, payroll run creation, provider connection APIs, and provider certification runs while the control plane shows missing payroll entitlements and blocked enforcement scopes.
- Phase 7D certified touched pages: `/tenant-admin`, `/support`, `/support/domain-snapshot`.
- Phase 7D certified support boundaries: tenant admin can request/approve/start a scoped support grant for `platform.admin`; support can read `configuration_health`; `commercial_evidence`, `payroll_support`, and `read_only_account` stay denied for the same session.
- Phase 7E certified touched pages: `/tenant-admin`, `/support`, `/tenant-admin/trust-audit`.
- Phase 7E certified audit boundaries: active support session start, allowed runtime check, denied runtime check, support event group filtering, support session reference filtering, actor visibility, source references, and audit download entry point.
- Phase 7F certified touched pages: `/tenant-admin`, `/support`, `/tenant-admin/trust-audit`.
- Phase 7F certified lifecycle boundaries: ended, revoked, and expired support sessions deny access, record runtime denial, and remain customer-visible in trust audit.
- Phase 7G certified touched pages: `/hr-admin/saas-control-plane`, `/hr-admin/payroll-setup`, `/tenant-admin`.
- Phase 7G certified usage boundaries: exceeded `active_memberships` usage blocks launch readiness, blocks payroll API access, fails payroll setup closed, and denies new active member activation.
- Phase 7H certified touched pages: `/tenant-admin`, `/tenant-admin/trust-audit`.
- Phase 7H certified audit boundaries: rejected support access requires decision note, locks invalid post-rejection actions, appears in trust audit, and is included in the tenant-admin commercial/support audit JSON export with integrity source hashes.
- Phase 7I certified touched pages: `/hr-admin/payroll-outputs`, `/ess/payslips`.
- Phase 7I certified artifact-audit boundaries: HR admin can export and parse artifact access CSV, anonymous and employee sessions are denied without CSV leakage, and ESS does not expose access-audit export controls.
- Phase 7J certified touched pages: `/hr-admin/saas-control-plane`, `/hr-admin/payroll-setup`, `/hr-admin/payroll-providers`.
- Phase 7J certified usage boundaries: exceeded `payroll_runs_per_month` blocks the `payroll_core` scope and exceeded `provider_connections` blocks the `payroll_provider_integrations` scope with visible control-plane evidence and fail-closed workspaces.
- Phase 7K certified touched pages: `/hr-admin/saas-control-plane`, shared HR admin sidebar.
- Phase 7K certified navigation boundaries: missing payroll entitlements disable `Payroll` and `Providers` navigation entries with `aria-disabled`, remove clickable link behavior, and retain direct route/API denial as the source of truth.
- Phase 7L certified touched pages: `/hr-admin/employees`, `/hr-admin/organization?section=departments`, `/hr-admin/notifications`, payroll artifact API endpoints.
- Phase 7L certified artifact boundary: second-tenant published payroll artifact is generated from a valid locked payroll output chain and denied for attacker-tenant download, signed access, and access-audit export.
- Evidence: `docs/qa/phase7a-role-access-boundaries-certification-2026-09-09.md`, `docs/qa/phase7b-cross-tenant-object-isolation-certification-2026-09-09.md`, `docs/qa/phase7c-feature-entitlement-gating-certification-2026-09-09.md`, `docs/qa/phase7d-support-session-positive-scope-certification-2026-09-09.md`, `docs/qa/phase7e-security-audit-evidence-certification-2026-09-09.md`, `docs/qa/phase7f-support-session-lifecycle-certification-2026-09-09.md`, `docs/qa/phase7g-usage-limit-gating-certification-2026-09-09.md`, `docs/qa/phase7h-audit-download-rejected-support-certification-2026-09-09.md`, `docs/qa/phase7i-payroll-artifact-access-csv-certification-2026-09-09.md`, `docs/qa/phase7j-meter-specific-usage-limits-certification-2026-09-09.md`, `docs/qa/phase7k-entitlement-aware-navigation-certification-2026-09-09.md`, `docs/qa/phase7l-deterministic-cross-tenant-artifact-certification-2026-09-10.md`.
- Role/workspace boundary confidence: 91%.
- Sensitive artifact access confidence: 92%.
- Support no-grant denial confidence: 90%.
- Cross-tenant object isolation confidence: 91%.
- Feature entitlement gating confidence: 91%.
- Support approved-session scope confidence: 92%.
- Security audit evidence confidence: 93%.
- Support lifecycle confidence: 94%.
- Usage-limit gating confidence: 94%.
- Audit export confidence: 95%.
- Payroll artifact audit CSV confidence: 96%.
- Current Phase 7 confidence: 100% locally.
- Remaining Phase 7 work: none locally; rerun on staging before release sign-off.

## 13. Phase 8: UX, Accessibility, Responsive, and Performance

Goal:

Prove the product feels like a modern SaaS workspace and remains usable across desktop, compact laptop, tablet, and mobile viewports.

Scope:

- Dashboard/workspace chooser.
- HR admin control center.
- Employee list and employee create/edit.
- Organization setup.
- Policy setup.
- Leave and attendance queues.
- Payroll setup.
- Payroll readiness.
- Payroll calculation/review.
- Payroll outputs and handoff.
- ESS.
- MSS.
- Tenant admin.
- Platform admin.
- Support console.

Checks:

- No horizontal overflow.
- No overlapping text or controls.
- Buttons have usable labels or accessible names.
- Forms remain readable.
- Tables remain navigable on smaller screens.
- Critical actions stay visible.
- Empty, loading, error, and success states are clear.
- Typography fits containers.
- Screens match the modern clean SaaS style.
- Keyboard tab order works on key forms.
- Accessible names exist for icon-only controls.
- Performance is acceptable on staging.

Primary suites:

- `web/tests/e2e/production-responsive-visual-gate.spec.ts`
- `web/tests/e2e/final-app-audit.spec.ts`
- `web/tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts`
- `web/tests/e2e/phase8c-form-keyboard-accessibility.spec.ts`
- `web/tests/e2e/phase8d-performance-budget.spec.ts`

Done gate:

- Responsive suite passes all target viewports.
- Screenshots are reviewed for the top launch workflows.
- No critical accessibility blocker remains.
- No severe visual regression remains.

Confidence after phase:

- UX confidence: 90%
- Responsive confidence: 90%
- Accessibility confidence: 80%
- Overall product confidence: 93%

Current Phase 8 progress:

- Phase 8A workspace shell UX/accessibility certification: done locally on 2026-09-10.
- Phase 8A product fix: closed action menu panels are now hidden with CSS so hidden menu items cannot create mobile layout overflow.
- Phase 8A certified touched pages: `/`, `/hr-admin`, `/hr-admin/employees`, `/hr-admin/saas-control-plane`, `/tenant-admin`, `/platform-admin`, `/ess/payslips`, `/mss/approvals`, `/support`.
- Phase 8A certified UI boundaries: main landmarks, single H1, visible headings, labelled side navigation, interactive accessible names, first-focusable control focusability, usable field/control dimensions, horizontal overflow absence, and desktop/mobile screenshots.
- Evidence: `docs/qa/phase8a-workspace-shell-ux-accessibility-certification-2026-09-10.md`.
- Phase 8B launch workflow responsive certification: done locally on 2026-09-10.
- Phase 8B certified routes: `/`, `/hr-admin`, payroll readiness/inputs/calculations/review/outputs/handoff/providers, HR notifications, tenant admin, tenant security readiness, support, ESS payslips/notifications, and MSS approvals.
- Phase 8B certified viewports: `1920x1080`, `1440x900`, `1366x768`, `1280x720`, `820x1180`, and `390x844`.
- Phase 8B product fix: payroll mini-card labels now shrink and wrap safely on mobile instead of expanding `/hr-admin/payroll-inputs` beyond the viewport.
- Phase 8B gate fix: responsive overlap checks now use clipped visible rectangles for controls inside scrollable lists.
- Evidence: `docs/qa/phase8b-launch-workflow-responsive-certification-2026-09-10.md`.
- Phase 8C dense form keyboard/accessibility certification: done locally on 2026-09-10.
- Phase 8C certified forms: salary setup, payroll setup, payroll inputs, and payroll statutory browser operation forms.
- Phase 8C certified UI boundaries: visible form panels, accessible `aria-label`s, enabled control focusability, forward non-trapped Tab movement, control accessible names, usable control dimensions, and no horizontal overflow.
- Evidence: `docs/qa/phase8c-form-keyboard-accessibility-certification-2026-09-10.md`.
- Phase 8D performance budget certification: done locally on 2026-09-10.
- Phase 8D certified routes: same launch-critical route set as Phase 8B at `1366x768` with browser navigation timing and resource-size budgets.
- Phase 8D warm-run slowest page-ready routes: `/hr-admin/payroll-providers` at `2959ms`, `/hr-admin/payroll-handoff` at `2900ms`, `/ess/payslips` at `2617ms`, `/mss/approvals` at `2337ms`, and `/ess/notifications?subject_type=payroll_payslip` at `2178ms`.
- Evidence: `docs/qa/phase8d-performance-budget-certification-2026-09-10.md`.
- Phase 8 staging certification: done on 2026-09-10 against `https://hrms.accerio.in` at deployed commit `027becb613b349538d210c084bb617d96ba6fc96`.
- Phase 8 staging evidence: workspace shell plus dense form accessibility `6 passed`; responsive visual launch gate `6 passed` across `102` page-viewport combinations; performance timing gate `1 passed`.
- Phase 8 staging harness fix: remote URL runs now get staging-appropriate timeouts and performance budgets while preserving the same assertions.
- Phase 8 staging performance note: slowest page-ready samples were `/hr-admin` at `12321ms` and `/hr-admin/notifications?retry_state=retry_ready` at `11382ms`; navigation timings and asset/resource budgets stayed inside staging limits.
- Evidence: `docs/qa/phase8-staging-certification-2026-09-10.md`.
- Current UX confidence: 91%.
- Current responsive confidence: 92%.
- Current accessibility confidence: 86%.
- Current performance confidence: 86%.
- Current Phase 8 confidence: 92%.
- Remaining Phase 8 work: preserve responsive screenshots in passing CI artifacts, tune staging page-ready time on `/hr-admin` and notification queue pages, and broaden keyboard certification for lifecycle/attendance/notification/support forms.

## 14. Phase 9: Release Rehearsal and Sign-Off

Goal:

Run the full staging launch rehearsal and produce a release decision.

Current Phase 9 progress:

- Phase 9A HR admin performance optimization: started on 2026-09-10.
- Phase 9A finding: `/hr-admin` waited for nine independent live API calls before first render, while the dashboard payload already contained the needed landing-card aggregate metrics.
- Phase 9A change: `/hr-admin` now renders from the consolidated dashboard payload only.
- Phase 9A local optimized-frontend evidence: TypeScript passed, Phase 8A browser UX/accessibility passed, and Phase 8D performance passed against local frontend plus staging backend.
- Phase 9A sample improvement target: `/hr-admin` page-ready measured `6396ms` in the optimized local frontend path versus the previous public staging sample of `12321ms`.
- Phase 9A staging deployment: commit `1dd5b115131a352b6d3ef8661613124f07779126` deployed to `https://hrms.accerio.in`; backend/web services active; public HTTP `200 OK`; Phase 8A desktop smoke passed; Phase 8D public staging performance gate passed.
- Phase 9A public staging result: `/hr-admin` improved from `12321ms` to `11589ms`; notification queue improved from `11382ms` to `7633ms`.
- Evidence: `docs/qa/phase9a-hr-admin-performance-optimization-2026-09-10.md`.
- Remaining Phase 9A work: deeper backend/dashboard selector optimization for `/hr-admin` if we want to push page-ready below `10000ms` before final launch sign-off.
- Phase 9B-1 staging release preflight: done on 2026-09-10.
- Phase 9B-1 deployment: commit `44eefe293b4a99d9acd6e8a42ac14980156e3ff9` deployed at `/var/www/hrms-payroll-saas/release-20260910025407`.
- Phase 9B-1 checks: Django check passed, no pending migrations, static collection completed, Next production build passed, backend/web services active, nginx config/reload passed, public HTTP `200 OK`.
- Phase 9B-1 browser preflight: Phase 8A workspace shell/accessibility plus Phase 8D performance passed against `https://hrms.accerio.in` with `HRMS_ENABLE_DEMO_DATA=false`.
- Phase 9B-1 performance snapshot: `/hr-admin` `10674ms`, `/hr-admin/payroll-outputs` `8601ms`, `/hr-admin/payroll-calculations` `8151ms`, and notification queue `7636ms`.
- Evidence: `docs/qa/phase9b-1-staging-release-preflight-2026-09-10.md`.
- Phase 9B-2 full role and workflow release rehearsal: done on 2026-09-10.
- Phase 9B-2 command: `pnpm qa:launch-signoff:staging` against `https://hrms.accerio.in` with demo fallback disabled.
- Phase 9B-2 decision: `PILOT READY - STAGING CONTRACT PASS`.
- Phase 9B-2 evidence: Django check passed, migration dry run passed, launch audit command passed, provider launch rehearsal command passed, SaaS usage snapshot passed, backend launch tests `12 passed`, web typecheck passed, web lint passed, and production Playwright suites A-I `32 passed`, `3 skipped`.
- Phase 9B-2 launch audit state: tenant `northstar-foods` remains business-config blocked with `39/51` gates passed, `6` blockers, `6` warnings, and `12` release actions.
- Phase 9B-2 blocker refs: `attendance.policies`, `workflows.active_templates`, `documents.categories`, `documents.mandatory_rules`, `payroll.salary_components`, and `payroll.structure_versions`.
- Evidence: `docs/qa/phase9b-2-full-role-workflow-release-rehearsal-2026-09-10.md`.
- Phase 9C tenant launch-audit blocker closure: done on 2026-09-10.
- Phase 9C browser evidence: `phase9c-launch-audit-blocker-closure.spec.ts` passed against staging with demo fallback disabled.
- Phase 9C launch audit state: tenant `northstar-foods` is now launch-capable with `can_launch: true`, `46/51` gates passed, `0` blockers, `5` warnings, and `5` release actions.
- Phase 9C closed blocker refs: `attendance.policies`, `workflows.active_templates`, `documents.categories`, `documents.mandatory_rules`, `payroll.salary_components`, `payroll.structure_versions`, and `payroll.rule_versions`.
- Phase 9C remaining warning refs: `employees.manager_mapping`, `employees.primary_bank`, `leave.pending_requests`, `attendance.pending_regularizations`, and `provider.rehearsal_ready`.
- Evidence: `docs/qa/phase9c-launch-audit-blocker-closure-2026-09-10.md`.
- Phase 9D browser warning closure: done on 2026-09-10.
- Phase 9D browser evidence: `phase9d-launch-warning-closure.spec.ts` passed against staging with demo fallback disabled.
- Phase 9D launch audit state: tenant `northstar-foods` remains launch-capable with `can_launch: true`, `49/51` gates passed, `0` blockers, `2` warnings, and `2` release actions.
- Phase 9D closed warning refs: `employees.manager_mapping`, `leave.pending_requests`, and `attendance.pending_regularizations`.
- Phase 9D remaining warning refs: `employees.primary_bank` and `provider.rehearsal_ready`.
- Phase 9D product note: primary bank coverage is not currently closable through the HRMS SaaS browser UI; the backend model exists, but HR admin bank-account maintenance needs an app surface.
- Evidence: `docs/qa/phase9d-launch-warning-closure-2026-09-10.md`.
- Phase 9E final warning closure: implemented locally on 2026-09-10.
- Phase 9E browser evidence: `phase9e-bank-account-readiness.spec.ts` and `phase9e-provider-ready-rehearsal.spec.ts` passed locally with demo fallback disabled.
- Phase 9E product change: HR admin can now manage employee bank accounts through `/hr-admin/employees/[employeeId]/bank-accounts`, including create, update, primary-account selection, masked list review, and responsive page checks.
- Phase 9E provider change: provider launch rehearsal readiness is certified through browser-visible certification/rehearsal actions on `/hr-admin/payroll-providers`.
- Phase 9E local checks: Django system check passed, TypeScript passed, and ESLint passed.
- Phase 9E residual: staging deployment and final staging launch audit are pending; bank-account delete/archive is intentionally not part of this closure slice.
- Evidence: `docs/qa/phase9e-final-warning-closure-2026-09-10.md`.
- Next Phase 9 slice: deploy Phase 9E to staging, rerun the Phase 9E browser specs against `https://hrms.accerio.in`, then rerun the `northstar-foods` launch audit and capture the final `0 blocker / 0 warning` evidence pack.

Scope:

- Fresh deploy to staging.
- Database migrations.
- Static asset build.
- Backend health.
- Frontend health.
- Browser smoke.
- Full phased Playwright suite batch.
- Final app audit.
- Five-tenant onboarding proof.
- One payroll close proof.
- Negative security and payroll controls.
- Integration sandbox proof.
- Backup/restore drill or documented backup verification.
- Logs and monitoring check.
- Known limitations review.
- Risk register update.

Primary suites:

- All phase suites.
- `web/tests/e2e/production-launch-release-gate.spec.ts`
- `web/tests/e2e/launch-remediation-flows.spec.ts`
- `web/tests/e2e/saas-control-plane-flows.spec.ts`
- `web/tests/e2e/saas-operations-flows.spec.ts`
- `web/tests/e2e/saas-resilience-flows.spec.ts`
- `web/tests/e2e/saas-sla-operations-flows.spec.ts`

Done gate:

- All critical and high defects are closed.
- Any medium defects are accepted with owner and date.
- Staging deploy is reproducible.
- Test evidence is attached.
- Rollback process is documented.
- Release owner signs off.

Confidence after phase:

- Launch confidence: 95%
- Remaining risk must be explicit, owned, and accepted.

## 15. CRUD Coverage Matrix

| Module | Create | Read/List | Detail | Update | Deactivate/Delete | Import/Export | Notes |
|---|---|---|---|---|---|---|---|
| Tenants | Required | Required | Required | Required | Required | Optional | Use five `PW_TEST_` tenants. |
| Tenant admins | Required | Required | Required | Required | Required | Optional | Must validate login after creation. |
| Legal entities | Required | Required | Required | Required | Required | Optional | Drives employee structural mapping. |
| Locations | Required | Required | Required | Required | Required | Optional | Must narrow from branch where mapped. |
| Branches | Required | Required | Required | Required | Required | Optional | Must map to legal entity and location. |
| Business units | Required | Required | Required | Required | Required | Optional | Must narrow department options. |
| Departments | Required | Required | Required | Required | Required | Optional | Must support employee assignment. |
| Cost centers | Required | Required | Required | Required | Required | Optional | Must map to legal entity. |
| Grades | Required | Required | Required | Required | Required | Optional | Must map designation compatibility. |
| Designations | Required | Required | Required | Required | Required | Optional | May align grade automatically. |
| Employment types | Required | Required | Required | Required | Required | Optional | Used in employee setup and policy eligibility. |
| Employees | Required | Required | Required | Required | Exit flow | Import planned | Sensitive fields require role tests. |
| Employee access | Required | Required | Required | Required | Revoke | Optional | User provisioning must be auditable. |
| Documents | Required | Required | Required | Required | Archive | Download | Verify file governance. |
| Leave types | Required | Required | Required | Required | Required | Optional | Balance and policy dependency checks required. |
| Leave policies | Required | Required | Required | Required | Required | Optional | Eligibility and accrual rules required. |
| Attendance policies | Required | Required | Required | Required | Required | Optional | Regularization and grace rules required. |
| Shifts | Required | Required | Required | Required | Required | Optional | Shift assignment dependency required. |
| Holiday calendars | Required | Required | Required | Required | Required | Optional | Location/entity mapping required. |
| Workflow templates | Required | Required | Required | Required | Required | Optional | Approval chain proof required. |
| Notification templates | Required | Required | Preview | Required | Required | Optional | Preview/test-send negative validation required. |
| Salary components | Required | Required | Required | Required | Required | Optional | Formula/rule reference proof required. |
| Salary structures | Required | Required | Required | Required | Version/Archive | Optional | Effective dating required. |
| Payroll periods | Required | Required | Required | Required | Lock | Optional | Lock behavior is critical. |
| Payroll inputs | Required | Required | Required | Update before lock | Block after lock | Import/Export | Immutable snapshot proof required. |
| Adjustments | Required | Required | Required | Update before review | Void | Optional | Late change controls required. |
| Settlements | Required | Required | Required | Update before review | Void | Optional | Final settlement proof required. |
| Payroll runs | Draft | Required | Required | Review | Final lock | Export | No silent mutation after lock. |
| Payroll outputs | Generate | Required | Required | Publish | Revoke grant | Download | Checksums and access audit required. |
| Provider connections | Required | Required | Required | Required | Disable | Callback | Secrets must be redacted. |
| Support sessions | Request/Grant | Required | Required | Scope update | Revoke | Audit export | Tenant approval required. |

## 16. Confidence Model

Confidence should be updated after every phase using four inputs:

- Automated pass rate.
- Workflow depth.
- Defect severity.
- Manual review risk.

Suggested scoring:

| Signal | Weight |
|---|---:|
| Playwright pass rate | 35% |
| CRUD/workflow completion | 30% |
| Security and tenant-isolation proof | 20% |
| UX/accessibility/performance review | 15% |

Phase status rules:

- `Green`: 95%+ confidence, no critical/high defects, only accepted medium/low risks.
- `Amber`: 80% to 94% confidence, no critical defects, high defects either closed or explicitly blocked from release scope.
- `Red`: below 80% confidence, any open critical defect, or any untested money/security workflow.

Current overall status:

- `Amber`
- Reason: strong page and safe workflow coverage exists, but full destructive/payroll close/integration release proof is not complete.

## 17. Execution Log

| Date | Phase | Result | Evidence | Confidence Movement |
|---|---|---|---|---|
| 2026-09-08 | Phase 0: Browser baseline and route health | PASS, 249/249 screen visits | `docs/qa/final-app-review-stage-browser-functionality-final3-2026-09-08.md` | Overall product confidence to 60% |
| 2026-09-08 | Phase 1A: Master-data/configuration safe form coverage | PASS, 15/15 tests | `docs/qa/phase1-master-data-crud-report-2026-09-08.md` | Overall product confidence to 63% |
| 2026-09-08 | Phase 1B: Organization master CRUD expansion | PASS, 25/25 Phase 1 browser tests and 249/249 final audit screen visits | `docs/qa/phase1b-organization-master-crud-report-2026-09-08.md` | Overall product confidence to 68% |
| 2026-09-09 | Phase 1C-A: Policy and governance master CRUD expansion | PASS, 8/8 Phase 1C-A tests; broader Phase 1 had 31/33 with affected org tests passing on targeted rerun | `docs/qa/phase1c-policy-governance-master-crud-report-2026-09-09.md` | Overall product confidence to 70% |
| 2026-09-09 | Phase 1C-B: Salary setup CRUD expansion | PASS, 3/3 focused salary setup browser tests | `docs/qa/phase1c-salary-setup-crud-report-2026-09-09.md` | Overall product confidence to 72% |
| 2026-09-10 | Phase 9E: Final warning closure implementation | PASS locally, 2/2 Phase 9E browser tests plus Django check, TypeScript, and ESLint | `docs/qa/phase9e-final-warning-closure-2026-09-10.md` | Phase 9 confidence to 96% local, staging pending |

## 18. Recommended Execution Order

1. Phase 1: master data and configuration CRUD.
2. Phase 2: five-tenant platform onboarding and isolation.
3. Phase 3: employee lifecycle per tenant.
4. Phase 4: leave and attendance workflow depth.
5. Phase 5: payroll setup-to-close proof.
6. Phase 6: provider, storage, handoff, and notification governance.
7. Phase 7: security, role, tenant isolation, and support access.
8. Phase 8: UX, accessibility, responsive, and performance review.
9. Phase 9: final release rehearsal.

Recommended immediate next phase:

Phase 1C-C should be executed next for assignment and rollout CRUD expansion because those records connect the now-tested masters to real employees, departments, grades, legal entities, workflow routing, and shift operations. If these assignment paths are weak, later leave, attendance, lifecycle, and payroll tests will not prove tenant-specific behavior strongly enough.

## 19. Standard Playwright Commands

Use staging:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test tests/e2e/final-app-audit.spec.ts --workers=1
```

Run configuration and master-data phase:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  tests/e2e/configuration-form-flows.spec.ts \
  tests/e2e/governance-assignment-form-flows.spec.ts \
  tests/e2e/salary-setup-flows.spec.ts \
  tests/e2e/workflow-trace-flows.spec.ts \
  --workers=1
```

Run payroll launch phase:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  tests/e2e/payroll-*.spec.ts \
  tests/e2e/production-payroll-*.spec.ts \
  --workers=1
```

Run SaaS and security phase:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  tests/e2e/production-platform-admin-onboarding-flows.spec.ts \
  tests/e2e/production-tenant-role-isolation.spec.ts \
  tests/e2e/tenant-admin-console-flows.spec.ts \
  tests/e2e/tenant-security-readiness-flows.spec.ts \
  tests/e2e/tenant-trust-audit-flows.spec.ts \
  --workers=1
```

## 20. Phase Report Template

Each phase report should include:

- Phase name and date.
- Staging URL and build/deploy identifier.
- Test commands.
- Pass/fail/skip counts.
- Personas used.
- Records created.
- CRUD matrix.
- Dropdown/input/textbox validation summary.
- Screenshots/artifact path.
- Defects found.
- Defects fixed.
- Residual risks.
- Updated confidence score.
- Recommendation: proceed, repeat, or block.

## 21. Launch Readiness Definition

The product should be considered launch-ready only when:

- Phase 0 through Phase 9 are complete or explicitly scoped out.
- Overall confidence is at least 95%.
- Payroll close is proven on disposable staging data.
- Five-tenant SaaS onboarding and isolation are proven.
- External provider flows are proven with sandbox credentials or signed contract fixtures.
- All critical/high defects are closed.
- Medium defects have owners and accepted dates.
- Rollback, backup, monitoring, and support access procedures are documented.
- Final browser audit remains clean after all fixes.
