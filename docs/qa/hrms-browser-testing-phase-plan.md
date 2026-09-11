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

## Phase 2/8 Bridge: Platform Admin Workspace Ergonomics

Goal:

Make the platform admin console usable for real SaaS operations by breaking the large all-in-one page into focused tabs, adding pagination/search to long lists, and certifying every visible platform-admin control through Playwright.

Scope:

- Top-level tab structure for Tenants, Onboarding, Admins, Policy Packs, and Events.
- URL-addressable panels using `panel=` so direct links and sidebar navigation remain stable.
- Tenant list pagination and search across tenant name, code, domain, plan, and onboarding status.
- Policy pack pagination and search across pack name, code, domain, status, country, and industry.
- Event pagination and search across event type, actor, summary, and timestamp.
- Preserve platform-admin create tenant, edit tenant, onboarding metadata, admin contact, first-admin provisioning, policy pack creation/publish, baseline adoption, activation gates, and event review workflows.

Certification suites:

- `web/tests/e2e/platform-admin-tabs-pagination-certification.spec.ts`
- `web/tests/e2e/platform-admin-negative-security-certification.spec.ts`
- `web/tests/e2e/platform-admin-audit-evidence-certification.spec.ts`
- `web/tests/e2e/production-platform-admin-onboarding-flows.spec.ts`

Done gate:

- Each platform-admin tab is reachable through browser navigation and marks the active tab using `aria-selected`.
- Every visible form control on the touched page is asserted by Playwright.
- Pagination controls render for tenant, policy-pack, and event lists.
- Paginated lists do not render more than the configured page size.
- Newly created policy packs remain reachable by browser search even when not on page one.
- Unauthenticated, employee, manager, and HR admin sessions are denied from Platform Admin workspace/API.
- Invalid fields, duplicate tenant codes, duplicate policy-pack codes, and early gate actions fail visibly.
- Platform Admin mutations create tenant-specific onboarding events and checklist evidence visible after refresh.
- Five new tenants and first admins can still be onboarded through the browser after the tab split.
- No horizontal overflow is introduced.

Latest local certification:

- Date: 2026-09-10
- Environment under test: local Next.js at `http://127.0.0.1:3212` with live staging API `https://hrms.accerio.in/api/v1`
- `pnpm --dir web exec tsc --noEmit`: passed
- `pnpm --dir web lint`: passed
- `platform-admin-tabs-pagination-certification.spec.ts`: passed
- `platform-admin-negative-security-certification.spec.ts`: passed
- `platform-admin-audit-evidence-certification.spec.ts`: passed
- `production-platform-admin-onboarding-flows.spec.ts`: passed, including five tenant/admin onboarding cycles
- Combined Platform Admin certification run: passed, `5 passed`

Latest focused Platform Admin retest:

- Date: 2026-09-10
- Environment under test: local Next.js at `http://127.0.0.1:3000` with live staging API `https://hrms.accerio.in/api/v1`
- Demo fallback: disabled with `HRMS_ENABLE_DEMO_DATA=false`
- `platform-admin-tabs-pagination-certification.spec.ts`: passed
- `platform-admin-negative-security-certification.spec.ts`: passed
- `platform-admin-audit-evidence-certification.spec.ts`: passed
- Focused Platform Admin certification pack: passed, `4 passed`
- `production-platform-admin-onboarding-flows.spec.ts`: passed, including five browser-created tenants, first-admin provisioning, policy-pack adoption, activation gates, tenant-admin login, and no horizontal overflow

Confidence after bridge:

- Platform admin UX confidence: 90%
- Platform admin functional confidence: 93%
- Platform admin security/guardrail confidence: 91%
- Platform admin audit/evidence confidence: 92%
- SaaS tenant onboarding confidence: 93%

## Phase 8E: Sidebar, Tabs, Lists, and Pagination Certification

Goal:

Certify that every role workspace sidebar route remains usable, every tabbed surface can be operated through the browser, and long list workspaces expose pagination before launch.

Scope:

- Platform admin sidebar routes.
- HR admin sidebar routes.
- Employee self-service sidebar routes.
- Manager self-service sidebar routes.
- Tenant admin sidebar routes.
- All visible `role=tab` elements on those routes.
- Long list detection for tenant directory rows, shared list rows, and large table bodies.
- Horizontal overflow checks after each page load and tab switch.

Certification suite:

- `web/tests/e2e/sidebar-tabs-list-certification.spec.ts`

Issues found and resolved:

- `/hr-admin/organization` rendered 20 structural master rows without pagination.
- Added query-string pagination and a page-size selector to the organization master list.

Latest local certification:

- Date: 2026-09-10
- Environment under test: local Next.js at `http://127.0.0.1:3212` with live staging API `https://hrms.accerio.in/api/v1`
- `pnpm --dir web exec tsc --noEmit`: passed
- `pnpm --dir web lint`: passed
- `sidebar-tabs-list-certification.spec.ts`: passed, `5 passed`

Confidence after phase:

- Sidebar navigation confidence: 92%
- Tab navigation confidence: 90%
- Long-list pagination confidence: 88%
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
- Phase 3G employee directory pagination and granular page certification: done locally on 2026-09-10.
- Certified touched page: `/hr-admin/employees`.
- Added URL-driven pagination and page-size controls to the employee directory.
- Certified header actions, metrics, filters, status chips, pagination controls, list cards, selected detail rows, action menu links, empty search state, and horizontal overflow behavior.
- Evidence suite: `web/tests/e2e/employee-directory-certification.spec.ts`.
- Phase 3H employee bank account payroll-readiness certification: done locally on 2026-09-10.
- Certified touched page: `/hr-admin/employees/[employeeId]/bank-accounts`.
- Certified employee-detail action navigation, bank-account metrics, empty list state, required field validation, create account, read/list masking, edit account, primary-account switching, API persistence, absence of delete/remove/archive controls, and horizontal overflow behavior.
- Evidence suite: `web/tests/e2e/employee-bank-accounts-certification.spec.ts`.
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
- Employee directory navigation/filter/pagination confidence: 92%.
- Employee bank account readiness confidence: 90%.
- Current Phase 3 confidence: 90%.
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
- Phase 5K payroll readiness bank coverage gate and pagination certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-readiness`, `/hr-admin/payroll-readiness?q=[createdEmployeeCode]&page_size=10`, `/hr-admin/payroll-readiness?employeeId=[createdEmployeeId]`.
- Added URL-driven payroll readiness pagination and page-size controls using the backend-supported `page` and `page_size` contract.
- Certified that a browser-created employee primary bank account flows into payroll readiness table bank status, selected readiness detail source counts, and the absence of the `Missing primary bank account` issue for that employee.
- Evidence suite: `web/tests/e2e/payroll-readiness-bank-gate-certification.spec.ts`.
- Phase 5L payroll readiness negative gate certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/employees/new`, `/hr-admin/payroll-readiness?q=[createdEmployeeCode]&page_size=10`, `/hr-admin/payroll-readiness?status=ready`, `/hr-admin/payroll-readiness?status=warning`.
- Certified that a browser-created active employee with complete structure but no primary bank account remains warning-gated, shows `Bank = Missing`, exposes `Bank accounts = 0` in selected readiness detail, displays the `Missing primary bank account.` warning, is excluded from the Ready tab, and remains visible in the Warning tab.
- Evidence suite: `web/tests/e2e/payroll-readiness-negative-gates-certification.spec.ts`.
- Phase 5M payroll close readiness guard certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-inputs`, `/hr-admin/payroll-inputs?runId=[createdRunId]&snapshotId=[createdSnapshotId]`.
- Certified that warning snapshots expose visible warning counts and snapshot-detail issues before lock, can be intentionally locked with visible status feedback, while blocked snapshots expose blocked counts and stop input lock with a visible error response.
- Evidence suite: `web/tests/e2e/payroll-close-readiness-guard-certification.spec.ts`.
- Phase 5N payroll warning calculation and review trace certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]&calculationId=[createdCalculationId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]`.
- Certified that a browser-created warning input snapshot can be locked with visible evidence, draft-calculated using a disposable active rule, carried into the calculation validation register, opened for review, and surfaced in the review exception/evidence workspace with a stable trace link back to calculation.
- Evidence suite: `web/tests/e2e/payroll-warning-calculation-review-trace-certification.spec.ts`.
- Phase 5O payroll review exception decision certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]&exceptionId=[createdExceptionId]`.
- Added browser-visible review controls for manual exception creation, selected exception decisioning, decision reason capture, and approval comment capture, backed by tenant-scoped HR-admin API routes.
- Certified that a browser-created blocker exception prevents review submission, accepted decision with reason unblocks submission, approval records profile and reviewer comment, final lock completes, approval evidence remains visible, and the selected exception detail preserves the decision reason.
- Evidence suite: `web/tests/e2e/payroll-review-exception-decision-certification.spec.ts`.
- Phase 5P payroll output artifact certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]`, `/hr-admin/payroll-outputs?batchId=[createdBatchId]&artifactId=[createdArtifactId]`, `/ess/payslips?q=[createdRunCode]`.
- Added URL-driven pagination to the payroll output batch rail and artifact register so long output workspaces remain usable without backend changes.
- Certified output generation from final-locked review, output batch publish, HR artifact metadata panels, payslip/register artifact detail selection, HR download headers for checksum/storage/provider/version/download strategy/retention, access-audit CSV export, ESS published-only payslip visibility, ESS download, register exclusion from ESS, and HR route denial from employee session.
- Evidence suite: `web/tests/e2e/payroll-output-artifact-certification.spec.ts`.
- Phase 5Q payroll finance handoff certification: done locally on 2026-09-10.
- Certified touched pages: `/hr-admin/payroll-rules`, `/hr-admin/payroll-inputs`, `/hr-admin/payroll-calculations?runId=[createdRunId]`, `/hr-admin/payroll-review?reviewId=[createdReviewId]`, `/hr-admin/payroll-outputs?batchId=[createdBatchId]`, `/hr-admin/payroll-handoff?handoffId=[createdHandoffId]`.
- Added URL-driven pagination to the payroll handoff package rail and finance artifact register so long provider/evidence workspaces remain usable.
- Certified finance handoff generation from published outputs, selected handoff detail, transmit action, acknowledgement profile action, provider audit-pack generation, finance artifact detail storage governance, configurable finance routing refs, delivery acknowledgements, delivery audit evidence drilldown, and handoff pagination controls.
- Evidence suite: `web/tests/e2e/payroll-output-artifact-certification.spec.ts` with test `published outputs generate finance handoff with transmit, acknowledgement, audit pack, and pagination evidence`.
- Phase 5R payroll close regression bundle certification: done locally on 2026-09-10.
- Certified bundled suites: payroll readiness bank gate, payroll readiness negative gate, payroll close readiness guard, payroll warning calculation/review trace, payroll review exception decision, payroll output artifact certification, and payroll finance handoff certification.
- Certified that the Phase 5 payroll browser tests pass serially in one accumulated-data run, proving that the page-level certifications do not pollute one another and that the pagination changes keep payroll pages usable as staging records grow.
- Evidence command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3212 HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_ENABLE_DEMO_DATA=false pnpm --dir web exec playwright test tests/e2e/payroll-readiness-bank-gate-certification.spec.ts tests/e2e/payroll-readiness-negative-gates-certification.spec.ts tests/e2e/payroll-close-readiness-guard-certification.spec.ts tests/e2e/payroll-warning-calculation-review-trace-certification.spec.ts tests/e2e/payroll-review-exception-decision-certification.spec.ts tests/e2e/payroll-output-artifact-certification.spec.ts --workers=1 --reporter=line`.
- Result: `7 passed (3.7m)`.
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
- Payroll readiness pagination confidence: 91%.
- Primary bank readiness gate confidence: 92%.
- Negative payroll readiness gate confidence: 92%.
- Payroll close readiness guard confidence: 92%.
- Payroll warning calculation/review trace confidence: 92%.
- Payroll review exception decision confidence: 93%.
- Payroll output artifact certification confidence: 94%.
- Payroll finance handoff certification confidence: 94%.
- Payroll close regression bundle confidence: 96%.
- Phase 5Q TDS compliance report: started locally on 2026-09-10.
- Phase 5Q product fix: HR admin Payroll Statutory now includes a `TDS e-file report` panel for TDS component readiness, Form 24Q filing-calendar readiness, PAN coverage, tax-regime coverage, locked declaration coverage, configurable FVU/e-file validation profile, challan mapping, provider route, and production filing guard.
- Phase 5Q evidence plan: `docs/qa/phase5q-tds-compliance-report-plan-2026-09-10.md`.
- Phase 5Q local browser evidence: backend check passed, TypeScript passed, and `payroll-statutory-flows.spec.ts` passed `3/3` against local frontend plus staging API.
- Reporting expansion plan: `docs/qa/hrms-reporting-phase-plan-2026-09-10.md` now defines the phase-wise HR admin, payroll finance, compliance, SaaS, export, and browser-certification roadmap for launch-grade reports; every reporting phase is a development-plus-Playwright automation phase with a named certification spec.
- Reporting Phase R0-A: done locally on 2026-09-10 with typed catalog, HR admin report catalog workspace, filters, category tabs, pagination, export/drilldown actions, and controlled live export failure statuses.
- Reporting Phase R0-A evidence: TypeScript passed, `reporting-foundation-certification.spec.ts` passed `2/2`, and `sidebar-tabs-list-certification.spec.ts` passed `5/5` against local frontend plus staging API.
- Reporting Phase R3-A payroll register report: done locally on 2026-09-10 with `/hr-admin/reports/payroll-register`, summary totals, search, batch/artifact status filters, sort, pagination, output profile, storage/source-hash evidence, artifact export, and drilldown to payroll outputs.
- Reporting Phase R3-A evidence: TypeScript passed, `payroll-finance-report-certification.spec.ts` passed `2/2`; combined reporting regression passed `4/4`; sidebar/tabs/list regression passed `5/5` against local frontend plus staging API.
- Reporting Phase R3-B salary variance report: done locally on 2026-09-10 with `/hr-admin/reports/salary-variance`, employee-level summary totals, search, variance-band filter, sort, pagination, gross/deduction/current-net/baseline-net columns, variance amount/percentage, source-hash evidence, and drilldown to payroll review.
- Reporting Phase R3-B evidence: TypeScript passed, `salary-variance-report-certification.spec.ts` passed `2/2`; reporting foundation, payroll register, and salary variance specs passed together `6/6` against local frontend plus staging API.
- Reporting Phase R4-A statutory deduction summary report: done locally on 2026-09-10 with `/hr-admin/reports/statutory-deductions`, summary totals, search, statutory-type/provider filters, sort, pagination, registration/provider/evidence columns, empty state, conditional artifact export, and drilldown to Payroll Statutory.
- Reporting Phase R4-A evidence: TypeScript passed, `statutory-deductions-report-certification.spec.ts` passed `2/2`; reporting foundation, payroll register, salary variance, and statutory deductions specs passed together `8/8` against local frontend plus staging API.
- Reporting Phase R4-A artifact proof rerun: done locally on 2026-09-10 after extending the disposable payroll close browser flow to create configurable TDS statutory pack, TDS component, TAN employer registration, Form 24Q filing calendar, and TDS tax rule before calculation.
- Reporting Phase R4-A artifact evidence: updated `phase5c-disposable-payroll-close-browser-flow.spec.ts` passed `1/1`; `statutory-deductions-report-certification.spec.ts` passed `2/2`; combined close/report pack passed `3/3`.
- Reporting Phase R4-A mapped compliance evidence: browser report search proved the generated TDS component row, `Tax Deducted At Source` statutory type, TAN registration number, `income_tax_department` authority, `payroll.provider.tds.fvu.phase5q` provider route, visible source hash, export link, CSV download `200`, and `x-payroll-artifact-checksum`.
- Reporting Phase R4-A SaaS evidence: Northstar staging tenant was upgraded through Platform Admin browser flow from `growth` to `enterprise` after the real commercial guard blocked further payroll runs with `Limit exceeded: payroll_runs_per_month`.
- Reporting Phase R4-A remaining richness note: statutory summary compliance is now mapped and export-certified; separate return/challan artifact rendering should still be expanded when dedicated Form 24Q/FVU provider packages are implemented.
- Reporting Phase R4-B TDS e-file package: started locally on 2026-09-10 with same-origin HR admin route `/api/hr-admin/reports/tds-efile-package` and Payroll Statutory action `Download TDS e-file package`.
- Reporting Phase R4-B product behavior: the package generator fetches live statutory setup plus finance handoff artifacts, emits a guarded Form 24Q-ready CSV package with a SHA-256 package checksum header, and blocks with explicit reasons when published TDS rows, TAN, filing authority, provider route, or source hash evidence is missing.
- Reporting Phase R4-B browser evidence: `tds-efile-package-certification.spec.ts` passed `2/2`; combined R4 regression pack `phase5c-disposable-payroll-close-browser-flow.spec.ts`, `statutory-deductions-report-certification.spec.ts`, and `tds-efile-package-certification.spec.ts` passed `5/5` against local frontend plus staging API.
- Reporting Phase R4-B access evidence: HR admin can access the package route and employee access is denied without token/password/secret leakage.
- Reporting Phase R4-B integrity evidence: package download exposes `x-hrms-package-checksum`, and Playwright recomputes the SHA-256 from the downloaded CSV body before accepting the export.
- Reporting Phase R4-B integrity retest on 2026-09-10: TypeScript passed; focused `tds-efile-package-certification.spec.ts` passed `2/2` against local frontend plus staging API after checksum hardening.
- Reporting Phase R4-B regression note on 2026-09-10: the combined R4 pack passed all four report/export tests but hit one transient `page.goto` timeout in the long disposable payroll-close setup; immediate isolated rerun of `phase5c-disposable-payroll-close-browser-flow.spec.ts` passed `1/1`.
- TDS e-file package generation confidence: 85%.
- TDS compliance readiness report confidence: 90%.
- TDS e-file production submission confidence: 55%.
- Reporting Phase R4-C challan reconciliation report: done locally on 2026-09-10 with `/hr-admin/reports/challan-reconciliation`, catalog discovery, filing-calendar reconciliation, payment readiness status, matched deduction amount, registration/authority/provider evidence, source-hash evidence, search, payment-status filter, provider filter, sort, pagination, artifact export, and statutory setup drilldown.
- Reporting Phase R4-C browser evidence: TypeScript passed and `challan-reconciliation-report-certification.spec.ts` passed `2/2` against local frontend plus staging API, including HR admin coverage and employee denial.
- Challan reconciliation report confidence: 84%.
- Reporting Phase R4-D statutory filing status report: done locally on 2026-09-10 with `/hr-admin/reports/statutory-filing-status`, catalog discovery, filing due status, open/due/overdue/acknowledged tracking, published artifact evidence counts, registration/authority/provider/output-profile/source-hash evidence, search, due-status filter, provider filter, sort, pagination, Payroll Handoff drilldown, and Payroll Statutory drilldown.
- Reporting Phase R4-D browser evidence: TypeScript passed and `statutory-filing-status-report-certification.spec.ts` passed `2/2` against local frontend plus staging API, including HR admin coverage and employee denial.
- Statutory filing status report confidence: 86%.
- Reporting Phase R4-E provider filing receipts report: done locally on 2026-09-10 with `/hr-admin/reports/provider-filing-receipts`, catalog discovery, provider delivery status, provider callback status, external receipt reference, submitted/acknowledged/reconciled timeline, callback/retry/job counts, payload checksum evidence, failure code/reason, search, delivery-status filter, provider-status filter, provider filter, sort, pagination, and Payroll Handoff evidence drilldown.
- Reporting Phase R4-E browser evidence: TypeScript passed and `provider-filing-receipts-report-certification.spec.ts` passed `2/2` against local frontend plus staging API, including HR admin coverage and employee denial.
- Provider filing receipts report confidence: 86%.
- Reporting Phase R4-F compliance export hardening: done locally on 2026-09-10 for `challan-reconciliation`, `statutory-filing-status`, and `provider-filing-receipts` same-origin CSV exports with generated timestamp, source row count, report key, SHA-256 checksum header, and live source data from statutory setup plus finance handoff setup.
- Reporting Phase R4-F browser evidence: TypeScript passed and `compliance-report-export-certification.spec.ts` passed `4/4` against local frontend plus staging API, including HR admin checksum recomputation for all three exports and employee export denial without token/password/secret leakage.
- Compliance report export confidence: 88%.
- Reporting Phase R4-G filter-aware export hardening: done locally on 2026-09-10 for the same compliance CSV exports. Report pages now expose `Export filtered CSV` actions carrying active search/status/provider/sort state, and the export route applies those filters server-side while returning `x-hrms-report-filters` audit metadata.
- Reporting Phase R4-G browser evidence: TypeScript passed and `compliance-report-export-certification.spec.ts` passed `4/4` against local frontend plus staging API after driving each report UI search field, validating the filtered export link, recomputing CSV checksum, and asserting the filter metadata header.
- Filter-aware compliance export confidence: 90%.
- Reporting Phase R4-H compliance report hub: done locally on 2026-09-10 with `/hr-admin/reports/compliance`, Reports page entry point, compliance metrics, report cards for statutory deductions, challan reconciliation, statutory filing status, provider filing receipts, and TDS e-file readiness, plus Open/Export actions where available.
- Reporting Phase R4-H browser evidence: TypeScript passed and `compliance-report-hub-certification.spec.ts` passed `2/2` against local frontend plus staging API, including hub metrics, report-card visibility, audited export route validation, drilldown, no horizontal overflow, and employee denial.
- Compliance report hub confidence: 88%.
- Reporting Phase R4-I compliance hub polish: done locally on 2026-09-10 with grouped hub tabs for All, Deductions, Filing & Challans, Provider Evidence, and TDS Package; card-level health signals; and hub-level audited exports for blocked provider items and overdue statutory filings.
- Reporting Phase R4-I browser evidence: TypeScript passed and `compliance-report-hub-certification.spec.ts` passed `2/2` against local frontend plus staging API after clicking every hub tab, proving per-tab card visibility, validating hub-level export URLs and audit headers, validating report-card export headers, exercising drilldown, checking no horizontal overflow, and proving employee denial.
- Compliance report hub confidence: 91%.
- Reporting Phase R4-J compliance export manifest: done locally on 2026-09-10 with `format=manifest` support for audited compliance report exports. Manifests expose report key, schema version, generated timestamp, filters, row count, CSV checksum, source endpoints, and evidence columns while sharing the CSV checksum header.
- Reporting Phase R4-J browser evidence: TypeScript passed and `compliance-report-manifest-certification.spec.ts` passed `4/4` against local frontend plus staging API, including CSV checksum recomputation, manifest checksum equality, row-count equality, filter proof, source endpoint proof, evidence-column shape, and employee denial without token/password/secret leakage.
- Compliance export manifest confidence: 90%.
- Reporting Phase R4-K compliance manifest UI access: done locally on 2026-09-10 with visible HR admin manifest actions on the challan reconciliation, statutory filing status, provider filing receipts, and compliance hub workspaces. Each report page exposes the manifest beside the filtered CSV export, and the hub exposes manifest actions for blocked provider items, overdue statutory filings, and eligible compliance report cards.
- Reporting Phase R4-K browser evidence: TypeScript passed and the affected certification pack passed `8/8` against local frontend plus staging API, including browser-discovered manifest links, JSON manifest validation, report key/header validation, source endpoint proof, filtered hub manifest proof, drilldown preservation, no horizontal overflow, and employee denial.
- Compliance manifest UI access confidence: 92%.
- Reporting Phase R4-L persisted export audit history: done locally on 2026-09-10 with server-side audit capture for HR admin compliance CSV and manifest exports, plus `/hr-admin/reports/export-audits` for reviewing actor, report key, export type, filters, row count, checksum, source endpoints, evidence columns, and request metadata.
- Reporting Phase R4-L browser evidence: TypeScript passed and `compliance-export-audit-history-certification.spec.ts` passed `2/2` against local frontend plus staging API after creating CSV/manifest exports, loading the audit-history UI, validating metrics, columns, search, report-key filter, export-type filter, pagination controls, checksum visibility, source/evidence metadata, no horizontal overflow, and employee API/UI denial without token/password/secret leakage.
- Export audit history confidence: 88%.
- Reporting Phase R4-M backend export audit persistence: done locally on 2026-09-10 with `PayrollReportExportAudit`, database migration, Django admin registration, and `/api/v1/hr-admin/reports/export-audits/` list/create endpoint. The web export route now prefers backend audit persistence and backend audit listing when available, while retaining bounded local fallback for undeployed staging routes.
- Reporting Phase R4-M backend evidence: Django system check passed, migration `payroll.0033_payrollreportexportaudit` applied locally, and `pytest backend/tests/test_phase0_api_smoke.py -k 'report_export_audits'` passed `2/2`, covering HR admin create/list/filter, tenant and actor ownership, source hash creation, and employee denial.
- Backend export audit persistence confidence: 90%.
- Reporting Phase R4-N payroll register export parity: done locally on 2026-09-11 with audited same-origin CSV and manifest export support for `/hr-admin/reports/payroll-register`. The export uses live payroll output setup data, carries active query/status/sort filters, exposes checksum and source-row headers, records export audit evidence, and reports `/hr-admin/payroll-output-setup/` as the source endpoint.
- Reporting Phase R4-N browser evidence: TypeScript passed and `payroll-finance-report-certification.spec.ts` passed `2/2` against local frontend plus staging API after testing metrics, search, batch/artifact filters, sort, pagination controls, filtered report CSV, manifest JSON, row artifact export, payroll output drilldown, no horizontal overflow, and employee API/UI denial.
- Payroll register export parity confidence: 91%.
- Reporting Phase R4-O payroll register export audit certification: done locally on 2026-09-11 by extending export audit history to prove payroll-register CSV and manifest exports. The audit history table now displays concrete source endpoints and evidence columns, including `/hr-admin/payroll-output-setup/`, `checksum_sha256`, and `source_hash`, instead of only summary counts.
- Reporting Phase R4-O browser evidence: TypeScript passed and `compliance-export-audit-history-certification.spec.ts` passed `2/2` against local frontend plus staging API after generating payroll-register CSV/manifest audit records, validating metrics, columns, search, report-key filter, export-type filter, pagination, checksum visibility, source endpoint proof, evidence-column proof, API audit payload, no horizontal overflow, and employee denial.
- Payroll register export audit confidence: 94%.
- Reporting Phase R4-P salary variance export parity: done locally on 2026-09-11 with audited same-origin CSV and manifest export support for `/hr-admin/reports/salary-variance`. The export uses live payroll review setup data, carries active query/variance-band/sort filters, exposes checksum and source-row headers, records export audit evidence, and reports `/hr-admin/payroll-review-setup/` as the source endpoint.
- Reporting Phase R4-P browser evidence: TypeScript passed, `salary-variance-report-certification.spec.ts` passed `2/2`, and `compliance-export-audit-history-certification.spec.ts` passed `2/2` against local frontend plus staging API after testing metrics, search, variance band, sort, pagination controls, filtered report CSV, manifest JSON, payroll review drilldown, audit history source/evidence proof, API audit payload, no horizontal overflow, and employee API/UI denial.
- Salary variance export governance confidence: 92%.
- Reporting Phase R4-Q bank advice export parity: done locally on 2026-09-11 with `/hr-admin/reports/bank-advice`, audited same-origin CSV and manifest export support, and source evidence from `/hr-admin/payroll-finance-handoff-setup/`. The report joins handoff, bank advice artifact, provider delivery, checksum, source hash, submitted/acknowledged/reconciled timestamps, and payout totals without hardcoded tenant assumptions.
- Reporting Phase R4-Q browser evidence: TypeScript passed and the focused bank-advice plus export-audit certification pack passed `4/4` against local frontend plus staging API after testing metrics, search, handoff-status filter, delivery-status filter, provider filter, sort, pagination controls, filtered CSV export, manifest JSON, payroll handoff drilldown, audit-history search proof, API audit payload proof, no horizontal overflow, and employee API/UI denial.
- Bank advice export governance confidence: 92%.
- Reporting Phase R2-A workforce report parity: done locally on 2026-09-11 with `/hr-admin/reports/workforce`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/employees/`, and granular HR Core columns for employee identity, organization mapping, role/grade/employment type, manager coverage, access readiness, membership status, and direct reports.
- Reporting Phase R2-A browser evidence: TypeScript passed, the focused workforce plus report-catalog certification pack passed `4/4`, the workforce plus export-audit history pack passed `4/4`, and the full reporting/compliance regression pack passed `32/32` against local frontend plus staging API after testing metrics, search, employment-status filter, department filter, manager-coverage filter, sort options, pagination controls, filtered CSV export, manifest JSON, employee master drilldown, audit-history search proof, API audit payload proof, no horizontal overflow, catalog route/export behavior, and employee API/UI denial.
- Workforce report governance confidence: 91%.
- Reporting Phase R2-B document compliance report parity: done locally on 2026-09-11 with `/hr-admin/reports/document-compliance`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/employee-documents/`, and schema-stable empty export behavior for tenants without document rows. The report covers employee, category, title, verification status, record status, expiry state, file evidence, re-upload request, review history count, artifact availability, and computed compliance risk.
- Reporting Phase R2-B browser evidence: TypeScript passed, the focused document-compliance plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `36/36` against local frontend plus staging API after testing metrics, search, verification-status filter, record-status filter, category filter, expiry-focus filter, sort options, pagination controls, filtered CSV export, manifest JSON, schema columns with zero staging rows, audit-history search proof, API audit payload proof, no horizontal overflow, catalog route/export behavior, conditional review drilldown, and employee API/UI denial.
- Document compliance report governance confidence: 90%.
- Reporting Phase R2-C lifecycle queue report parity: done locally on 2026-09-11 with `/hr-admin/reports/lifecycle-queue`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/lifecycle-queue/`, and schema-stable lifecycle evidence. The report covers onboarding, probation, movement, exit, owner assignment, status, workflow reference, primary/secondary dates, next due/escalation dates, lifecycle attention, document pressure, bulk-status warning, and computed lifecycle risk.
- Reporting Phase R2-C browser evidence: TypeScript passed, the focused lifecycle-queue plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `36/36` against local frontend plus staging API after testing metrics, search, lifecycle-type filter, status filter, owner filter, lifecycle-attention filter, document-attention filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history search proof, API audit payload proof, no horizontal overflow, conditional record drilldown, and employee API/UI denial.
- Lifecycle queue report governance confidence: 91%.
- Reporting Phase R2-D lifecycle aging and SLA report parity: done locally on 2026-09-11 with `/hr-admin/reports/lifecycle-aging`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/lifecycle-queue/`, and SLA-focused lifecycle evidence. The report covers lifecycle age buckets, days overdue, owner gaps, escalation schedules, document blockers, status, workflow reference, attention summary, and computed SLA risk.
- Reporting Phase R2-D browser evidence: TypeScript passed, the focused lifecycle-aging plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `38/38` against local frontend plus staging API after testing metrics, search, lifecycle-type filter, status filter, owner filter, age-bucket filter, SLA-risk filter, escalation filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history search proof, API audit payload proof, no horizontal overflow, conditional record drilldown, catalog route/export behavior, and employee API/UI denial.
- Lifecycle aging and SLA report governance confidence: 91%.
- Reporting Phase R4-R daily attendance register report parity: done locally on 2026-09-11 with `/hr-admin/reports/attendance-register`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/attendance-records/`, and payroll-readiness evidence. The report covers employee, department, designation, attendance date, status, source, shift, holiday, punches, work and overtime hours, late/early-exit minutes, regularization, lock state, exception type, and payroll readiness.
- Reporting Phase R4-R browser evidence: TypeScript passed, the focused attendance-register plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `40/40` against local frontend plus staging API after testing metrics, search, status filter, source filter, department filter, lock-state filter, regularization filter, exception filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history search proof, API audit payload proof, no horizontal overflow, conditional attendance-record drilldown, catalog route/export behavior, and employee API/UI denial.
- Daily attendance register governance confidence: 90%.
- Reporting Phase R4-S leave balance report parity: done locally on 2026-09-11 with `/hr-admin/reports/leave-balance`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/leave-balances/`, and liability evidence. The report covers employee, leave policy, leave type, period year, opening/accrued/carry-forward units, consumed/reserved/encashed units, adjustments, closing balance, available-after-reserved balance, utilization percent, liability state, and liability risk.
- Reporting Phase R4-S browser evidence: TypeScript passed, the focused leave-balance plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `42/42` against local frontend plus staging API after testing metrics, search, leave-policy filter, leave-type filter, period-year filter, liability-risk filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history search proof, API audit payload proof, no horizontal overflow, conditional balance-operations drilldown, catalog route/export behavior, and employee API/UI denial.
- Leave balance report governance confidence: 90%.
- Reporting Phase R4-T attendance exceptions SLA report parity: done locally on 2026-09-11 with `/hr-admin/reports/attendance-exceptions`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/attendance-regularizations/`, and payroll-impact evidence. The report covers employee, attendance date, current/requested status, request status, shift, actual/requested punches, reason, manager comment, workflow reference, applied/resolved timestamps, aging days, SLA state, SLA risk, and payroll impact.
- Reporting Phase R4-T browser evidence: TypeScript passed, the focused attendance-exceptions plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `44/44` against local frontend plus staging API after testing metrics, search, request-status filter, requested-status filter, current-status filter, SLA-risk filter, payroll-impact filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history search proof, API audit payload proof, no horizontal overflow, conditional review drilldown, catalog route/export behavior, and employee API/UI denial.

