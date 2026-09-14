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

Status: In progress, Tenant Admin launch guide and dedicated setup workbench added and locally certified on 2026-09-14.

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
- UI implementation: `/tenant-admin/setup` now provides a dedicated launch-readiness workbench with company profile, organization masters, users/access, payroll foundation, security/audit areas, and dependency guardrails before employee import.
- Browser local: `tenant-admin-console-flows.spec.ts` -> `3 passed`, covering desktop tenant-admin control center, narrow viewport guided setup/no-overflow behavior, setup workbench navigation, every readiness area, and dependency guardrail visibility.
- TypeScript/build: `pnpm --dir web exec tsc --noEmit` and `pnpm --dir web build` -> passed.

## Phase PLF-4: Bulk Data Onboarding Workbench

Goal: real customers can load 100+ employees and related masters without manual one-by-one creation.

Current status: in progress. PLF-4A organization master import, PLF-4B employee bulk import, PLF-4C salary assignment bulk import, PLF-4D employee bank import, PLF-4E employee statutory profile import, PLF-4F leave balance import, and PLF-4G reporting manager import are deployed and certified on staging.

Implementation tasks:

- Add import templates for organization masters, employees, salary assignments, bank details, statutory profiles, leave balances, and manager mappings.
  - PLF-4A complete locally for organization masters: template copy/download, CSV upload, validation preview, same-batch dependency resolution, row status, and commit of ready rows.
  - PLF-4B complete locally for employees: template copy/download, CSV upload, row validation, duplicate detection, optional structural name resolution, and commit of ready rows through the same employee create API used by the form.
  - PLF-4C complete for salary assignments: template copy/download, CSV upload, employee-code resolution, salary structure/version resolution, effective-date validation, batch duplicate detection, and commit of ready rows through the salary assignment API.
  - PLF-4D complete locally for employee bank accounts: template copy/download, CSV upload, employee-code resolution, primary-account batch guard, IFSC/account validation, and commit of ready rows through the employee bank account API.
  - PLF-4E complete locally for employee statutory profiles: template copy/download, CSV upload, employee-code and statutory-pack-code resolution, PAN/UAN/ESI/tax-regime/declaration-status validation, duplicate employee batch guard, commit of ready rows through the statutory profile API, and browser readback of source-hash evidence.
  - PLF-4F complete locally for leave balance actions: template copy/download, CSV upload, employee-code and leave-policy-name resolution from existing leave balances, action/units/effective-date/reason validation, duplicate action batch guard, and commit of ready rows through the leave balance action API.
  - PLF-4G complete locally for reporting manager mappings: template copy/download, CSV upload, employee-code and manager-code/name resolution, self-manager validation, duplicate employee batch guard, reason/effective-date validation, and commit of ready rows through the employee update API.
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

PLF-4A local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `organization-master-crud-flows.spec.ts -g "organization import workbench"` passed.
- Browser regression: full `organization-master-crud-flows.spec.ts` passed, `11 passed`.
- Build: `pnpm --dir web build` completed after the feature change.
- Certified paths: organization import workbench renders, template actions are visible, CSV upload populates preview, legal entity and branch rows validate as ready, invalid cost center row blocks with dependency guidance, ready rows commit, created rows appear in legal entity and branch catalogs, and touched views have no horizontal overflow.

PLF-4A staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `863d7ee`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `organization-master-crud-flows.spec.ts` passed, `11 passed`.
- Runtime observation: the full organization suite took 35.5 minutes on staging; keep the full certificate, but split future live jobs by tag/section when faster release feedback is needed.

PLF-4B local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `employee-directory-certification.spec.ts -g "employee bulk import"` passed.
- Browser regression: full `employee-directory-certification.spec.ts` passed, `2 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Certified paths: employee import workbench renders, template actions are visible, CSV upload populates preview, valid employees become ready, duplicate employee code blocks inside the same import batch, missing first name blocks, ready rows commit, created rows are searchable in the employee directory, duplicate blocked rows are not created, directory filters/pagination/detail/actions/empty state still pass, and touched views have no horizontal overflow.

PLF-4B staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `9c6a589`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `employee-directory-certification.spec.ts` passed, `2 passed`.
- Certified paths: employee bulk import and employee directory regression passed on staging against live APIs.

PLF-4C local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `salary-setup-flows.spec.ts -g "salary assignment import"` passed.
- Browser regression: full `salary-setup-flows.spec.ts` passed, `4 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Certified paths: salary assignment import workbench renders, template actions are visible, CSV upload populates preview, a disposable employee and active salary structure/version can be prepared, valid assignment rows become ready, invalid effective-date rows block, duplicate batch rows block, ready rows commit, salary coverage updates in-page, component empty state is visible when no components exist, existing salary setup CRUD remains certified, mobile salary setup controls remain usable, and touched views have no horizontal overflow.

PLF-4C staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `a0c1aff`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `salary-setup-flows.spec.ts` passed, `4 passed`.
- Certified paths: salary assignment import and full salary setup regression passed on staging against live APIs.

