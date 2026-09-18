# Tenant Admin Enterprise Browser QA Plan

Date: 2026-09-18  
Target environment: staging first at `https://hrms.accerio.in`, then local reproduction for any defect  
Primary persona: Tenant Admin  
Supporting personas: limited Tenant Admin, Employee, Manager, HR Admin, Platform Admin, Support Agent  
Goal: bring Tenant Admin to the same discovery-first, browser-certified enterprise quality level as Platform Admin.

## Executive Intent

Tenant Admin is the customer-owner control center. It must be simple, trustworthy, tenant-scoped, and safe for real customer administrators.

This plan treats the running browser application as the source of truth. Existing tests and docs are useful evidence, but the final certification must rediscover every route, control, action, workflow, permission boundary, visual state, and audit trail from the deployed application.

## Current Confidence Baseline

| Area | Current Confidence | Why |
| --- | ---: | --- |
| Functional coverage | 95% historical | Previous Tenant Admin combined staging certification passed 34/34 tests on 2026-09-15. |
| Browser QA coverage | 90-92% current | Strong route, CRUD, validation, accessibility, and boundary tests exist, but Platform Admin-level final discovery inventory and fresh staging screenshots need to be refreshed after RBAC/menu-catalog changes. |
| UI/UX quality | 90-92% current | Dashboard, users, plan/settings, support access, security, and audit are focused pages. Need final polish review for dense tables, mobile, button consistency, empty states, and enterprise copy. |
| RBAC/tenant isolation | 88-92% current | Tenant role/permission tests exist. Remaining gap is true two-tenant automation with a second independent Tenant Admin identity. |
| Production readiness | 90-92% current | App-code confidence is high, but this plan requires a fresh complete staging run before marking current build at 95%+. |

## Discovered Tenant Admin Surface

| Module | Screen | Route | Primary Responsibility | Main Actions | Key Permissions | Current Test Coverage | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Shell | Tenant Admin workspace shell | `/tenant-admin/*` | DB-driven menu, quick links, account control center chrome | Navigate sidebar, quick links, logout, refresh, back/forward | Menu catalog filtered by assigned permissions | `tenant-admin-visual-accessibility-certification.spec.ts`, role/menu tests | Revalidate |
| Dashboard | Account Control Center | `/tenant-admin` | Tenant posture, launch progress, next action, metrics, quick links | Open setup, manage users, download audit, review blockers | `tenant.dashboard.view`, plus gated quick-link permissions | `tenant-admin-console-flows.spec.ts` | Revalidate |
| Users | User Management | `/tenant-admin/users` | Invite users, update roles, activate/suspend/revoke memberships | Invite, search, paginate, update roles, activate, suspend, reactivate, revoke | `tenant.users.view`, `tenant.users.manage` | `tenant-admin-console-flows.spec.ts`, `tenant-admin-users-dialog-certification.spec.ts` | Revalidate |
| Roles | Roles & Permissions | `/tenant-admin/roles` | Create/update custom roles and permission assignments | Add role, edit role, search, permission tabs, plan-disabled permissions | `tenant.roles.view`, `tenant.roles.manage` | `tenant-admin-roles-certification.spec.ts` | Revalidate deeply |
| Plan | Plan and Subscription | `/tenant-admin/plan` | View plan/usage and submit governed change requests | Submit request, cancel request, paginate queue, download audit | `tenant.plan.view`, `tenant.change_requests.manage`, `tenant.audit.export` | `tenant-admin-console-flows.spec.ts`, `tenant-admin-plan-settings-certification.spec.ts` | Revalidate |
| Setup Guide | Launch setup checklist | `/tenant-admin/setup` | Readiness steps and ownership guidance | Follow setup links, review blockers/warnings | `tenant.setup.view` | `tenant-admin-console-flows.spec.ts`, visual route coverage | Revalidate |
| Support Access | Support Access | `/tenant-admin/support-access` | Request and govern scoped support sessions | Request, approve, reject, start, end, revoke, search, paginate | `tenant.support_access.request`, `tenant.support_access.approve` | `tenant-admin-support-access-certification.spec.ts` | Revalidate |
| Trust Audit | Evidence ledger | `/tenant-admin/trust-audit` | Customer-visible tenant evidence | Filter, clear filters, paginate, download audit pack | `tenant.audit.view`, `tenant.audit.export` | `tenant-admin-security-trust-final-certification.spec.ts` | Revalidate |
| Settings | Tenant Settings | `/tenant-admin/settings` | Account profile, platform-owned identifiers, configuration health | Request account change, open setup | `tenant.settings.view`, optional `tenant.change_requests.manage` | `tenant-admin-plan-settings-certification.spec.ts` | Revalidate |
| Security | Enterprise Security Readiness | `/tenant-admin/security-readiness` | MFA, SSO, SCIM, session, audit, data protection posture | Review readiness, open trust audit | `tenant.security.view` | `tenant-admin-security-trust-final-certification.spec.ts` | Revalidate |