- Reporting Phase R5-A payroll input exceptions report parity: done locally on 2026-09-11 with `/hr-admin/reports/payroll-input-exceptions`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/payroll-input-snapshot-setup/`, and pre-close readiness evidence. The report covers employee, payroll run, run status, pay group, salary structure/version, snapshot status, issue type, readiness risk, blocker/warning counts, lock state, locked timestamp, period, attendance present/working days, input profile, source collected timestamp, source hash, first blocker/warning, and snapshot detail link.
- Reporting Phase R5-A browser evidence: TypeScript passed, the focused payroll-input-exceptions plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `46/46` against local frontend plus staging API after testing metrics, search, payroll-run filter, snapshot-status filter, pay-group filter, lock-state filter, issue-type filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history source/evidence proof, API audit payload proof, no horizontal overflow, conditional payroll-input snapshot drilldown, catalog route/export behavior, and employee API/UI denial.
- Payroll input exceptions report governance confidence: 91%.

- Reporting Phase R5-B payroll review exceptions report parity: done locally on 2026-09-11 with `/hr-admin/reports/payroll-review-exceptions`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/payroll-review-setup/`, and review decision evidence. The report covers payroll run, review status/profile, exception identity, employee/component linkage, category, severity, status, detail, decision state, decision reason, decided timestamp/owner, calculation line, input snapshot, exception aging, computed review risk, and review detail link.
- Reporting Phase R5-B browser evidence: TypeScript passed, the focused payroll-review-exceptions plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `48/48` against local frontend plus staging API after testing metrics, search, payroll-run filter, severity filter, status filter, category filter, decision-state filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history source/evidence proof, API audit payload proof, no horizontal overflow, conditional payroll-review exception drilldown, catalog route/export behavior, and employee API/UI denial.
- Payroll review exceptions report governance confidence: 91%.