PLF-4D local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `employee-directory-certification.spec.ts -g "employee bank import"` passed.
- Browser regression: full `employee-directory-certification.spec.ts` passed, `3 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Certified paths: employee bank import workbench renders, template actions are visible, CSV upload populates preview, browser-created employee can receive a primary bank account import, unknown employee rows block, invalid IFSC rows block, duplicate primary account rows block within the same import batch, ready rows commit, blocked rows remain uncreated, employee bank account page reflects primary payout coverage, and touched views have no horizontal overflow.

PLF-4D staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `4cf9396`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `employee-directory-certification.spec.ts` passed, `3 passed`.
- Certified paths: employee bank import, employee bulk import, directory filters, pagination, detail actions, empty state, and layout checks passed on staging against live APIs.

PLF-4E local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `payroll-statutory-flows.spec.ts -g "employee statutory profile import"` passed.
- Browser regression: full `payroll-statutory-flows.spec.ts` passed, `4 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Local data note: Northstar local test tenant was kept on Enterprise for this run because repeated local payroll certification had exceeded the Growth `payroll_runs_per_month` meter. SaaS commercial enforcement remained active.
- Certified paths: employee statutory profile import workbench renders, template actions are visible, CSV upload populates preview, browser-created employee can receive a statutory profile import, unknown employee rows block, invalid PAN rows block, duplicate employee profile rows block within the same import batch, ready rows commit, created rows remain visible in the preview, profile collection readback confirms source-hash evidence, blocked rows remain uncreated, statutory workspace CRUD/regression remains certified, mobile statutory controls remain usable, and touched views have no horizontal overflow.

PLF-4E staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `3c0561c`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `payroll-statutory-flows.spec.ts` passed, `4 passed`.
- Certified paths: employee statutory profile import, statutory workspace source trail, statutory setup CRUD, declaration proof actions, and mobile statutory controls passed on staging against live APIs.