## API And Workflow Inventory

| API | Workflow | Positive Coverage Required | Negative Coverage Required |
| --- | --- | --- | --- |
| `/api/tenant-admin/memberships` | User invite/list | Valid invite, persistence after refresh/search, generated credential behavior | unauthenticated, wrong role, invalid email, duplicate, no role, seat-limit if data allows |
| `/api/tenant-admin/memberships/[membershipId]` | Membership mutation | update roles, activate, suspend, reactivate, revoke, audit event | wrong role, invalid transition, no remaining admin guard |
| `/api/tenant-admin/roles` | Role create/list | create custom role, permission assignment, search, plan-disabled permissions | duplicate code, missing fields, no permissions, wrong role |
| `/api/tenant-admin/roles/[roleId]` | Role update | edit custom role, disable/hide from assignment if supported | protected system role, last-admin lockout, wrong role |
| `/api/tenant-admin/change-requests` | Plan/settings requests | create plan/config request, refresh/search/pagination evidence | empty required fields, invalid JSON, wrong role |
| `/api/tenant-admin/change-requests/[requestId]` | Request transitions | cancel/approve/apply where allowed by workflow | repeated transition, note-required validation, wrong role |
| `/api/tenant-admin/support-access-grants` | Support access request | valid request with scopes, list/search/pagination | missing agent, missing reason, invalid duration, no scope, wrong role |
| `/api/tenant-admin/support-access-grants/[grantId]` | Support grant lifecycle | approve, reject, start, end, revoke, audit evidence | closed-state repeat action, wrong role |
| `/api/tenant-admin/security-readiness` | Security posture | tenant-scoped read and launch blocker evidence | unauthenticated/wrong role denial |
| `/api/tenant-admin/trust-audit` | Evidence filtering | group/type/session filters, pagination, empty state | unauthenticated/wrong role denial, cross-tenant leakage checks |
| `/api/tenant-admin/commercial-support-audit/download` | Audit export | JSON contract, checksum, tenant code, evidence groups | unauthenticated/wrong role denial |

## Enterprise QA Scope

For every Tenant Admin route, certify:

- Page load, refresh, back/forward, direct URL access.
- Sidebar menu and quick-link visibility based on DB-backed menu catalog and assigned permissions.
- All visible cards, metrics, badges, row actions, links, buttons, forms, inputs, selects, checkboxes, modals/dialogs, filters, search boxes, pagination controls, download links, and disabled actions.
- Create, view, edit, cancel, activate, suspend, reactivate, revoke, approve, reject, start, end, download, search, filter, sort where available, pagination, empty states, and repeated-action guards.
- Valid, invalid, empty, duplicate, long-input, boundary, and unauthorized scenarios.
- Persistence after refresh, searching, reopening records, and navigating away/back.
- Clear validation copy, success/warning/error states, loading states, and no silent failures.
- RBAC and unauthorized direct URL/API access.
- Tenant isolation: active tenant data only, no cross-tenant leak in UI/API/export payloads.
- Browser console errors, failed API/network requests, 4xx/5xx behavior, broken links.
- Desktop, laptop, tablet, and mobile layout where supported.
- Keyboard navigation, tab order, focus state, Escape close, labels, `aria-invalid`, `role=alert/status`, and accessible names.
- Visual quality: spacing, alignment, typography, contrast, table density, button hierarchy, scroll behavior, no horizontal overflow.
- Performance: slow route loads, slow table search, excessive API calls, heavy screenshots, and large audit downloads.

