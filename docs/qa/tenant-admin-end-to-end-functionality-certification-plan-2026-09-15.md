# Tenant Admin End-To-End Functionality And Certification Plan

Date: 2026-09-15  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Tenant Admin  
Purpose: make Tenant Admin simple, single-responsibility, browser-certified, and launch ready.

## TA-95 Restart Baseline

Date: 2026-09-15  
Reason: Platform Admin has now reached 95% staging certification, so Tenant Admin is being re-baselined against the same stricter launch bar: simple operator experience, route-level responsibility, clear validation, full CRUD/list/browser evidence, mobile proof, accessibility proof, and final staging freeze.

Current confidence:

| Area | Current Rating | Target | Reason |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 82-85% | 95% | Core dashboard, users, plan, setup, support access, security, settings, and trust audit exist and have prior browser coverage. Remaining confidence gap is around launch-grade consistency, field/control inventory, visual proof across every route, and stricter per-page certification. |
| Tenant Admin QA/browser coverage | 85-88% | 95% | Existing suites cover many positive/negative flows, but the Platform Admin standard now requires every visible control group, filter, pagination path, dialog behavior, mobile route screenshot, and role boundary to be explicitly certified. |
| Tenant Admin user-friendliness | 72-78% | 95% | Pages are split, but some labels and workflows still feel admin-heavy. The experience needs a simpler customer-owner control-center feel with fewer mixed responsibilities per page. |
| Tenant Admin public launch readiness | 78-82% | 95% | Usable for controlled pilot; needs 95% pass on route UX, validation clarity, list operations, mobile/accessibility, and final staging certification before broad public launch. |

### TA-95-0 Fresh Inventory

Status: Complete locally on 2026-09-15  
Goal: identify every Tenant Admin route, API, visible responsibility, and certification gap before changing UI.

Current routes:

| Route | Current role | Visible controls/actions | TA-95 obligation |
| --- | --- | --- | --- |
| `/tenant-admin` | Account control center | Continue setup, Manage users, Download audit, quick links for Users/Plan/Support/Audit/Blockers, setup-guide links | Keep as dashboard-only; certify every quick link, tenant identity, metrics, setup states, desktop/mobile rendering, and empty/warning/blocked/ready copy. |
| `/tenant-admin/users` | User management | Invite member, search members, member pagination, update roles, activate, suspend, reactivate, revoke | Certify full CRUD, required/invalid/duplicate/no-role/seat-limit validation, dialogs, focus/Escape behavior, audit evidence, mobile no-overflow. |
| `/tenant-admin/plan` | Plan and subscription | Back to console, Download audit, change request form, payload JSON field, approve/reject/cancel/apply buttons where allowed | Certify tenant-owned request lifecycle, invalid JSON, missing required fields, note-required transitions, pagination/list growth, audit evidence. |
| `/tenant-admin/setup` | Setup guide | Start master setup, Back to console, setup-area action links | Keep mostly read-only; certify each area has owner/status/evidence/action link and that dependency guardrails are clear. |
| `/tenant-admin/support-access` | Support access | Back to console, Trust audit, request form, support agent, duration, reason, scope checkboxes, approve/reject/start/end/revoke actions | Certify support lifecycle, no-scope validation, missing reason/agent validation, revoke/reject note, scope enforcement, trust-audit evidence, pagination. |
| `/tenant-admin/security-readiness` | Security posture | Trust audit, Back to console, readiness domains and evidence rows | Certify every domain, blocked/missing values, owner labels, trust-audit navigation, non-tenant denial. |
| `/tenant-admin/trust-audit` | Customer audit evidence | Download audit, Back to console, group/type/session filters, clear filter, pagination | Certify filter combinations, empty state, pagination, download contract, source hashes, unauthorized denial. |
| `/tenant-admin/settings` | Account settings | Back to console, Setup guide, read-only platform-owned identifiers/governance/config health | Decide whether this remains read-only or gains tenant-owned edit requests. Certify read-only explanation and no misleading editable controls. |

Current APIs:

| API | Purpose | TA-95 obligation |
| --- | --- | --- |
| `/api/tenant-admin/memberships` | Create/list tenant memberships | Positive invite, validation failures, duplicate handling, seat-limit behavior, role denial. |
| `/api/tenant-admin/memberships/[membershipId]` | Update membership roles/status | Role update, activate/suspend/revoke, note requirements, audit proof, unauthorized denial. |
| `/api/tenant-admin/change-requests` | Create/list tenant-owned change requests | Plan/settings request creation, invalid payload, missing fields, list/pagination. |
| `/api/tenant-admin/change-requests/[requestId]` | Transition change requests | Approve/reject/cancel/apply with note rules and repeat-action denial. |
| `/api/tenant-admin/support-access-grants` | Create/list support grants | Request, validation, scope selection, role denial. |
| `/api/tenant-admin/support-access-grants/[grantId]` | Support grant transitions | Approve/reject/start/end/revoke, expiry/revoked denial, audit proof. |
| `/api/tenant-admin/security-readiness` | Security posture | Scoped read only; wrong-role denial; missing values clear. |
| `/api/tenant-admin/trust-audit` | Evidence list | Filters, pagination, tenant scoping, wrong-role denial. |
| `/api/tenant-admin/commercial-support-audit/download` | Evidence download | JSON contract, tenant code, hashes, wrong-role denial. |

Current test assets:

| Test file | Current coverage |
| --- | --- |
| `tenant-admin-console-flows.spec.ts` | Dashboard, users, member lifecycle, duplicate validation, plan change request lifecycle, support access lifecycle, settings, setup guide, mobile setup, and some audit evidence. |
| `tenant-admin-visual-accessibility-certification.spec.ts` | Added in TA-95-1. Certifies every Tenant Admin route, sidebar/top navigation shell, desktop screenshots, mobile dashboard wrapping, and no horizontal overflow. |
| `tenant-security-readiness-flows.spec.ts` | Security readiness domains, evidence, API payload, wrong-role denial. |
| `tenant-trust-audit-flows.spec.ts` | Trust audit filters, pagination, empty state, download contract, wrong-role denial. |
| `tenant-admin-boundary-certification.spec.ts` | Unauthenticated redirects, wrong-role route/API denial, tenant-code scoped read surfaces. |
| `public-launch-role-menu-certification.spec.ts` | Menu visibility and role landing coverage across personas. |

TA-95-0 findings:

