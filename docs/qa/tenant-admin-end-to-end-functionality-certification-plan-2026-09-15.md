# Tenant Admin End-To-End Functionality And Certification Plan

Date: 2026-09-15  
Environment target: local first, then staging at `https://hrms.accerio.in`  
Primary role: Tenant Admin  
Purpose: make Tenant Admin simple, single-responsibility, browser-certified, and launch ready.

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

Status: Complete locally, pending staging deployment/rerun.

Evidence:
- `pnpm --dir web build` passed on 2026-09-15 and generated routes for `/tenant-admin/users`, `/tenant-admin/plan`, `/tenant-admin/support-access`, and `/tenant-admin/settings`.
- Local browser command against `http://localhost:3211` with staging API: `tenant-admin-console-flows.spec.ts` -> `7 passed`.
- Local browser command against `http://localhost:3211` with staging API: `public-launch-role-menu-certification.spec.ts` -> `7 passed`.
- Interpretation: Tenant Admin is now split into focused pages and the sidebar route model works locally. Staging proof is required after check-in and deployment.

### Phase TA-2: User Management CRUD Certification

Goal: certify membership invite, role update, suspend/reactivate, validation, role boundary, audit evidence.

Testing targets:
- Positive invite/update/suspend flow.
- Negative validation flow.
- Seat limit guard.
- Unauthorized mutation denial.
- Pagination for long members.

Status: Not started.

### Phase TA-3: Plan And Change Request Certification

Goal: certify plan visibility and tenant-owned commercial change request lifecycle.

Testing targets:
- Submit change request.
- Approve/reject/cancel/apply rules.
- Invalid payload validation.
- Audit evidence.
- Pagination for long request list.

Status: Not started.

### Phase TA-4: Support Access Certification

Goal: certify scoped support grant lifecycle end to end.

Testing targets:
- Request, approve, start, end, revoke.
- Reject with required note.
- Scope enforcement.
- Support-agent allowed/denied domains.
- Trust audit evidence.
- Pagination for long grants.

Status: Not started.

### Phase TA-5: Security And Trust Audit Certification

Goal: certify security readiness and trust audit as customer-facing evidence pages.

Testing targets:
- Security domains and blockers.
- Missing evidence clarity.
- Trust filters, clear, empty states.
- Audit download integrity.
- Pagination for long audit lists.

Status: Not started.

### Phase TA-6: Cross-Role And Cross-Tenant Boundaries

Goal: prove Tenant Admin data and actions cannot leak across roles or tenants.

Testing targets:
- Employee, manager, support without grant, HR-only, and platform-only users are denied mutation paths.
- Tenant admin cannot access another tenant’s data.
- Direct API mutations fail closed.
- Browser routes redirect or show access denial clearly.

Status: Not started.

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

Status: Not started.

## Current Known Gaps

| Gap | Impact | Target Phase |
| --- | --- | --- |
| Dashboard contains account, users, changes, support, roles, configs, usage, and audit together | Tenant Admin feels complex and weak | TA-1 |
| User Management is embedded in dashboard | Hard to certify and operate | TA-1, TA-2 |
| Change requests are embedded in dashboard | Plan/commercial flow is not obvious | TA-1, TA-3 |
| Support access is embedded in dashboard | Critical support approval flow needs its own focused page | TA-1, TA-4 |
| Trust audit has filters but no strong pagination UX certification yet | Long audit history may become hard to use | TA-5 |
| Settings is an anchor, not a focused page | Tenant-owned vs platform-owned fields are unclear | TA-1 |
| Existing tests cover useful basics but not full page-by-page CRUD after split | Certification confidence is limited | TA-2 through TA-7 |

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
