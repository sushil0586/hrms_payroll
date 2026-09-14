# Public Launch Feature Vertical Detailed Plan

Date: 2026-09-14  
Product: HRMS Payroll SaaS  
Testing standard: every touched page must receive browser-based Playwright certification for navigation, all visible controls, CRUD/list behavior, filters, tabs, dropdowns, validation, empty states, permission denial, responsive layout, and no horizontal overflow.

## Execution Rules

- Build depth-first by feature vertical.
- No hardcoded customer data in product logic; tenant-specific behavior must come from configuration, master data, profile records, or environment flags.
- Seed data is allowed only for repeatable QA setup and demo/pilot scaffolding. Product workflows must be executable from frontend pages unless explicitly marked as admin-only setup.
- Every phase must update the plan after local run, staging deploy, and staging Playwright run.
- A phase is not done until local TypeScript/build and browser certification pass.
- Any failure becomes a phase observation, remediation task, rerun, and evidence note.

## Phase PLF-0: Baseline Inventory And Scope Freeze

Goal: lock what is launch-critical, beta, deferred, or disabled.

Implementation tasks:

- Review current routes, menus, and role dashboards.
- Create a launch feature matrix by role and module.
- Mark each route as `Launch`, `Pilot`, `Beta`, `Hidden`, or `Deferred`.
- Add feature flags where a page should exist but not be publicly available yet.
- Confirm no placeholder/demo fallback is used unless explicitly enabled.

Browser certification:

- Platform Admin, Tenant Admin, HR Admin, Finance Manager, Manager, Employee, and Support login.
- Sidebar/menu visibility by role.
- Disabled/beta feature behavior.
- Empty-state messaging.
- Mobile and desktop smoke for each role landing page.

Exit criteria:

- Launch scope is explicit.
- No public route exposes unready verticals accidentally.
- Confidence uplift target: +1%.

## Phase PLF-1: Public Signup, Contact, And Lead Approval

Goal: public visitors can submit signup/contact requests and Platform Admin can review, approve, reject, or convert them.

Status: In progress, local backend and browser conversion/provisioning path passed on 2026-09-14.

Implementation tasks:

- Strengthen index page with clear product positioning, pricing CTA, signup, and contact.
- Persist public leads with source, company size, country, contact, requested plan, message, consent, and status.
- Add Platform Admin lead queue with filters, pagination, detail drawer, notes, approve, reject, archive, and convert-to-tenant action.
- Add email/notification hooks as provider-ready stubs.
- Add duplicate lead detection and validation.

Browser certification:

- Public lead create positive flow.
- Required-field and invalid-email/phone validation.
- Duplicate submission handling.
- Platform Admin list, search, filter, pagination, detail view.
- Approve/reject/archive status transitions.
- Convert approved lead to tenant/admin invitation.
- Unauthorized user denial for lead admin APIs.
- Mobile layout for public page and lead form.

Exit criteria:

- A customer can request access from `/`.
- Platform Admin can act on the request without database/manual steps.
- Confidence uplift target: +2%.

Evidence:

- Backend API: `cd backend && ../.venv/bin/python -m pytest tests/test_public_lead_intake.py` -> `2 passed`.
- Browser local focused: `public-signup-to-tenant-provisioning.spec.ts` -> `1 passed`, including first tenant-admin provisioning and login.
- Browser local touched-page regression: `platform-admin-tabs-pagination-certification.spec.ts` plus `public-signup-to-tenant-provisioning.spec.ts` -> `2 passed`.

## Phase PLF-2: Tenant Provisioning And First Admin Login

Goal: approved lead becomes a tenant with an admin who can log in and begin setup.

Status: In progress, lead-to-tenant conversion, primary admin contact creation, first tenant-admin provisioning, and first tenant-admin login passed locally on 2026-09-14.

Implementation tasks:

- Add tenant provisioning workflow from Platform Admin.
- Create tenant, default plan, owner membership, workspace access, and initial status.
- Generate invitation/reset-password flow or documented secure initial credential process.
- Add provisioning audit trail and rollback/cancel states.
- Add tenant activation/suspension checks.

Browser certification:

- Provision tenant from approved lead.
- Create first tenant admin.
- Tenant admin first login.
- Tenant appears in Platform Admin tenant list.
- Suspended tenant/admin cannot access protected workspace.
- Re-activation restores access.
- Pagination and filters on tenant list.

Exit criteria:

- Five new tenants can be onboarded from browser UI without engineering steps.
- Confidence uplift target: +3%.

## Phase PLF-3: Guided Tenant Setup Wizard

Goal: tenant admin/HR admin can complete required setup in a guided, low-confusion flow.