- Tenant Admin is functionally broad and mostly covered, but the evidence is spread across older phase language and needs a clean 95% tracker.
- Dashboard is already closer to a control center, but must be visually certified route-by-route like Platform Admin.
- Users, Plan, and Support Access have mutation coverage, but need stricter visible-control inventory and dialog accessibility checks.
- Settings is the biggest product decision point: it is read-only today. For launch, either keep it intentionally read-only with clear change-request path, or implement editable tenant-owned preferences.
- True cross-tenant automation still needs a second independent tenant-admin credential; current proof is tenant-code scoped with one tenant-admin persona.

Next recommended phase:

Start **TA-95-1 Dashboard And Navigation Simplification**.

Target for TA-95-1:

- Make Tenant Admin dashboard feel as simple and polished as Platform Admin.
- Verify all sidebar menu items and top quick links map cleanly to focused pages.
- Add or harden a route-by-route Tenant Admin visual/accessibility certification spec.
- Raise UX confidence from 72-78% to about 84-86% before deeper per-page CRUD passes.

### TA-95-1 Dashboard And Navigation Simplification

Status: Complete locally on 2026-09-15  
Goal: make Tenant Admin feel like a clear customer-owner control center, then prove every Tenant Admin menu route renders cleanly with browser evidence.

Implemented:

- Simplified Tenant Admin sidebar labels from heavier admin wording to customer-owner wording:
  - `User Management` -> `Users`
  - `Plans & Subscription` -> `Plan`
  - `Audit Logs` -> `Trust Audit`
- Kept the `Tenant Admin Console` page heading stable so existing role-routing and launch tests remain compatible.
- Added a clear `Start here` control-center panel with a computed `Next action` based on the first blocked/watch setup step.
- Kept setup progress on the dashboard, but changed its visible language from a large guided setup feel to a lighter `Launch progress` / `Setup guide` section.
- Added `tenant-admin-visual-accessibility-certification.spec.ts` to certify all Tenant Admin routes and screenshot evidence.

Browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| `tenant-admin-visual-accessibility-certification.spec.ts` | Local Next UI + staging API, Chromium | 9 passed in 52.6s |
| `tenant-admin-console-flows.spec.ts` | Local Next UI + staging API, Chromium | 10 passed in 2.4m |

Command used:

```bash
HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_COOKIE_SECURE=false HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test web/tests/e2e/tenant-admin-visual-accessibility-certification.spec.ts web/tests/e2e/tenant-admin-console-flows.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000
```

Confidence after TA-95-1:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 82-85% | 86-88% | Core route and mutation workflows remain green after dashboard/navigation simplification. |
| Tenant Admin QA/browser coverage | 85-88% | 89-91% | Every Tenant Admin route now has explicit visual/accessibility/no-overflow proof, plus existing CRUD/lifecycle tests. |
| Tenant Admin user-friendliness | 72-78% | 84-86% | Dashboard now gives a single next action and simpler menu language. |
| Tenant Admin public launch readiness | 78-82% | 84-87% | Still needs field-by-field per-page UX/validation hardening before 95%. |

Next recommended phase:

Start **TA-95-2 Users Page Certification And Dialog UX**.

Target for TA-95-2:

- Certify every user-management field, checkbox, row action, validation, pagination, keyboard path, and mobile layout.
- Improve dialog focus/close behavior if gaps are found.
- Add clearer validation for no roles, duplicate identity, seat limit, and status transitions where current copy is weak.
- Raise Tenant Admin functionality and UX confidence to about 88-90%.

### TA-95-2 Users Page Certification And Dialog UX

Status: Complete locally on 2026-09-15  
Goal: harden Tenant Admin user-management dialogs and certify the page like a real tenant owner would use it.

Implemented:

- Added focus management for Tenant Admin user dialogs:
  - Invite member opens with focus on Email.
  - Update roles opens with focus on the first role checkbox.
  - Activate/Suspend/Revoke opens with focus on Change note.
- Added Escape-key close behavior for invite, update roles, and access-change dialogs.
- Connected validation messaging to form controls with `aria-describedby`.
- Exposed validation/status copy with `role="alert"` or `role="status"` as appropriate.
- Fixed invite Email and Username `aria-invalid` state so it matches visible validation before submit.
- Added `tenant-admin-users-dialog-certification.spec.ts` for granular dialog certification.

Browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| `tenant-admin-users-dialog-certification.spec.ts` | Local Next UI + staging API, Chromium | 4 passed in 31.6s |
| `tenant-admin-console-flows.spec.ts` | Local Next UI + staging API, Chromium | 10 passed in 2.7m |

Certified behavior:

- Invite dialog required email, invalid email, required username, no-role selection, disabled submit, focus, Escape close, and no overflow.
- Update roles dialog focus, no-role validation, disabled save, Escape close, and no overflow.
- Activate/Suspend/Revoke dialogs focus on note, show status-specific consequence copy, support cancel/Escape close, and keep layout stable.
- Member search empty state and pagination boundary controls remain clear.
- Existing invite/create, duplicate validation, activate, suspend, reactivate, revoke, audit evidence, wrong-role denial, plan, support, settings, setup, and mobile paths remain green.

Confidence after TA-95-2:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 86-88% | 88-90% | User access CRUD/lifecycle remains green and dialog behavior is stronger. |
| Tenant Admin QA/browser coverage | 89-91% | 91-92% | Users page now has dedicated field/control/dialog certification in addition to broad flow coverage. |
| Tenant Admin user-friendliness | 84-86% | 87-89% | Dialog entry, close, validation, and consequences are clearer for real users. |
| Tenant Admin public launch readiness | 84-87% | 87-89% | Still needs plan/support/settings/security/trust audit page-by-page deep certification before 95%. |

### TA-95-3 Plan And Settings Decision Flow

Status: Complete locally on 2026-09-15  
Goal: make tenant-owned account/profile changes understandable by routing them through the existing governed change-request queue.

Implemented:

- Added a `Request account change` path from Tenant Settings into Plan and Subscription.
- Prefilled the correct production request type, `configuration_change`, with target ref and explanatory description.
- Added clearer inline field validation for title, required target ref, and JSON payload.
- Added request-list pagination so the Plan page does not grow into a long uncontrolled queue.
- Added an empty state for the change-request queue.

Browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| `tenant-admin-plan-settings-certification.spec.ts` | Local Next UI + staging API, Chromium | 4 passed in 43.8s |
| `tenant-admin-console-flows.spec.ts` | Local Next UI + staging API, Chromium | 10 passed in 2.2m |