- Reporting Phase R5-C payroll adjustments report parity: done locally on 2026-09-11 with `/hr-admin/reports/payroll-adjustments`, audited same-origin CSV and manifest export support, catalog drilldown, source evidence from `/hr-admin/payroll-adjustment-setup/`, and one-time adjustment approval evidence. The report covers employee, payroll run, component, kind, direction, status, approval state, amount, amount risk, effective date, submitted/approved/rejected/applied timestamps, adjustment profile, approval profile, source reference, reason, source hash, and adjustment detail link.
- Reporting Phase R5-C browser evidence: TypeScript passed, the focused payroll-adjustments plus report-catalog plus export-audit history pack passed `6/6`, and the full reporting/compliance regression pack passed `48/48` against local frontend plus staging API after testing metrics, search, payroll-run filter, kind filter, direction filter, status filter, approval-state filter, amount-risk filter, sort options, pagination controls, filtered CSV export, manifest JSON, audit-history source/evidence proof, API audit payload proof, no horizontal overflow, conditional payroll-adjustment drilldown, catalog route/export behavior, and employee API/UI denial.
- Payroll adjustments report governance confidence: 91%.
- Current Phase 5 confidence: 99%.
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
- Phase 8C expanded operations keyboard/accessibility certification: done locally on 2026-09-10 against the staging API.
- Phase 8C expanded certified forms and toolbars: probation review create, movement create, exit create, attendance records toolbar, notification queue toolbar, and tenant support access controls.
- Phase 8C expanded product fix: Salary Setup structure detail cards now shrink and wrap inside the workspace, closing a 25px horizontal overflow at `1440x900`.
- Phase 8C expanded semantic fix: lifecycle create forms, attendance toolbar, notification toolbar, and tenant support access controls now expose stable `aria-label` and `data-testid` hooks for certification-grade keyboard testing.
- Phase 8C expanded evidence: `phase8c-form-keyboard-accessibility.spec.ts` passed `10/10` locally against `https://hrms.accerio.in/api/v1`.
- Phase 8D performance budget certification: done locally on 2026-09-10.
- Phase 8D certified routes: same launch-critical route set as Phase 8B at `1366x768` with browser navigation timing and resource-size budgets.
- Phase 8D warm-run slowest page-ready routes: `/hr-admin/payroll-providers` at `2959ms`, `/hr-admin/payroll-handoff` at `2900ms`, `/ess/payslips` at `2617ms`, `/mss/approvals` at `2337ms`, and `/ess/notifications?subject_type=payroll_payslip` at `2178ms`.
- Evidence: `docs/qa/phase8d-performance-budget-certification-2026-09-10.md`.
- Phase 8D performance retune: done locally on 2026-09-10 against the staging API.
- Phase 8D retune product fix: HR admin dashboard no longer performs launch-remediation write-sync on ordinary landing loads; remediation sync remains available where launch remediation/download flows need it.
- Phase 8D retune product fix: retry-ready notification queue defaults to `10` rows instead of `25` while preserving configurable pagination.
- Phase 8D retune visual fix: Payroll Outputs artifact detail panel now stays inside the `1366x768` workspace without horizontal overflow.
- Phase 8D retune evidence: `phase8d-performance-budget.spec.ts` passed `1/1`; slowest current local/staging-API page-ready samples were `/ess/payslips` `7919ms`, `/ess/notifications?subject_type=payroll_payslip` `6831ms`, `/hr-admin` `5839ms`, `/mss/approvals` `5015ms`, and `/hr-admin/payroll-providers` `4517ms`.
- Phase 8D ESS retune: done locally on 2026-09-10 against the staging API.
- Phase 8D ESS retune product fix: ESS payslip list now sends the selected payslip ID to the API so only the selected row receives heavy detail payloads, signed-download preparation, calculation lines, and recent access events.
- Phase 8D ESS retune product fix: ESS payslip default page size is now `5` rows with `5/10/25/50` still configurable in the browser.
- Phase 8D ESS retune evidence: `phase8d-performance-budget.spec.ts` passed `1/1`; `/ess/payslips` improved from `7919ms` to `4926ms` page-ready in the local/staging-API gate.
- Phase 8D payroll workspace retune: done locally on 2026-09-10 against the staging API.
- Phase 8D payroll workspace product fix: payroll calculation, review, and output setup APIs now accept selected row IDs so page payloads include heavy line/artifact/access detail only for the active run, calculation, review, batch, or artifact.
- Phase 8D payroll workspace product fix: the HR admin calculation, review, and output pages now pass selected IDs to the API, keeping the browser surface unchanged while reducing server-render payload work.
- Phase 8D payroll workspace regression evidence: `payroll-warning-calculation-review-trace-certification.spec.ts`, `payroll-review-exception-decision-certification.spec.ts`, and `payroll-output-artifact-certification.spec.ts` passed together, `4/4`.
- Phase 8D payroll workspace performance evidence: `phase8d-performance-budget.spec.ts` passed `1/1`; current local/staging-API page-ready samples were `/hr-admin/payroll-review` `2922ms`, `/hr-admin/payroll-calculations` `4399ms`, and `/hr-admin/payroll-outputs` `4719ms`.
- Phase 8D current slowest page-ready samples: `/hr-admin` `5652ms`, `/ess/payslips` `5084ms`, `/hr-admin/payroll-outputs` `4719ms`, `/mss/approvals` `4714ms`, and `/hr-admin/notification-delivery` `4514ms`.
- Phase 8D shared workspace retune: started locally on 2026-09-10.
- Phase 8D shared workspace product fix: notification diagnostics now supports `scope=delivery` so the Notification Delivery page can fetch channel health and overview counts without building full template/event diagnostic collections.
- Phase 8D shared workspace product fix: Manager Inbox now defaults leave and attendance approval queue payloads to `5` rows each while preserving existing pagination controls.
- Phase 8D shared workspace evidence: backend check passed, TypeScript passed, and `phase8d-performance-budget.spec.ts` passed `1/1` against local frontend plus staging API. Because the backend changes are not deployed yet, the delivery-scope payload savings need staging rerun after check-in/deploy.
- Phase 8D shared workspace latest local/staging-API slowest samples: `/ess/payslips` `7226ms`, `/hr-admin` `6374ms`, `/hr-admin/payroll-calculations` `5889ms`, `/hr-admin/payroll-outputs` `5379ms`, and `/hr-admin/payroll-handoff` `5254ms`.
- Phase 8D shared workspace staging deployment: done on 2026-09-10 at deployed commit `bc00e851a56dfd024d4baf2694cb4f72b83724be`.
- Phase 8D shared workspace staging deploy evidence: release `/var/www/hrms-payroll-saas/release-20260910113342`; Django check passed; migrations had no pending operations; backend and web services restarted active; `/health/` returned `{"status": "ok", "service": "hrms-backend"}`.
- Phase 8D shared workspace final staging browser evidence: `phase8d-performance-budget.spec.ts`, `phase8a-workspace-shell-ux-accessibility.spec.ts`, `payroll-warning-calculation-review-trace-certification.spec.ts`, `payroll-review-exception-decision-certification.spec.ts`, and `payroll-output-artifact-certification.spec.ts` passed together against `https://hrms.accerio.in`, `7/7`.
- Phase 8D shared workspace final staging timing samples: `/hr-admin` `10292ms`, `/hr-admin/payroll-handoff` `8299ms`, `/hr-admin/payroll-review` `8153ms`, `/hr-admin/payroll-outputs` `7950ms`, `/hr-admin/payroll-calculations` `7792ms`, `/hr-admin/payroll-providers` `7552ms`, `/hr-admin/payroll-inputs` `7514ms`, `/hr-admin/notifications?retry_state=retry_ready` `7331ms`, `/hr-admin/notification-delivery` `7322ms`, `/hr-admin/payroll-readiness` `7267ms`, `/ess/payslips` `6732ms`, and `/ess/notifications?subject_type=payroll_payslip` `4910ms`.
- Phase 8D shared workspace staging log review: no fresh server crash tracebacks were found; platform tenant API `403` entries were observed during role-boundary browser coverage and treated as expected authorization behavior.
- Phase 8E sidebar ergonomics update: done locally on 2026-09-10.
- Phase 8E product fix: workspace sidebars now support collapsible navigation categories, with HR admin navigation grouped by Workspace, Operations, and Governance instead of showing one long list.
- Phase 8E product fix: the active navigation group opens automatically, category headers are keyboard-focusable through native disclosure controls, and the sidebar navigation area scrolls independently when categories are expanded.
- Phase 8E browser evidence: `phase8a-workspace-shell-ux-accessibility.spec.ts` and `sidebar-tabs-list-certification.spec.ts` passed together against local frontend plus staging API, `7/7`.
- Phase 8 staging certification: done on 2026-09-10 against `https://hrms.accerio.in` at deployed commit `027becb613b349538d210c084bb617d96ba6fc96`.
- Phase 8 staging evidence: workspace shell plus dense form accessibility `6 passed`; responsive visual launch gate `6 passed` across `102` page-viewport combinations; performance timing gate `1 passed`.
- Phase 8 staging harness fix: remote URL runs now get staging-appropriate timeouts and performance budgets while preserving the same assertions.
- Phase 8 staging performance note: slowest page-ready samples were `/hr-admin` at `12321ms` and `/hr-admin/notifications?retry_state=retry_ready` at `11382ms`; navigation timings and asset/resource budgets stayed inside staging limits.
- Evidence: `docs/qa/phase8-staging-certification-2026-09-10.md`.
- Current UX confidence: 91%.
- Current responsive confidence: 92%.
- Current accessibility confidence: 90%.
- Current performance confidence: 92%.
- Current Phase 8 confidence: 97%.
- Remaining Phase 8 work: preserve responsive screenshots in passing CI artifacts and continue tuning the remaining slow shared landing pages, especially HR admin dashboard, ESS payslips, MSS approvals, and notification delivery.

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
- Phase 9E final warning closure: implemented locally and deployed to staging on 2026-09-10.
- Phase 9E deployment: release `/var/www/hrms-payroll-saas/release-20260910045731`, commit `ba05fc19bd14f69b13163a68e4f182008d904a17`, plus a backend provider-route backfill hotfix applied to the active staging release.
- Phase 9E browser evidence: `phase9e-bank-account-readiness.spec.ts` and `phase9e-provider-ready-rehearsal.spec.ts` passed locally and on staging with demo fallback disabled.
- Phase 9E product change: HR admin can now manage employee bank accounts through `/hr-admin/employees/[employeeId]/bank-accounts`, including create, update, primary-account selection, masked list review, and responsive page checks.
- Phase 9E provider change: provider launch rehearsal readiness is certified through browser-visible certification/rehearsal actions on `/hr-admin/payroll-providers`.
- Phase 9E checks: Django system check passed, TypeScript passed, ESLint passed, staging backend/web services active, and public HTTP returned `200 OK`.
- Phase 9E launch audit state: tenant `northstar-foods` is ready with `can_launch: true`, `51/51` gates passed, `0` blockers, `0` warnings, and `0` release actions.
- Phase 9E provider rehearsal state: `3/3` lanes ready, `0` blocked lanes, `0` launch blockers.
- Phase 9E residual: post-deployment provider-route backfill hotfix must be checked in; bank-account delete/archive is intentionally not part of this closure slice.
- Evidence: `docs/qa/phase9e-final-warning-closure-2026-09-10.md`.
- Phase 9F full staging sign-off: done on 2026-09-10.
- Phase 9F decision: `PILOT READY - STAGING CONTRACT PASS`.
- Phase 9F browser result: production Playwright suites A-I passed with `32 passed` and `3 skipped`.
- Phase 9F live staging audit state: tenant `northstar-foods` is `ready`, `can_launch: true`, `51/51` gates passed, `0` blockers, `0` warnings, and `0` release actions.
- Phase 9F residual: real payroll provider callbacks, real identity-provider execution, real notification-provider delivery, production object-storage controls, and backup/restore/monitoring runbooks remain production-only evidence gates.
- Evidence: `docs/qa/phase9f-full-staging-signoff-2026-09-10.md`.
- Next Phase 9 slice: check in the test expectation updates, then move to production-readiness runbook execution for external providers and operations controls.

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