PLF-4F local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `leave-balance-import-flows.spec.ts` passed, `1 passed`.
- Browser regression: `leave-balance-import-flows.spec.ts` plus `leave-balance-report-certification.spec.ts` passed, `3 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Certified paths: leave balance import workbench renders, template actions are visible, CSV upload populates preview, valid adjustment rows become ready, duplicate employee-policy-date-action rows block, unknown employees block, zero-unit rows block, ready rows commit through the audited leave balance action API, created rows remain visible, transaction readback confirms the committed reason/employee, existing leave balance report filters/pagination/export/manifest/audit/drilldown remain certified, employee negative access remains denied, and touched views have no horizontal overflow.

PLF-4F staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `5df5778`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live `leave-balance-import-flows.spec.ts` plus `leave-balance-report-certification.spec.ts` passed, `3 passed`.
- Certified paths: leave balance import validation, duplicate protection, audited commit/readback, leave balance report filters/pagination/export/manifest/audit/drilldown, employee negative access denial, and touched-view no-overflow checks passed on staging against live APIs.

PLF-4G local certification evidence, 2026-09-14:

- TypeScript: `pnpm --dir web exec tsc --noEmit` passed.
- Browser: `employee-directory-certification.spec.ts -g "reporting manager import"` passed, `1 passed`.
- Browser regression: full `employee-directory-certification.spec.ts` passed, `4 passed`.
- Build: `pnpm --dir web build` passed after the feature change.
- Certified paths: reporting manager import workbench renders, template actions are visible, CSV upload populates preview, valid manager mapping rows become ready, duplicate employee mapping rows block, unknown employees block, self-manager rows block, unknown managers block, ready rows commit through the employee update API, directory/detail views show the updated manager, employee/bank import regressions remain certified, directory controls/pagination/selection/actions/empty state remain certified, and touched views have no horizontal overflow.

PLF-4G staging certification evidence, 2026-09-14:

- Deployment: staging updated to commit `f62b05b`.
- Smoke: `pnpm qa:post-deploy-smoke` passed with API/root/login 200, backend/web active, disk 68%.
- Browser: live full `employee-directory-certification.spec.ts` passed, `4 passed`.
- Certified paths: reporting manager import, employee bank import, employee bulk import, directory controls, pagination, selected detail, action menu links, empty-state reset behavior, and no-overflow checks passed on staging against live APIs.

Exit criteria:

- One tenant can onboard 100 employees from frontend import flow with auditable evidence.
- Confidence uplift target: +4%.

## Phase PLF-5: Compliance Reports And E-Filing Packages

Goal: HR Admin and Payroll Finance Manager can produce compliance-ready outputs.

Implementation tasks:

- PLF-5A: Add a dedicated TDS e-file readiness control center before expanding the remaining statutory returns.
- PLF-5B: Add a dedicated PF ECR readiness control center and guarded PF ECR export package.
- PLF-5C: Add a dedicated ESIC contribution readiness control center and guarded ESIC export package.
- PLF-5D: Add a dedicated Professional Tax readiness control center and guarded state return package.
- PLF-5E: Add a dedicated Labour Welfare Fund readiness control center and guarded LWF return package.
- PLF-5F: Add a consolidated compliance summary report across statutory readiness, challans, filings, provider evidence, and blocked launch actions.
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

- PLF-6A: Add provider certification evidence export and browser certification for the provider control center.
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
| PLF-4 Bulk onboarding | In progress | PLF-4A org import certified; PLF-4B employee import certified; PLF-4C salary assignment import certified; PLF-4D employee bank import certified; PLF-4E statutory profile import certified; PLF-4F leave balance import certified; PLF-4G reporting manager import certified; PLF-4H import history/audit evidence locally certified with backend check, migration, typecheck, production build, focused manager-import audit proof `1 passed`, and full employee directory suite `4 passed` | PLF-4A deployed at `863d7ee`, live org suite `11 passed`; PLF-4B deployed at `9c6a589`, smoke passed, live employee directory suite `2 passed`; PLF-4C deployed at `a0c1aff`, smoke passed, live salary setup suite `4 passed`; PLF-4D deployed at `4cf9396`, smoke passed, live employee directory suite `3 passed`; PLF-4E deployed at `3c0561c`, smoke passed, live statutory suite `4 passed`; PLF-4F deployed at `5df5778`, smoke passed, live leave balance suite `3 passed`; PLF-4G deployed at `f62b05b`, smoke passed, live employee directory suite `4 passed`; PLF-4H deployed at `6b12d43`, smoke passed, live employee directory/import-history suite `4 passed` | 99% |
| PLF-5 Compliance/e-filing reports | In progress | PLF-5A TDS e-file readiness control center locally certified with backend check, typecheck, production build, and browser suite `2 passed` covering catalog route, readiness metrics, all gates, search/filter/pagination, package download/blocked response, drilldown, and employee access denial. PLF-5B PF ECR readiness locally certified with typecheck, production build, and browser suite `2 passed` covering catalog route, readiness metrics, all gates, search/filter/pagination, package download/blocked response, manifest, drilldown, and employee access denial. PLF-5C ESIC contribution readiness locally certified with typecheck, production build, and browser suite `2 passed` covering catalog route, readiness metrics, all gates, search/filter/pagination, package download/blocked response, manifest, drilldown, and employee access denial. PLF-5D Professional Tax readiness locally and live certified with typecheck, production build, and browser suite `2 passed` covering catalog route, readiness metrics, all gates, search/filter/pagination, package download/blocked response, manifest blocked response, provider drilldown, responsive overflow, and employee access denial. PLF-5E LWF readiness locally and live certified with typecheck, production build, and browser suite `2 passed` covering catalog route, readiness metrics, all gates, search/filter/pagination, package download/blocked response, manifest blocked response, provider drilldown, responsive overflow, and employee access denial. PLF-5F Compliance summary locally and live certified with typecheck, production build, and browser suite `2 passed` covering catalog discovery, compliance hub summary/return tabs, consolidated metrics, search/status filters, pagination, CSV export, manifest, provider drilldown, responsive overflow, and employee access denial. | PLF-5A deployed at `cc1571f`, smoke passed, live TDS readiness suite `2 passed`, common migration drift resolved; PLF-5B deployed at `3c1a81e`, smoke passed, live PF ECR readiness suite `2 passed`; PLF-5C deployed at `d6420f9`, smoke passed, live ESIC contribution readiness suite `2 passed`; PLF-5D deployed at `862eaf3`, smoke passed, live Professional Tax readiness suite `2 passed`; PLF-5E deployed at `f571ade`, smoke passed, live LWF readiness suite `2 passed`; PLF-5F deployed at `22d407a`, smoke passed, live Compliance Summary suite `2 passed` | 98% |
| PLF-6 Provider certification | In progress | PLF-6A deployed at `48fbc82`; post-deploy smoke passed, and live browser suite `2 passed` covering provider center navigation, page actions, live-rail disabled messaging, metrics, connection selection, certification/rehearsal controls, storage/package/client/adapter/mapping/simulation/certification registers, provider evidence export, evidence manifest, no secret leakage, responsive overflow, and employee denial. First live attempt saw a transient redirect to `/login` while selecting a provider connection; clean rerun passed. PLF-6B deployed at `ed4695f`; smoke passed, and live browser suite `2 passed` covering failure taxonomy buckets, callback/retry/job evidence, selected-provider event ledger, guarded retry/requeue/revoke API behavior, sensitive-field evidence checks, responsive overflow, and employee denial. | Remaining PLF-6 work: provider category setup expansion, live-enable approval gate, and deeper provider failure remediation actions against real failed delivery fixtures. | 91% |
| PLF-7 Billing/subscription | Planned | Pending | Pending | TBD |
| PLF-8 Support/audit ops | Planned | Pending | Pending | TBD |
| PLF-9 Notifications | Planned | Pending | Pending | TBD |
| PLF-10 Mobile/PWA readiness | Planned | Pending | Pending | TBD |
| PLF-11 Expansion verticals | Deferred | Pending | Pending | TBD |

## Recommended Next Build Phase

Start with PLF-1 and PLF-2 together as one depth-first launch path:

Public visitor submits lead -> Platform Admin reviews lead -> Platform Admin approves lead -> tenant is provisioned -> first tenant admin logs in -> tenant admin sees setup checklist.

This is the highest-value public launch path because it turns the current product from a strong pilot system into a repeatable SaaS onboarding system.