Certified behavior:

- Settings explains platform-governed fields and routes users to the correct request flow.
- Configuration-change requests show helpful defaults, then clear validation if required data is removed.
- Invalid JSON blocks submission with an inline message.
- Disposable request create/cancel lifecycle works from the browser.
- Queue pagination caps visible rows and preserves previous/next behavior.
- Unauthorized and employee-role API submissions are denied.

Confidence after TA-95-3:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 88-90% | 90-91% | Settings now has a governed change path instead of only read-only text. |
| Tenant Admin QA/browser coverage | 91-92% | 92-93% | Plan/settings now have dedicated validation, pagination, lifecycle, and role-denial tests. |
| Tenant Admin user-friendliness | 87-89% | 89-91% | The account-change path is clearer and avoids a dead-end settings page. |
| Tenant Admin public launch readiness | 87-89% | 89-91% | Needs Support Access deep UX and final staging rerun to continue toward 95%. |

### TA-95-4 Support Access Deep UX

Status: Complete locally on 2026-09-15  
Goal: make support-access requests, decisions, and history safe and easy for a tenant owner to operate.

Implemented:

- Added searchable Support Access grant history.
- Added pagination for Support Access grant rows so long histories remain manageable.
- Added clear empty-state copy when no grants match the current search.
- Connected Support agent, Duration, Reason, and scope validation to accessible inline messages.
- Kept the currently created or acted-on grant visible after create/approve/start/end/reject/revoke by focusing the grant history on that grant reason.

Browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| `tenant-admin-support-access-certification.spec.ts` | Local Next UI + staging API, Chromium | 4 passed in 38.6s |
| `tenant-admin-console-flows.spec.ts` | Local Next UI + staging API, Chromium | 10 passed in 2.1m |

Certified behavior:

- Required support agent, missing reason, invalid duration, and no-scope validation are visible and block submit.
- Valid support-access request creation works from the browser.
- Rejected grants become closed: approve, start session, and revoke remain disabled after rejection.
- Existing approve, start session, end session, second request, and revoke lifecycle still works.
- Search narrows the support grant list without breaking pagination.
- Pagination caps visible support grant rows to 5 and supports previous/next navigation.
- Unauthenticated and employee-role API submissions are denied.

Regression found and fixed:

- After ending a support session, the acted-on row could move off the visible first page before the user/test saw the final state. The list now focuses on the acted grant after create or mutation, keeping the current work visible.

Confidence after TA-95-4:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 90-91% | 91-92% | Support lifecycle, reject path, validation, search, and pagination are covered. |
| Tenant Admin QA/browser coverage | 92-93% | 93-94% | Support Access now has a dedicated negative/list/lifecycle certification spec plus full-suite regression. |
| Tenant Admin user-friendliness | 89-91% | 91-92% | Long support history and row-loss after actions are addressed. |
| Tenant Admin public launch readiness | 89-91% | 91-92% | Needs security/trust refresh and staging deployment rerun to move toward 95%. |

Next recommended phase:

Start **TA-95-5 Security, Trust Audit, And Final Tenant Admin Staging Rerun**.

Target for TA-95-5:

- Re-run Security Readiness and Trust Audit against the updated Tenant Admin shell.
- Certify filters, pagination, audit download, source hashes, role denial, desktop, and mobile proof.
- Run the combined Tenant Admin certification suite locally, then deploy and repeat on staging.

### TA-95-5 Security, Trust Audit, And Combined Local Certification

Status: Complete locally on 2026-09-15  
Goal: prove Tenant Admin security evidence, trust evidence, and the combined Tenant Admin control-center flow before staging deployment.

Implemented:

- Added `tenant-admin-security-trust-final-certification.spec.ts`.
- Certified Enterprise Security Readiness across desktop and mobile.
- Certified Trust Audit review scope, active filters, taxonomy, session evidence, evidence ledger, pagination, clear filters, and audit download integrity.
- Verified audit download includes tenant code, commercial events, support-access evidence, and a 64-character SHA-256 checksum.
- Re-ran the full Tenant Admin browser certification set after TA-95-1 through TA-95-5 changes.

Browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| `tenant-admin-security-trust-final-certification.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` | Local Next UI + staging API, Chromium | 9 passed in 1.0m |
| Combined Tenant Admin certification set | Local Next UI + staging API, Chromium | 34 passed in 5.9m |

Combined Tenant Admin certification set:

```bash
tenant-admin-console-flows.spec.ts
tenant-admin-users-dialog-certification.spec.ts
tenant-admin-plan-settings-certification.spec.ts
tenant-admin-support-access-certification.spec.ts
tenant-admin-security-trust-final-certification.spec.ts
tenant-security-readiness-flows.spec.ts
tenant-trust-audit-flows.spec.ts
tenant-admin-boundary-certification.spec.ts
```

Build evidence:

- Production build passed.
- Touched routes included `/tenant-admin/security-readiness`, `/tenant-admin/trust-audit`, and Tenant Admin API routes.

Confidence after TA-95-5 local:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 91-92% | 93-94% | All Tenant Admin focus areas now have local browser proof across positive, negative, list, and boundary behavior. |
| Tenant Admin QA/browser coverage | 93-94% | 94-95% | Combined 34-test Tenant Admin certification passed locally against staging API shape. |
| Tenant Admin user-friendliness | 91-92% | 92-93% | Security/Trust are understandable as evidence pages; no new UX defect found in final local run. |
| Tenant Admin public launch readiness | 91-92% | 93-94% | Needs staging deployment and full staging rerun for 95% launch confidence. |

### TA-95-5 Staging Certification

Status: Complete on staging on 2026-09-15  
Environment: `https://hrms.accerio.in`  
Deployed commit: `f6f6ccc`

Deployment evidence:

- Staging deploy completed from `origin/main`.
- Web production build passed on EC2.
- Django system check passed.
- Migrations checked: no pending migrations.
- Backend service active.
- Web service active.
- Post-deploy smoke passed: API health 200, root 200, login 200, disk 68%.

Staging browser evidence:

| Run | Environment | Result |
| --- | --- | --- |
| Combined Tenant Admin certification set | Staging `https://hrms.accerio.in`, Chromium | 34 passed in 7.8m |

Final Tenant Admin confidence after staging:

| Area | Final Rating | Notes |
| --- | ---: | --- |
| Tenant Admin functionality readiness | 95% | Dashboard, users, plan/settings, support access, security, trust audit, setup, and boundaries passed staging browser certification. |
| Tenant Admin QA/browser coverage | 95% | 34-test combined staging suite passed, including positive, negative, lifecycle, list, pagination, mobile, API denial, and audit evidence paths. |
| Tenant Admin user-friendliness | 93-94% | Pages are now simpler and single-purpose; remaining improvement would be richer in-product explanations/tooltips, not launch blocking. |
| Tenant Admin public launch readiness | 95% | Tenant Admin is ready for pilot/public-launch candidate use from the certified app-code perspective. |

Remaining non-blocking improvement:

- Add a second independent tenant-admin credential to automate true two-tenant isolation beyond active tenant-code scoped proof.

## Tenant Admin Final Launch Summary

Status: launch-ready for pilot/public-launch candidate from the app-code and browser-certification perspective.  
Final confidence: 95%.  
Certification date: 2026-09-15.  
Certified environment: staging at `https://hrms.accerio.in`.  
Certified commit: `f6f6ccc`.

What is certified:

- Tenant Admin dashboard behaves as a customer-owner control center.
- Users page supports invite, duplicate validation, role updates, activate, suspend, reactivate, revoke, search, pagination, dialogs, focus behavior, and audit evidence.
- Plan and Settings support governed account/configuration change requests with validation, create/cancel, approve/apply regression coverage, pagination, and role denial.
- Support Access supports request, validation, scope selection, approve, reject, start session, end session, revoke, search, pagination, closed-state behavior, and role denial.
- Security Readiness clearly shows MFA, SSO, SCIM, session, audit, data-protection posture, evidence, owner, status, desktop rendering, and mobile rendering.
- Trust Audit supports event-group filters, event-type filters, active filter display, clear filters, empty states, pagination, audit download, checksum verification, and role denial.
- Tenant Admin boundary checks verify unauthenticated redirects, wrong-role denial, tenant-code scoped read surfaces, and API fail-closed behavior.

Launch decision:

- No critical or high Tenant Admin defects remain in the certified scope.
- No UI alignment or horizontal-overflow issue was found in the certified desktop/mobile routes.
- The only remaining non-blocking confidence gap is true two-tenant automation with a second independent tenant-admin credential.

Next action for product readiness:

- Keep Tenant Admin code frozen except for critical fixes.
- Add one more tenant-admin persona for a second tenant when available, then run a dedicated cross-tenant isolation suite.
- Continue with the next role workspace after Tenant Admin, most likely HR Admin or Finance Manager, using the same 95% certification standard.

## Tenant Admin Revalidation Log

| Date | Environment | Evidence | Result | Confidence |
| --- | --- | --- | --- | --- |
| 2026-09-16 | Local web against live staging API | Re-ran combined Tenant Admin certification set: console, users dialogs, plan/settings, support access, security/trust final, security readiness, trust audit, and boundary certification. | 34/34 passed in 5.6m | Tenant Admin remains 95% for app-code functionality, browser QA, and public-launch readiness. |
| 2026-09-16 | Local web against live staging API | Re-ran Tenant Admin visual/accessibility route certification across dashboard, users, plan, setup, support access, trust audit, settings, security readiness, and mobile dashboard/navigation wrapping. | 9/9 passed in 55.5s | UX confidence remains 95% for certified route shell, no-overflow, and menu/navigation behavior. |

## Product Direction

Tenant Admin is the customer account owner workspace. It should not feel like HR operations or payroll processing. It should behave like a simple account control center where the customer owner can answer:

- Is my tenant ready to launch?
- Who has access?
- Is my plan and seat usage healthy?
- Are required setup areas complete?
- Is enterprise security ready?
- Has support access been requested, approved, used, or revoked?
- Can I download audit evidence?

## Current Tenant Admin Surface

| Area | Route | Current Responsibility | Launch Concern |
| --- | --- | --- | --- |
| Dashboard | `/tenant-admin` | Account posture, setup checklist, members, change requests, support access, role coverage, config health, usage, audit summary | Too many responsibilities on one long page |
| Setup Guide | `/tenant-admin/setup` | Launch-readiness checklist and dependency guardrails | Mostly read-only, useful as first-run guide |
| Security Readiness | `/tenant-admin/security-readiness` | MFA, SSO, SCIM, session, audit, data protection posture | Read-only, needs clear “what to fix” messaging |
| Trust Audit | `/tenant-admin/trust-audit` | Customer-visible event filters, evidence ledger, audit download | Needs pagination and filter certification |

## Target Single-Responsibility Structure

### 1. Tenant Dashboard

Route: `/tenant-admin`

Responsibility:
- Show account posture only.
- Show launch status, blockers, warnings, open actions, and quick links.
- Show small cards for Users, Plan, Setup, Security, Support, Audit.
- Do not host full CRUD forms except high-priority quick actions.

Must include:
- Tenant name, code, status, country, timezone.
- Launch readiness status.
- Blocker/warning count.
- Seat usage summary.
- Open change request count.
- Active support grant count.
- Last audit event timestamp.
- Clear “next best action.”

Must test:
- Page loads for tenant admin.
- No workspace load failure.
- No horizontal overflow at desktop and mobile.
- Every quick link navigates to the correct page.
- Empty, warning, blocked, and ready states render with clear language.

### 2. User Management

Target route: `/tenant-admin/users`

Responsibility:
- Invite tenant users.
- Assign tenant-level and workspace roles.
- Update roles.
- Suspend/reactivate membership.
- Enforce seat limits and plan restrictions.

Fields and controls:
- Email textbox.
- Username textbox.
- Role checkboxes.
- Invite member button.
- Existing member rows.
- Update roles button per row.
- Suspend/reactivate button per row.
- Status badge per member.
- Pagination when member list is long.

Positive tests:
- Invite a valid member.
- Verify new member appears in list.
- Update roles for a member.
- Suspend member.
- Reactivate member if supported.
- Verify audit event is created.

Negative tests:
- Empty email blocks submit.
- Invalid email shows clear inline validation.
- Duplicate user/member gives clear message.
- No role selected blocks invite.
- Seat limit exceeded blocks invite with clear message.
- Employee/manager persona cannot mutate tenant membership.

### 3. Plans And Subscription

Target route: `/tenant-admin/plan`