- `Green for staging pilot`
- Reason: full staging launch sign-off has passed, and the SaaS/security browser pack has been rerun locally against the staging API. Remaining risk is production-environment hardening and continued certification of any newly touched pages.

## 17. Execution Log

| Date | Phase | Result | Evidence | Confidence Movement |
|---|---|---|---|---|
| 2026-09-08 | Phase 0: Browser baseline and route health | PASS, 249/249 screen visits | `docs/qa/final-app-review-stage-browser-functionality-final3-2026-09-08.md` | Overall product confidence to 60% |
| 2026-09-08 | Phase 1A: Master-data/configuration safe form coverage | PASS, 15/15 tests | `docs/qa/phase1-master-data-crud-report-2026-09-08.md` | Overall product confidence to 63% |
| 2026-09-08 | Phase 1B: Organization master CRUD expansion | PASS, 25/25 Phase 1 browser tests and 249/249 final audit screen visits | `docs/qa/phase1b-organization-master-crud-report-2026-09-08.md` | Overall product confidence to 68% |
| 2026-09-09 | Phase 1C-A: Policy and governance master CRUD expansion | PASS, 8/8 Phase 1C-A tests; broader Phase 1 had 31/33 with affected org tests passing on targeted rerun | `docs/qa/phase1c-policy-governance-master-crud-report-2026-09-09.md` | Overall product confidence to 70% |
| 2026-09-09 | Phase 1C-B: Salary setup CRUD expansion | PASS, 3/3 focused salary setup browser tests | `docs/qa/phase1c-salary-setup-crud-report-2026-09-09.md` | Overall product confidence to 72% |
| 2026-09-10 | Phase 9E: Final warning closure implementation and staging certification | PASS on staging, 2/2 Phase 9E browser tests, tightened provider test pass, provider rehearsal ready, HRMS launch audit 51/51 | `docs/qa/phase9e-final-warning-closure-2026-09-10.md` | Phase 9 confidence to 98%, hotfix check-in pending |
| 2026-09-10 | Phase 9F: Full staging launch sign-off | PASS, full sign-off decision `PILOT READY - STAGING CONTRACT PASS`; production Playwright A-I `32 passed`, `3 skipped`; live staging audit `51/51` | `docs/qa/phase9f-full-staging-signoff-2026-09-10.md` | Phase 9 confidence to 99% for staging contract |
| 2026-09-10 | Phase 6R/7R: SaaS and security rerun | PASS, 9/9 local browser tests against staging API; covered five-tenant platform onboarding, tenant/role isolation, tenant admin console, security readiness, and trust audit | Playwright command in Phase 19 SaaS/security pack | SaaS/security confidence remains launch-grade for staging pilot |

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