## Phase Plan

## Phase Execution Tracker

| Phase | Name | Objective | Deliverable | Status |
| --- | --- | --- | --- | --- |
| TA-EQ-0 | Fresh Discovery | Discover actual deployed Tenant Admin menus, pages, controls, APIs, and workflows in browser. | Updated inventory, screenshots, console/API/performance notes. | Baseline passed |
| TA-EQ-1 | Shell/RBAC/Menu | Prove menus are DB/permission-driven and unauthorized access fails closed. | Shell/RBAC certification results and defect list. | Baseline passed |
| TA-EQ-2 | Dashboard/Setup | Prove the account control center and setup guide work as intended. | Dashboard/setup browser certification. | Baseline passed |
| TA-EQ-3 | Users/Roles | Prove tenant user lifecycle, custom roles, permission assignment, and last-admin safety. | Users/roles CRUD and RBAC certification. | Baseline passed |
| TA-EQ-4 | Plan/Settings | Prove subscription visibility and governed account/config change workflow. | Plan/settings/change-request certification. | Baseline passed |
| TA-EQ-5 | Support Access | Prove scoped support request, approval, session, revoke, and audit workflow. | Support access lifecycle certification. | Baseline passed |
| TA-EQ-6 | Security/Trust | Prove security readiness and trust audit evidence/export. | Security/trust evidence certification. | Baseline passed |
| TA-EQ-7 | Final Production Readiness | Run full integrated staging journey and publish final confidence. | Final spec, report, defects, confidence level. | Pending deployment rerun |

## Decision Escalation Rules

I will pause and ask you before changing behavior when any of these are unclear:

- A page has a button/action but the intended business owner is unclear.
- A workflow can be completed by Tenant Admin but may need Platform Admin approval.
- A Tenant Admin can approve their own request and that creates governance risk.
- A permission is visible but the role that should own it is ambiguous.
- A page appears read-only but users would naturally expect edit capability.
- A validation is technically correct but confusing for a customer administrator.
- A feature is missing from UI but the backend supports it.
- A feature exists in UI but backend/API rejects it.
- Cross-tenant behavior cannot be proven without another tenant credential.

## Phase Priority

Recommended execution order:

1. **TA-EQ-0 Fresh Discovery** because it prevents us from assuming old docs still match the deployed app.
2. **TA-EQ-1 Shell/RBAC/Menu** because all other pages depend on correct access control.
3. **TA-EQ-3 Users/Roles** because this is the highest-risk Tenant Admin area: access, permissions, lockout, and account lifecycle.
4. **TA-EQ-4 Plan/Settings** because governed account changes must be clear before launch.
5. **TA-EQ-5 Support Access** because it affects customer trust and security.
6. **TA-EQ-6 Security/Trust** because it proves auditability and evidence.
7. **TA-EQ-2 Dashboard/Setup** can run earlier or in parallel, but final validation should happen after pages underneath are certified.
8. **TA-EQ-7 Final Production Readiness** only after all page-level issues are closed or explicitly accepted.

### Phase TA-EQ-0: Fresh Discovery And Inventory

Objective: rediscover Tenant Admin from the deployed browser, not from memory.

Tasks:

- Login as Tenant Admin on staging.
- Crawl sidebar, quick links, direct known routes, browser back/forward, and refresh.
- Build final Module -> Screen -> Route -> Actions -> Dependencies -> Expected Permissions -> Test Status inventory.
- Capture desktop screenshots for every route and mobile screenshots for dashboard, users, roles, support access, and trust audit.
- Record console errors, failed network requests, slow pages, and broken links.

Exit criteria:

- Inventory is complete and checked into docs.
- Every discovered screen is mapped to an existing or planned test.
- Unknown/untested areas are explicitly listed.

### Phase TA-EQ-1: Shell, Navigation, Menu Catalog, And RBAC

Objective: prove menus are permission-driven and fail closed.

Tasks:

- Verify DB-backed menu entries for Tenant Admin match visible sidebar/quick links.
- Test full Tenant Admin, limited Tenant Admin, HR Admin, Platform Admin, Employee, Manager, and Support Agent route access.
- Verify hidden menu does not imply backend access.
- Test direct URL, new tab, refresh, and API mutation denial for unauthorized personas.
- Verify logout/session switch/multiple-tab behavior.

Exit criteria:

- Full-access Tenant Admin sees allowed routes.
- Limited Tenant Admin sees only assigned menu/actions.
- Non-tenant personas cannot access Tenant Admin UI/API.
- No route leaks sensitive tenant data on denial pages.

### Phase TA-EQ-2: Dashboard And Setup Guide

Objective: certify the customer-owner control center.

Tasks:

- Test all dashboard cards, metrics, next action, setup progress, quick links, and download audit control.
- Verify setup-guide rows, owner labels, readiness states, action links, dependency guidance, and mobile rendering.
- Test warning/blocked/ready copy where data allows.
- Verify no dashboard action performs hidden mutation without clear confirmation.

Exit criteria:

- Dashboard and setup guide are simple, stable, responsive, and fully navigable.
- All links land on the correct focused page.

### Phase TA-EQ-3: Users And Roles

Objective: certify tenant access administration end to end.

Tasks:

- Users: invite, duplicate invite, invalid/empty values, no role, search, pagination, update roles, activate, suspend, reactivate, revoke, refresh persistence, audit evidence.
- Roles: create custom role, edit role, search, permission tabs/categories, plan-disabled permissions, protected system roles, duplicate/empty fields, limited-role read-only behavior, last-admin lockout.
- Verify assigned custom roles actually change visible menu and backend permissions.

Exit criteria:

- Every user and role mutation has browser proof, API proof, refresh/search proof, and audit proof.
- Last-admin and protected-role safeguards are certified.

### Phase TA-EQ-4: Plan, Settings, And Change Requests

Objective: prove tenant-owned commercial/configuration requests are governed and understandable.

Tasks:

- Plan page: plan summary, subscription status, usage evidence, request queue, pagination.
- Settings page: account profile, platform-governed field explanation, request account change entry point.
- Change request: create plan/config request, invalid JSON, missing required fields, cancel, repeated transition guard, refresh persistence, audit evidence.
- Wrong-role API denial.

Exit criteria:

- Tenant Admin can request changes but cannot bypass governed workflow.
- Validation and state transitions are clear.

### Phase TA-EQ-5: Support Access

Objective: certify safe assisted-operations workflow.

Tasks:

- Request grant with scopes, missing support agent, missing reason, invalid duration, no scope.
- Approve, reject, start session, end session, revoke, repeated-action disabled states.
- Search, pagination, empty state, row focus after mutation.
- Trust audit evidence for support lifecycle.
- Unauthorized API denial.

Exit criteria:

- Support access is scoped, auditable, reversible, and closed-state safe.

### Phase TA-EQ-6: Security Readiness And Trust Audit

Objective: certify customer evidence and launch posture.

Tasks:

- Security readiness domains: MFA, SSO, SCIM, session, audit, data protection.
- Verify launch blockers, evidence values, owners, status, trust-audit navigation, mobile rendering.
- Trust audit: group filters, type filters, support session filters, clear filters, empty state, pagination, download contract, checksum, tenant code.
- Verify no cross-tenant evidence exposure.