Responsibility:
- Show current plan, subscription status, billing provider ref, usage meters, limits, and change request entry point.
- Tenant Admin should request changes, not directly alter platform billing.

Fields and controls:
- Current plan summary.
- Subscription status.
- Seat limit and usage.
- Meter usage table.
- Request plan change form.
- Request add-on or limit increase form.
- Recent change request list with pagination.

Positive tests:
- Submit plan change request.
- Approve/apply path if allowed for owner workflow.
- Verify request appears with status.
- Verify audit event and trust audit visibility.

Negative tests:
- Missing title blocks request.
- Missing target ref blocks request.
- Invalid JSON payload shows clear validation.
- Cancel/reject requires decision note where applicable.
- Applied request cannot be applied again.

### 4. Setup Guide

Route: `/tenant-admin/setup`

Responsibility:
- Show tenant launch checklist only.
- Explain which owner must complete each setup area.
- Link to HR Admin setup pages where HR owns the work.

Must include:
- Company profile readiness.
- Organization masters readiness.
- Users and access readiness.
- Payroll foundation readiness.
- Security and audit readiness.
- Dependency guardrails before employee import.

Positive tests:
- Each setup area visible.
- Each setup area has owner, status, evidence, and action link.
- Links navigate correctly.
- Ready/warning/blocked states render clearly.

Negative tests:
- Missing configs show blocked.
- Missing members show warning or action needed.
- Security blockers show action required.

### 5. Support Access

Target route: `/tenant-admin/support-access`

Responsibility:
- Request, approve, start, end, reject, and revoke scoped support access.
- Show exactly what support can access.
- Show support session evidence.

Fields and controls:
- Support agent textbox.
- Duration select/input.
- Reason textbox.
- Scope checkboxes.
- Request access button.
- Approve button.
- Reject button.
- Start session button.
- End session button.
- Revoke button.
- Decision note.
- Session ref.
- Recent grants list with pagination.

Positive tests:
- Request support grant.
- Approve grant.
- Start session.
- End session.
- Revoke grant.
- Verify scoped support can access allowed domain.
- Verify trust audit records all lifecycle events.

Negative tests:
- Missing support agent blocks submit.
- Missing reason blocks submit.
- No scope selected blocks submit.
- Reject without note blocks action.
- Start denied before approval.
- Support cannot access domains outside approved scope.
- Expired/revoked grants deny support access.

### 6. Security Readiness

Route: `/tenant-admin/security-readiness`

Responsibility:
- Read-only enterprise security posture.
- Show what is ready, warning, blocked, and who owns the fix.

Must include:
- MFA status and allowed methods.
- SSO status, protocol, last tested timestamp.
- SCIM status and last sync timestamp.
- Session idle/absolute timeout.
- Audit retention and customer export.
- Data protection status.
- Launch blockers list.

Positive tests:
- All security domains render.
- Each check has label, evidence, status, and owner.
- Trust audit link works.
- No horizontal overflow.

Negative tests:
- Missing values render as “Not configured,” not blank.
- Blockers show clear action wording.
- Non-tenant roles cannot access this page unless explicitly entitled.

### 7. Trust Audit

Route: `/tenant-admin/trust-audit`

Responsibility:
- Customer-visible audit evidence only.
- Filter, page, inspect, and download audit evidence.

Fields and controls:
- Event group filters.
- Event type filters.
- Actor/source/session filters if exposed.
- Clear filter link.
- Evidence rows.
- Source hash.
- Audit download button.
- Pagination for long event lists.

Positive tests:
- All event groups filter correctly.
- Event type filters update URL and visible rows.
- Support session filter works.
- Clear filter resets to all evidence.
- Download audit returns JSON with expected tenant and source hashes.
- Pagination next/previous works when there are many events.

Negative tests:
- Unknown filter returns empty state, not crash.
- Employee/manager cannot access tenant audit.
- Cross-tenant audit refs are denied.
- Download without session is denied.

### 8. Settings

Target route: `/tenant-admin/settings`

Responsibility:
- Tenant account profile and tenant-owned preferences.
- Platform-owned fields should be read-only with clear reason.

Fields and controls:
- Legal name.
- Country.
- Timezone.
- Tenant code/subdomain read-only.
- Notification preferences if available.
- Save changes button where editable.

Positive tests:
- Editable tenant-owned fields save.
- Read-only fields remain protected.
- Saved values survive reload.

Negative tests:
- Invalid timezone/country blocked.
- Empty required profile fields blocked.
- Unauthorized roles cannot mutate settings.

## Certification Phases

### Phase TA-0: Inventory And Route Truth

Goal: prove we know every Tenant Admin route, API, menu item, and mutation.

Actions:
- Inventory current routes.
- Inventory current APIs.
- Inventory current tests.
- Compare current surface against target single-responsibility structure.

Exit criteria:
- This document is created.
- Gaps are marked as implementation targets.

Status: Complete.

Baseline evidence:
- Staging command run on 2026-09-15:
  `PLAYWRIGHT_BASE_URL=https://hrms.accerio.in HRMS_API_BASE_URL=https://hrms.accerio.in/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts public-launch-role-menu-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000`
- Result: `12 passed`.
- Interpretation: current Tenant Admin is reachable and stable across existing menu/dashboard/security/audit checks, but still needs single-responsibility page split and deeper CRUD/validation certification before launch confidence can be raised.

### Phase TA-1: Split Long Dashboard Into Single-Responsibility Pages

Goal: reduce `/tenant-admin` to a true dashboard and move embedded operations to focused pages.

Implementation targets:
- Add `/tenant-admin/users`. Done.
- Add `/tenant-admin/plan`. Done.
- Add `/tenant-admin/support-access`. Done.
- Add `/tenant-admin/settings` if editable settings exist. Done as read-only account/governance settings until tenant-owned edit APIs exist.
- Keep `/tenant-admin/setup`, `/tenant-admin/security-readiness`, `/tenant-admin/trust-audit`. Done.
- Update Tenant Admin sidebar and quick links. Done.

Testing targets:
- New pages load.
- Dashboard quick links work.
- No long mixed CRUD page remains.
- Desktop and mobile no-overflow certification.

Status: Complete on local and staging.