Status: In progress, Tenant Admin launch guide added to the live tenant control center and locally certified on 2026-09-14.

Implementation tasks:

- Add setup checklist: legal entity, branch, location, department, designation, grade, employment type, cost center, pay calendar, pay group, salary components, policies, users.
- Add dependency-aware messages for empty mapped dropdowns, such as no active branches for selected legal entity.
- Add setup progress and readiness gates.
- Add skip/complete/needs-attention states with audit.

Browser certification:

- Wizard step navigation.
- Save draft and resume.
- Dependency dropdown narrowing.
- Empty dependency warnings.
- Required validation on each step.
- Readiness summary updates after each completed master.
- Desktop/mobile layout.

Exit criteria:

- A fresh tenant can see exactly what is pending before employee/payroll operations.
- Confidence uplift target: +3%.

Evidence:

- UI implementation: `/tenant-admin` now shows a guided setup section with five launch steps, progress percentage, per-step readiness badges, and quick links to account, member, security, HR setup, and audit workspaces.
- Browser local: `tenant-admin-console-flows.spec.ts` -> `2 passed`, covering desktop tenant-admin control center plus narrow viewport guided setup/no-overflow behavior.
- TypeScript/build: `pnpm --dir web exec tsc --noEmit && pnpm --dir web build` -> passed.

## Phase PLF-4: Bulk Data Onboarding Workbench

Goal: real customers can load 100+ employees and related masters without manual one-by-one creation.

Implementation tasks:

- Add import templates for organization masters, employees, salary assignments, bank details, statutory profiles, leave balances, and manager mappings.
- Add upload, parse, validation preview, error grouping, row-level correction, import commit, rollback, and audit evidence.
- Add import history with downloadable error report.
- Keep all validation rules configurable.

Browser certification:

- Download template.
- Upload valid file.
- Upload malformed file.
- Preview valid/invalid rows.
- Fix row errors.
- Commit import.
- Verify imported records in list pages.
- Import history pagination and exports.
- Unauthorized access denial.

Exit criteria:

- One tenant can onboard 100 employees from frontend import flow with auditable evidence.
- Confidence uplift target: +4%.

## Phase PLF-5: Compliance Reports And E-Filing Packages

Goal: HR Admin and Payroll Finance Manager can produce compliance-ready outputs.

Implementation tasks:

- Add/extend reports for TDS monthly/quarterly, Form 24Q preparation, Form 16 dataset, PF ECR, ESIC contribution, PT return, LWF if configured, challan register, return filing calendar, variance/reconciliation, and filing audit history.
- Add export packages with manifest, checksum, source hash, generated timestamp, tenant, period, and preparer.
- Add compliance calendar dashboard with due/overdue/completed states.
- Add upload/reconcile challan acknowledgment/reference numbers.

Browser certification:

- Report catalog visibility and role permissions.
- Each report filter, search, pagination, CSV/export, manifest/source hash.
- Empty state when no statutory artifacts exist.
- Generated package download.
- Challan reference upload/update.
- Filing status transition.
- Negative permission checks from ESS/MSS.

Exit criteria:

- Compliance report pack is useful for finance review and filing preparation.
- Confidence uplift target: +4%.

## Phase PLF-6: Provider Integration Certification Center

Goal: external rails are configurable, testable, and auditable before live use.

Implementation tasks:

- Add provider category setup for email, SMS/WhatsApp, storage, e-filing, accounting, and bank file/payment handoff.
- Add credential-ref-only configuration.
- Add sandbox test, callback test, retry test, revoke/expiry test, and certification evidence.
- Add live submission disable/enable gate requiring Platform Admin or authorized approval.
- Add provider failure taxonomy.

Browser certification:

- Provider create/update/list/detail.
- Sandbox certify action.
- Failed certification with visible reason.
- Retry and callback event visibility.
- Live rail disabled state.
- Export certification evidence.
- Role denial for non-authorized users.

Exit criteria:

- No provider goes live without visible certification status and audit evidence.
- Confidence uplift target: +4%.

## Phase PLF-7: Billing, Subscription, And Commercial Operations

Goal: the SaaS can sell plans and govern limits.

Implementation tasks:

- Add plan catalog, subscription record, seat limits, payroll-run limits, storage/export limits, trial state, billing contact, invoice placeholders, payment status, and entitlement rules.
- Add tenant upgrade/downgrade requests.
- Add billing provider adapter boundary.
- Add usage snapshots and over-limit warnings.

Browser certification:

- Platform Admin plan CRUD/list.
- Tenant Admin billing profile visibility.
- Change plan request.
- Approve/reject/apply plan change.
- Seat-limit enforcement.
- Usage-limit warning/blocking.
- Invoice/payment status list.
- Unauthorized denial.