Exit criteria:

- Tenant Admin can understand readiness and export reliable evidence.
- Wrong-role and unauthenticated access fail closed.

### Phase TA-EQ-7: Full Staging Regression And Report

Objective: produce final Tenant Admin enterprise certification.

Tasks:

- Run all Tenant Admin e2e specs against staging.
- Run a final integrated browser journey from dashboard through users, roles, plan/settings, support access, security, trust audit, and logout.
- Capture screenshots/videos for key flows and defects.
- Update this document with final results, defect table, coverage, and confidence level.

Exit criteria:

- No critical/high defects open.
- All tests pass or explicitly document non-blocking exclusions.
- Final confidence is stated with evidence.

## Test Suite To Run

Staging command:

```bash
PLAYWRIGHT_BASE_URL=https://hrms.accerio.in \
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 \
HRMS_ENABLE_DEMO_DATA=false \
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 \
pnpm --dir web exec playwright test \
  tests/e2e/tenant-admin-console-flows.spec.ts \
  tests/e2e/tenant-admin-users-dialog-certification.spec.ts \
  tests/e2e/tenant-admin-roles-certification.spec.ts \
  tests/e2e/tenant-admin-plan-settings-certification.spec.ts \
  tests/e2e/tenant-admin-support-access-certification.spec.ts \
  tests/e2e/tenant-admin-security-trust-final-certification.spec.ts \
  tests/e2e/tenant-admin-boundary-certification.spec.ts \
  tests/e2e/tenant-admin-visual-accessibility-certification.spec.ts \
  --project=chromium --workers=1 --reporter=line --timeout=720000
```

Supporting checks:

```bash
pnpm --dir web exec tsc --noEmit
pnpm --dir web lint
git diff --check
```

## Coverage Gaps To Close

| Gap | Severity | Plan |
| --- | --- | --- |
| Fresh 2026-09-18 Tenant Admin deployed-browser discovery inventory is not yet captured. | Medium | Complete Phase TA-EQ-0 before changing UI. |
| True two-tenant Tenant Admin isolation automation still depends on a second tenant-admin credential. | Medium | Add second tenant persona or create one safely through Platform Admin in a controlled test tenant. |
| Current final integrated journey is split across multiple specs, not one production-readiness Tenant Admin spec. | Medium | Add `tenant-admin-final-production-readiness-certification.spec.ts` in Phase TA-EQ-7. |
| Import/export/file upload is not a major Tenant Admin surface today except audit download. | Low | Confirm during discovery and document as not applicable if no upload/import control exists. |
| Performance is mostly implicit today. | Low | Add timing capture for route load and heavy audit/download calls during Phase TA-EQ-0/7. |

## Defect Report Template

| ID | Module/Page | Issue | Type | Steps To Reproduce | Expected | Actual | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TBD | TBD | TBD | Functional/UI/UX/Validation/Security/Performance | TBD | TBD | TBD | Critical/High/Medium/Low | Screenshot/video/API/log |

## Final Certification Rules

Tenant Admin can be marked current-build enterprise ready only when:

- Every discovered route and action is present in the inventory.
- Every module has at least one meaningful browser workflow test beyond page load.
- CRUD/state transitions are verified by refresh, search/filter, and reopening the affected record.
- Unauthorized UI and API access fail closed.
- No critical/high defect remains open.
- Visual and accessibility checks pass for all supported route classes.
- Final report lists tested areas, untested areas, console/API errors, UI/UX suggestions, and confidence level.

## Current Next Action

Continue with Phase TA-EQ-7 deployment verification:

1. Deploy the Support Access hydration fix.
2. Re-run `tenant-admin-final-production-readiness-certification.spec.ts` on staging.
3. Re-run the Support Access route console probe or the full Tenant Admin suite if needed.
4. Mark TA-EQ-7 complete when the integrated journey passes with no console/API errors.

## Execution Log