Evidence:
- `pnpm --dir web build` passed on 2026-09-15 and generated routes for `/tenant-admin/users`, `/tenant-admin/plan`, `/tenant-admin/support-access`, and `/tenant-admin/settings`.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `7 passed`.
- Local browser command against `http://localhost:3211` with staging API: `public-launch-role-menu-certification.spec.ts` -> `7 passed`.
- Staging deployment completed on commit `8978107`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` -> `7 passed`.
- Staging browser command against `https://hrms.accerio.in`: `public-launch-role-menu-certification.spec.ts` -> `7 passed`.
- Interpretation: Tenant Admin is now split into focused pages and the sidebar route model works on staging. Next confidence gain must come from deeper CRUD, validation, pagination, and negative testing per focused page.

### Phase TA-2: User Management CRUD Certification

Goal: certify membership invite, role update, suspend/reactivate, validation, role boundary, audit evidence.

Testing targets:
- Positive invite/update/suspend flow.
- Negative validation flow.
- Seat limit guard.
- Unauthorized mutation denial.
- Pagination for long members.

Status: Complete locally and on staging.

Evidence:
- User Management now uses an `Invite member` dialog for add flow and an `Update roles` dialog for role updates.
- Dialog validation covers required email, valid email format, username, and at least one selected role before submit.
- Risky access actions now use confirmation dialogs for activate, suspend, and revoke with a change-note field and action-specific warning copy.
- User Management now receives the full tenant membership list, caps visible rows to 8 per page, and supports search by name, email, username, status, or role.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts -g "invite and access lifecycle"` -> `1 passed`.
- Local lifecycle evidence covers disposable invite, duplicate-user validation, activate, suspend, reactivate, revoke, and screenshot attachments for invited/duplicate/suspended/revoked states.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts -g "focused user management"` -> `1 passed`; covered row cap, search narrowing, no-match state, and next/previous pagination.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `8 passed`.
- Staging deployment completed on commit `bc029b8`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` -> `8 passed`; covered row cap, search narrowing, no-match state, next/previous pagination, disposable member lifecycle, plan, support, settings, mobile, and setup workbench.
- Staging lifecycle evidence covers disposable invite, duplicate-user validation, activate, suspend, reactivate, revoke, and screenshot attachments for invited/duplicate/suspended/revoked states.
- Staging browser command against `https://hrms.accerio.in`: `public-launch-role-menu-certification.spec.ts` -> `7 passed`.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts -g "denies tenant membership|shows tenant membership audit"` -> `2 passed`; covered unauthenticated and employee-role mutation denial plus trust-audit evidence for invited, activated, suspended, and revoked membership events.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `10 passed`; covered dashboard, user management, invite/update/lifecycle, unauthorized mutation denial, trust audit evidence, plan change request, support access, settings, mobile setup, and setup workbench.
- Staging deployment completed on commit `4cfd44e`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` first run -> `9 passed, 1 failed`; failed assertion assumed a suspendable member existed on the first paginated page after historical staging test data accumulated.
- Test-only hardening removed that data-order assumption because suspend/reactivate/revoke is already covered by the created disposable member lifecycle test.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts -g "focused user management"` -> `1 passed`.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` final rerun -> `10 passed`; covered dashboard, user management, invite/update/lifecycle, unauthorized mutation denial, trust audit evidence, plan change request, support access, settings, mobile setup, and setup workbench.
- Remaining TA-2 work: none for current scope; check in the data-independent test adjustment and evidence update.

### Phase TA-3: Plan And Change Request Certification

Goal: certify plan visibility and tenant-owned commercial change request lifecycle.

Testing targets:
- Submit change request.
- Approve/reject/cancel/apply rules.
- Invalid payload validation.
- Audit evidence.
- Pagination for long request list.

Status: Complete locally and on staging.

Evidence:
- Plan page keeps one clear responsibility: commercial profile, usage evidence, and tenant-owned change requests.
- Change request form shows inline browser validation for required title and invalid JSON payloads.
- Submit remains disabled until required request fields and JSON payload are valid.
- Approve, reject, and apply actions require a decision note before the action button is enabled, matching backend governance rules.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts -g "focused plan page"` -> `1 passed`; covered commercial profile, usage evidence, required title, invalid JSON blocking, request creation, submitted state, note-required action buttons, approve, and mark applied.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `10 passed`; verified dashboard, users, membership lifecycle, unauthorized boundaries, trust audit, plan, support, settings, mobile setup, and setup workbench after the Plan UX change.
- Staging deployment completed on commit `914fb38`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts -g "focused plan page"` -> `1 passed`; covered deployed inline validation, valid request creation, note-required action buttons, approve, and mark applied.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` -> `10 passed`.
- Remaining TA-3 work: none for current scope.

### Phase TA-4: Support Access Certification

Goal: certify scoped support grant lifecycle end to end.

Testing targets:
- Request, approve, start, end, revoke.
- Reject with required note.
- Scope enforcement.
- Support-agent allowed/denied domains.
- Trust audit evidence.
- Pagination for long grants.

Status: Complete locally and on staging.

Evidence:
- Support Access request form shows inline browser validation for required support agent, required reason, valid duration, and at least one selected scope.
- Request access remains disabled until the form is valid.
- Grant action rows show that a decision note is required for approve, reject, or revoke.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts -g "support access page"` -> `1 passed`; covered required-field validation, duration validation, request creation, requested state, note-required approve, approve, start session, end session, second request creation, note-required revoke, and revoke.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `10 passed`; verified dashboard, users, membership lifecycle, unauthorized boundaries, trust audit, plan, support lifecycle, settings, mobile setup, and setup workbench after Support Access UX hardening.
- Staging deployment completed on commit `8b5ba58`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts -g "support access page"` -> `1 passed`; covered deployed required-field validation, duration validation, request creation, approve, start session, end session, second request creation, and revoke.
- Staging browser command against `https://hrms.accerio.in`: `tenant-admin-console-flows.spec.ts` -> `10 passed`.
- Remaining TA-4 work: none for current scope.

### Phase TA-5: Security And Trust Audit Certification

Goal: certify security readiness and trust audit as customer-facing evidence pages.

Testing targets:
- Security domains and blockers.
- Missing evidence clarity.
- Trust filters, clear, empty states.
- Audit download integrity.
- Pagination for long audit lists.

Status: Complete locally and on staging.