Exit criteria:

- Platform can commercially operate tenants even before full payment gateway automation.
- Confidence uplift target: +3%.

## Phase PLF-8: Support, Audit, And Day-2 Operations

Goal: after launch, support can diagnose issues safely and tenants can trust what happened.

Implementation tasks:

- Expand support console by domain: account, configuration, payroll, provider, reports, SLA, resilience.
- Add scoped support session launch from approved grant.
- Add universal audit explorer or trust-audit drilldown.
- Add incident follow-up notes, owner assignment, status transitions, and export pack.

Browser certification:

- Tenant Admin support grant request/approve/revoke.
- Support agent scoped access.
- Denied support access outside granted scope.
- Audit filters and export.
- Incident create/update/resolve.
- SLA breach visibility.

Exit criteria:

- Support can troubleshoot without broad, invisible access.
- Confidence uplift target: +3%.

## Phase PLF-9: Notification Provider And Communication Readiness

Goal: workflow communication works through real or sandbox providers.

Implementation tasks:

- Configure email/SMS/WhatsApp provider profiles.
- Add template preview with variables.
- Add notification resend, retry, failure reason, and delivery timeline.
- Add opt-in/preferences where needed.

Browser certification:

- Template CRUD/preview.
- Provider configuration.
- Queue retry.
- Failure diagnostics.
- ESS/MSS/HR notification visibility.
- Mobile notification pages.

Exit criteria:

- Critical payroll/workflow notifications are observable and retryable.
- Confidence uplift target: +2%.

## Phase PLF-10: Mobile Web And PWA Readiness

Goal: high-frequency ESS/MSS workflows are usable on phones.

Implementation tasks:

- Responsive hardening for login, public page, ESS, MSS, payslips, documents, approvals, notifications, and statutory declarations.
- Add no-overlap/no-horizontal-scroll CSS constraints.
- Add installable PWA basics if desired after browser readiness.

Browser certification:

- Mobile viewport certification for each target route.
- Form controls, dropdowns, tables/cards, action bars, and modals.
- Screenshot review for text clipping and overlap.
- Touch-sized buttons.

Exit criteria:

- Employees and managers can complete common workflows from mobile browser.
- Confidence uplift target: +2%.

## Phase PLF-11: Optional Expansion Verticals

Goal: broaden the product after public payroll launch foundation is stable.

Candidate modules:

- Recruitment / ATS.
- Performance management.
- Expenses and reimbursements.
- Loans and advances.
- Asset management.
- HR helpdesk/tickets.
- Advanced shift scheduling and timesheets.

Execution rule:

- Each vertical must include data model, APIs, list/detail/create/edit pages, role permissions, reporting, audit evidence, and Playwright certification before it is marked launch-ready.

## Phase Completion Tracker

| Phase | Status | Local Evidence | Staging Evidence | Confidence |
| --- | --- | --- | --- | ---: |
| PLF-0 Baseline inventory | Planned | Pending | Pending | TBD |
| PLF-1 Public signup and leads | In progress | Backend `2 passed`; browser signup/review/qualify/convert/provision/login and platform-admin tabs regression `2 passed` | Signup/conversion deployed at `39d3880`; expanded provisioning/login pending deploy | 88% |
| PLF-2 Tenant provisioning | In progress | Converted lead creates tenant plus primary admin contact; first tenant-admin provisioning/login passed locally | Pending staging deploy/certification for expanded path | 84% |
| PLF-3 Guided setup wizard | Planned | Pending | Pending | TBD |
| PLF-4 Bulk onboarding | Planned | Pending | Pending | TBD |
| PLF-5 Compliance/e-filing reports | Planned | Pending | Pending | TBD |
| PLF-6 Provider certification | Planned | Pending | Pending | TBD |
| PLF-7 Billing/subscription | Planned | Pending | Pending | TBD |
| PLF-8 Support/audit ops | Planned | Pending | Pending | TBD |
| PLF-9 Notifications | Planned | Pending | Pending | TBD |
| PLF-10 Mobile/PWA readiness | Planned | Pending | Pending | TBD |
| PLF-11 Expansion verticals | Deferred | Pending | Pending | TBD |

## Recommended Next Build Phase

Start with PLF-1 and PLF-2 together as one depth-first launch path:

Public visitor submits lead -> Platform Admin reviews lead -> Platform Admin approves lead -> tenant is provisioned -> first tenant admin logs in -> tenant admin sees setup checklist.

This is the highest-value public launch path because it turns the current product from a strong pilot system into a repeatable SaaS onboarding system.