| Date | Phase | Environment | Evidence | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-09-18 | TA-EQ-0 Fresh Discovery | Staging `https://hrms.accerio.in`, Chromium | `tenant-admin-visual-accessibility-certification.spec.ts` | 9/9 passed in 2.2m | Confirmed deployed Tenant Admin routes for dashboard, users, plan, setup, support access, trust audit, settings, security readiness, and mobile dashboard/navigation wrapping. Screenshots captured by Playwright attachments. No horizontal overflow found in certified routes. |
| 2026-09-18 | TA-EQ-0/Functional Baseline | Staging `https://hrms.accerio.in`, Chromium | Combined Tenant Admin suite | 38 passed, 1 skipped, 2 failed in 18.1m | Failures were both stale test assertions expecting hard-coded `of 5 launch steps complete`. Live UI now correctly uses permission-aware copy: `X of Y visible launch steps complete`. No functional workflow failure found in that run. |
| 2026-09-18 | TA-EQ-2 Dashboard/Setup Stabilization | Staging `https://hrms.accerio.in`, Chromium | `tenant-admin-console-flows.spec.ts` | 10/10 passed in 4.7m | Updated the dashboard/setup certification to assert dynamic visible-step progress copy. Confirmed dashboard, users, plan, support access, settings, setup, mobile setup, and audit evidence paths pass on staging. |
| 2026-09-18 | TA-EQ-0 through TA-EQ-6 Baseline | Staging `https://hrms.accerio.in`, Chromium | Combined Tenant Admin suite | 40 passed, 1 skipped, 0 failed in 16.3m | Clean staging baseline across boundary/RBAC, dashboard, users, roles, plan/settings, support access, security readiness, trust audit, and visual/mobile/no-overflow coverage. Skipped item is an intentional environment-gated test. |
| 2026-09-18 | TA-EQ-7 Final Integrated Journey | Staging `https://hrms.accerio.in`, Chromium | `tenant-admin-final-production-readiness-certification.spec.ts` | Functional journey completed, console gate failed | Added final integrated spec covering dashboard, users, roles, settings/plan change request, support access, security, trust audit export, and backend RBAC denial. It found a real UI quality defect: `/tenant-admin/support-access` emitted React hydration error `#418`. Root cause was timezone-sensitive expiry date formatting in a client component. Fixed locally by setting deterministic `Asia/Kolkata` timezone in `tenant-support-access-actions.tsx`; staging rerun pending deployment. |

## Current Confidence After Baseline

| Area | Confidence | Notes |
| --- | ---: | --- |
| Functional readiness | 95% | Staging browser suite passed across Tenant Admin dashboard, users, roles, plan/settings, support access, security, trust audit, setup, and boundaries. |
| Browser QA coverage | 95% | 40 passing staging tests plus route screenshots/mobile/no-overflow coverage. |
| UI/UX readiness | 93-95% | No alignment or overflow issue found in certified routes. Dashboard progress copy is now permission-aware and tested dynamically. |
| RBAC and menu confidence | 94-95% | Limited role menu visibility, disabled actions, backend denials, wrong-persona route denial, and last-admin lockout passed. |
| Tenant isolation confidence | 90-92% | Active tenant scoping and wrong-role denial passed. True two-tenant automation still needs a second independent tenant-admin credential. |

## Open Defects

| ID | Module/Page | Issue | Type | Status | Severity | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| TA-EQ-7-001 | Tenant Admin / Support Access | Support Access emitted React hydration error `#418` because support grant expiry dates were formatted without a deterministic timezone in a client component. | UI/UX | Fixed locally, pending deployment verification | Medium | Console probe isolated error to `/tenant-admin/support-access`; final integrated spec failed console gate after functional journey completed. |

## Non-Blocking Gaps

- Add a second independent Tenant Admin credential for true two-tenant isolation automation.
- Add a single final integrated Tenant Admin production-readiness spec, similar to Platform Admin, so the end-to-end release evidence is one coherent customer-owner journey rather than only module-level suites.