Evidence:
- Added Trust Audit pagination controls with filter-preserving First, Previous, Next, and Last actions.
- Expanded browser certification for Security Readiness across MFA, SSO, SCIM, session, audit, data-protection posture, evidence labels, owner/status text, navigation to Trust Audit, and employee-role API denial.
- Expanded browser certification for Trust Audit across event-group filters, event-type filters, clear filters, empty unknown-filter state, pagination controls, audit pack download contract, evidence checksum, and employee-role API denial.
- Local backend check passed: `./.venv/bin/python manage.py check`.
- Local production web build passed: `pnpm --dir web build`.
- Local focused TA-5 Playwright against staging API passed: `tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` = 6/6.
- Local full Tenant Admin Playwright against staging API passed: `tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` = 16/16.
- Staging deployment completed on commit `0c3de1d`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging full Tenant Admin Playwright against `https://hrms.accerio.in` passed: `tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` = 16/16.

Observed product posture:
- Security Readiness is intentionally read-only and clear enough for tenant owners to understand readiness domains and blockers.
- Trust Audit is now usable for long histories because filters and pagination are visible in the page, not only supported by the backend.

### Phase TA-6: Cross-Role And Cross-Tenant Boundaries

Goal: prove Tenant Admin data and actions cannot leak across roles or tenants.

Testing targets:
- Employee, manager, support without grant, HR-only, and platform-only users are denied mutation paths.
- Tenant admin cannot access another tenant’s data.
- Direct API mutations fail closed.
- Browser routes redirect or show access denial clearly.

Status: Complete locally and on staging.

Evidence:
- Added dedicated browser boundary suite: `tenant-admin-boundary-certification.spec.ts`.
- Verified every tenant-admin page redirects unauthenticated sessions to login without workspace failure noise.
- Verified employee, manager, platform admin, and support-agent sessions cannot open Tenant Admin as a privileged workspace unless the session explicitly has `tenant_admin` access.
- Verified blocked roles cannot use Tenant Admin API proxies for Security Readiness, Trust Audit, audit download, membership create/update, change-request create/update, or support-access create/update.
- Verified denied API responses fail closed and do not leak passwords, secrets, salary snapshots, bank debit account refs, or live provider refs.
- Verified a real Tenant Admin session can access all focused Tenant Admin pages and that security, trust-audit, and audit-download payloads are scoped to the active tenant code.
- Local backend check passed: `./.venv/bin/python manage.py check`.
- Local production web build passed: `pnpm --dir web build`.
- Local focused TA-6 Playwright against staging API passed: `tenant-admin-boundary-certification.spec.ts` = 3/3.
- Local full Tenant Admin Playwright against staging API passed with TA-6 included: `tenant-admin-boundary-certification.spec.ts tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` = 19/19.
- Staging deployment completed on commit `8a4dd9e`.
- Staging post-deploy smoke passed: API health 200, root/login 200, backend/web active, disk 68%.
- Staging focused TA-6 Playwright passed: `tenant-admin-boundary-certification.spec.ts` = 3/3.
- Staging full Tenant Admin Playwright passed with TA-6 included: `tenant-admin-boundary-certification.spec.ts tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts` = 19/19.

Observed product posture:
- Blocked signed-in users currently land on the public home page with workspace shortcuts, not a separate workspace chooser. The important security behavior is correct: the Tenant shortcut remains non-navigable and the Tenant Admin heading/data is not exposed.
- Cross-tenant proof is tenant-code based in this phase because we do not yet have a second independent tenant-admin credential in the automated matrix.

### Phase TA-7: Launch Certification Run

Goal: final signoff for Tenant Admin.

Testing targets:
- Full local Playwright run.
- Full staging Playwright run.
- Screenshots/videos/traces for each page and critical mutation.
- Documentation updated with pass/fail, defects, confidence.

Exit criteria:
- Zero critical/high issues.
- No unclear validation messages.
- No UI misalignment on desktop/mobile.
- All pages have single responsibility.
- Confidence at least 90% for Tenant Admin pilot launch.

Status: Complete locally and on staging.

Evidence:
- Final staging certification run completed against `https://hrms.accerio.in` on deployed commit `8a4dd9e`.
- Command: `tenant-admin-boundary-certification.spec.ts tenant-admin-console-flows.spec.ts tenant-security-readiness-flows.spec.ts tenant-trust-audit-flows.spec.ts --project=chromium --workers=1 --trace on`.
- Result: 19/19 passed in 5.0 minutes.
- Trace evidence generated for all 19 tests under `web/test-results/**/trace.zip`.
- Critical-flow screenshots remain attached by the Tenant Admin console spec for membership lifecycle, duplicate validation, and membership audit evidence.
- Covered pages: Dashboard, User Management, Plans And Subscription, Setup Guide, Support Access, Audit Logs, Settings, Security.
- Covered operations: user invite, duplicate-user validation, activate, suspend, reactivate, revoke, audit evidence lookup, plan change submit/approve/apply, support access request/approve/start/end/revoke, trust-audit filter/pagination/download, empty state, unauthenticated redirects, wrong-role API denial, and tenant-code scoped read surfaces.

Final launch confidence:
- Tenant Admin pilot launch confidence: 92%.
- Confidence basis: page split is complete, major flows are browser-certified locally and on staging, role/API boundaries are verified, and no critical/high defects remain in the certified Tenant Admin scope.
- Residual risk: cross-tenant automation currently proves active tenant-code scoping with one tenant-admin persona; a second independent tenant-admin credential would raise confidence further for multi-tenant isolation.

### Phase TA-8: Roles And Permissions Self-Service

Goal: allow Tenant Admin to create and maintain custom tenant roles from the browser instead of requiring backend/admin setup.

Status: Complete locally; staging deployment and live browser certification pending.

Related RBAC plan: `docs/qa/full-rbac-rollout-plan-2026-09-17.md`.

Implemented:
- Added `/tenant-admin/roles` as a single-responsibility Roles & Permissions workspace.
- Added sidebar navigation entry `Roles`.
- Added Tenant Admin role APIs:
  - `POST /api/v1/tenant-admin/roles/`
  - `PATCH /api/v1/tenant-admin/roles/<role_id>/`
- Added Next.js proxy routes:
  - `/api/tenant-admin/roles`
  - `/api/tenant-admin/roles/[roleId]`
- Added role management payload to Tenant Admin console data.
- Added custom role create, edit, activate, and deactivate support.
- Protected system roles from tenant-admin deactivation.
- Blocked deactivation of assigned custom roles until the role is removed from active/invited members.
- Added role permission-key documentation so custom roles can carry permission intent now, with room for granular enforcement later.
- Added clear inline validation and disabled-action explanations.
- Added popup/modal forms for create/update.
- Added search and empty state for long role lists.
- Added demo-data support for the new role-management shape.

Local evidence:
- Django system check: `.venv/bin/python backend/manage.py check` -> passed.
- Backend focused smoke: `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tenant_admin_role_crud or tenant_admin_can_create_update_and_deactivate_custom_roles or tenant_admin_console_returns_commercial"` -> `3 passed`.
- Frontend lint for touched files -> passed.
- TypeScript: `npm --prefix web run typecheck` -> passed.

Certification assets added:
- Backend tests for custom role create/update/deactivate, duplicate role code denial, system role deactivation denial, and assigned-role deactivation denial.
- Browser spec: `tenant-admin-roles-certification.spec.ts` for role page validation, create, edit, protected system-role messaging, search, and no-overflow.

Confidence after TA-8 local:

| Area | Previous | Current | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 92% | 93-94% | Tenant Admin can now self-serve custom roles instead of depending on backend role setup. |
| Tenant Admin QA/browser coverage | 92% | 93% local | Backend and TypeScript are green; staging browser proof is still pending. |
| Tenant Admin user-friendliness | 90-92% | 92-93% | Roles are now a focused page, with protected system-role guidance and clear deactivation blockers. |
| Tenant Admin public launch readiness | 92% | 93% local | Needs deployment and live Playwright run before raising launch confidence further. |

Next required staging evidence:
- Deploy this check-in.
- Run post-deploy smoke.
- Run live Playwright:

```bash
HRMS_BASE_URL=https://hrms.accerio.in PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test web/tests/e2e/tenant-admin-roles-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000
```

## Current Known Gaps

| Gap | Impact | Target Phase |
| --- | --- | --- |
| Cross-tenant proof uses one active tenant-admin persona | True two-tenant tenant-admin isolation needs a second independent tenant-admin credential in the automation matrix | Future multi-tenant hardening |
| TA-8 staging browser proof pending | Custom role self-service is locally verified but not yet certified on deployed staging | Immediate post-deploy certification |
| RBAC enforcement is only partially wired | Tenant Admin role/user mutation APIs are protected, but read routes, support access, settings, trust-audit download, and downstream HR/payroll APIs still need permission enforcement | RBAC rollout |

### Phase TA-9: Tenant Admin RBAC Enforcement Foundation

Goal: make Tenant Admin roles operational, not just descriptive, by enforcing the first high-risk permissions on backend APIs.

Status: Complete locally for role and user mutation APIs; wider Tenant Admin permission enforcement remains in the RBAC rollout plan.

Implemented:
- Added reusable backend permission resolution through `apps.iam.permission_checks`.
- Preserved existing system-role behavior through catalog default grants when a role has no explicit permission rows.
- Made explicit saved `RolePermission` rows override default grants, so custom/limited roles can be genuinely restricted.
- Enforced `tenant.roles.manage` on Tenant Admin role create/update/status APIs.
- Enforced `tenant.users.manage` on Tenant Admin membership invite/update/status APIs.
- Kept the existing Tenant Admin/HR Admin workspace role check as an outer gate.
- Added default Tenant Admin user/role management grants to `hr-admin` because current certified customer-owner operations use the HR Admin tenant operator in demo/staging data.

Local evidence:
- Django system check: `.venv/bin/python backend/manage.py check` -> passed.
- Focused backend smoke: `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tenant_admin_role_crud or tenant_admin_membership_invite_requires_manage_permission"` -> `5 passed`.

Certification added:
- A view-only role permission set cannot create roles.
- A view-only user permission set cannot invite tenant members.
- Denials return `403` and include the missing permission key.

Confidence impact:

| Area | Before TA-9 | After TA-9 Local | Notes |
| --- | ---: | ---: | --- |
| Tenant Admin functionality readiness | 93-94% | 94% local | Role/user management now has real backend permission enforcement. |
| Tenant Admin QA/browser coverage | 93% local | 93-94% local | Backend negative permission coverage added; live browser proof still required after deployment. |
| Tenant Admin user-friendliness | 92-93% | 92-93% | No UI change in TA-9; user-facing permission messages are backend-ready. |
| Tenant Admin public launch readiness | 93% local | 94% local | Needs staging deploy/rerun and remaining Tenant Admin permission gates for 95%. |

### Phase TA-10: Permission-Aware Tenant Admin UI

Goal: make Tenant Admin menus and high-risk controls respond to the effective permissions attached to the logged-in user's roles.

Status: Complete locally for Tenant Admin navigation, quick links, user mutations, and role mutations.

Implemented:
- Added `effective_permissions` to the auth session/login payload.
- Added frontend permission helpers in `workspace-access.ts`.
- Tenant Admin sidebar and quick links now hide entries when the user lacks the relevant view/manage permission.
- Users page disables invite, role update, activate, suspend, and revoke controls without `tenant.users.manage`.
- Roles page disables add, edit, activate, and deactivate controls without `tenant.roles.manage`.
- Added light inline notices for view-only users so disabled actions are understandable without changing the page layout.
- Extended Tenant Admin role browser certification to create a limited view-only tenant role, log in as that user, verify permission-filtered menus, disabled mutation actions, and backend `403` denials.

Local evidence:
- Django system check: `.venv/bin/python backend/manage.py check` -> passed.
- Focused backend smoke: `.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tenant_admin_role_crud or tenant_admin_membership_invite_requires_manage_permission or tenant_admin_console_returns_commercial"` -> `6 passed`.
- TypeScript: `npm --prefix web run typecheck` -> passed.
- Browser spec command without live API env: `pnpm --dir web exec playwright test web/tests/e2e/tenant-admin-roles-certification.spec.ts --project=chromium --workers=1 --reporter=line --timeout=720000` -> `3 skipped` by the live-API guard.

Next certification target:
- Run the extended Tenant Admin roles browser spec against staging with `HRMS_API_BASE_URL` configured after deployment.

## Working Definition Of Done

A Tenant Admin page is launch ready only when:

- The page has one clear job.
- Every field, button, dropdown, checkbox, link, badge, empty state, and validation message is tested.
- Positive and negative paths are browser-tested with Playwright.
- Lists have search/filter/pagination where data can grow.
- Validation messages appear inline near the relevant action.
- Disabled actions explain what is missing.
- The page works on desktop and mobile without horizontal overflow.
- Role and tenant isolation are tested through browser/API boundaries.
- Audit evidence exists for business-critical mutations.
