# Tenant Admin Single-Responsibility Redesign

Last updated: 2026-10-03
Owner: HRMS product/UX redesign track
Workspace: `/tenant-admin`
Status: Phase 7 support/audit implementation complete

## Goal

Make Tenant Admin easy enough for a customer account owner to operate without remembering where every setup, billing, security, role, support, and audit action lives.

Tenant Admin should answer five questions quickly:

1. Is my account healthy?
2. Who has access?
3. What can each role do?
4. What setup, security, support, or plan action needs my attention?
5. Where is the evidence when I need to prove what changed?

## Design Principle

Every Tenant Admin page should have one primary responsibility.

Use the dashboard only as a route-and-priority surface. Use focused pages for real work. Use modal dialogs for short create, edit, confirm, and decision tasks. Use read-only evidence pages for audit and governance.

## Phase 1 Inventory Result

Tenant Admin already has a stronger visual baseline than the earlier HR Admin screens: shared typography, right-aligned actions, responsive rows, modal dialogs, and Playwright coverage exist. The new issue is not basic styling. The issue is responsibility density.

Current pages are usable, but some pages still mix:

- status summary
- operational queue
- setup guidance
- mutation form
- evidence ledger
- adjacent module previews

That makes the product feel heavier than it needs to be for tenant owners.

## Current Route Inventory

| Route | Current responsibility | Main overload risk | Target responsibility |
| --- | --- | --- | --- |
| `/tenant-admin` | Account posture, action queue, launch checklist, user preview, access design preview | Dashboard includes previews of user and role work that belong on dedicated pages | Account control center only: posture, next actions, and links |
| `/tenant-admin/users` | Invite users, search users, update roles, activate, suspend, revoke, review seat ownership | Mostly correct, but seat ownership and access actions compete with the directory | User access management only |
| `/tenant-admin/roles` | Role catalog, create/edit roles, permission catalog, permission risk overview | Permission catalog can become too dense beside the role list | Role design only; detailed permission browsing inside modal/drawer |
| `/tenant-admin/plan` | Plan summary, subscription, limits, change requests, commercial evidence | Plan review and change-request operations share the same screen | Subscription and commercial requests only |
| `/tenant-admin/setup` | Setup path, dependency guidance, handoff links to HR Admin setup | Correct purpose, but must stay as a guide and not become setup editing | Launch setup guide only |
| `/tenant-admin/settings` | Tenant identity, platform identifiers, readiness checks, published setup, account change link | Settings mixes identity, governance, and setup evidence | Tenant profile and account settings only |
| `/tenant-admin/security-readiness` | Security posture, MFA/SSO, SCIM/session, audit/data protection, blockers | Good grouping, but can read like a checklist report instead of action router | Security readiness only |
| `/tenant-admin/support-access` | Request grant, approve/reject/start/end/revoke grants, review scopes, support access ledger | Request form and grant decision ledger compete on one page | Support access lifecycle only, with modal decision flow |
| `/tenant-admin/trust-audit` | Filter audit events, review taxonomy, session evidence, evidence ledger, export | Correct read-only evidence surface, but navigation must be simple | Audit search, review, and export only |

## Target Information Architecture

Keep the same top-level routes for now. Avoid exploding the sidebar too early. Inside each page, separate work using one of three patterns:

- `Summary + primary list`: for Dashboard, Users, Roles, Security, Audit.
- `Guide + action links`: for Setup Guide and Settings.
- `Focused flow + modal`: for Users, Roles, Plan change requests, Support Access.

Future aliases can be added only when browser testing proves a page still feels heavy.

```text
Tenant Admin

Overview
  Dashboard

Access
  Users
  Roles

Account
  Plan
  Settings
  Setup Guide

Governance
  Security
  Support Access
  Audit Trail
```

## Target Page Contracts

### 1. Dashboard

Purpose:

- Show account health and the highest priority next actions.
- Route to the correct page.

Keep:

- Tenant status.
- Setup completion.
- Active user count.
- Action queue.
- Launch checklist.
- Short links to Users, Roles, Security, Setup, Support Access, Plan, Audit.

Remove or reduce:

- Detailed user preview.
- Detailed role matrix preview.
- Any editable account action.

Primary actions:

- Invite user routes to Users.
- Request account change routes to Plan change request flow.
- Download audit routes to Audit/export.
- Open security routes to Security.

Quality bar:

- User should understand account status in 10 seconds.
- No table should dominate the first viewport.
- Every row action should route to one focused page.

### 2. Users

Purpose:

- Manage tenant users and workspace access.

Keep:

- Search members.
- Pagination.
- Seat usage.
- Invite member modal.
- Update roles modal.
- Activate, suspend, revoke confirmation modals.
- Seat ownership summary.

Move or reduce:

- Keep role design out of Users, except role labels and assignment modal.
- Keep plan limit detail out of Users, except a seat usage chip.

Primary actions:

- Invite member.
- Update roles.
- Activate member.
- Suspend member.
- Revoke member.

Quality bar:

- Directory rows must never clip action buttons.
- Invite and update role modals must explain validation clearly.
- Revocation and suspension must ask for confirmation and leave audit history.

### 3. Roles

Purpose:

- Design and maintain tenant roles.

Keep:

- Role search.
- Role list.
- Add role modal.
- Edit role modal.
- Activate/deactivate status action.
- Permission risk labels.

Move or reduce:

- Permission matrix should stay as a supporting panel, not the main page.
- Long permission browsing should happen inside the role modal or a focused drawer.
- User assignment belongs on Users.

Primary actions:

- Add role.
- Edit role.
- Activate role.
- Deactivate role.

Quality bar:

- System roles must look protected.
- Custom roles must show assignment count before deactivation.
- High-risk permissions must remain visibly labelled.

### 4. Plan

Purpose:

- Review subscription status and governed commercial/configuration change requests.

Keep:

- Plan summary.
- Seat and entitlement usage.
- Meter snapshots.
- Change request form.
- Recent request list.
- Approve, reject, apply, cancel actions.

Move or reduce:

- Account identity changes should start from Settings but land in this governed request flow.
- Avoid showing unrelated setup and security checks on Plan.

Primary actions:

- Submit request.
- Approve request.
- Reject request.
- Mark applied.
- Cancel request.
- Download commercial support audit.

Quality bar:

- Change request payload must not scare non-technical admins.
- JSON/payload editing should either be guided or hidden behind advanced mode in a later phase.
- Request rows must be paginated and readable.

### 5. Setup Guide

Purpose:

- Show launch setup order and route users to the right owner page.

Keep:

- Setup areas.
- Status by area.
- Dependency guidance.
- Handoff links to HR Admin setup pages.

Move or reduce:

- Do not edit org masters, payroll masters, users, or security here.
- Do not duplicate forms from HR Admin or Tenant Admin child pages.

Primary actions:

- Open organization masters.
- Open users.
- Open payroll setup.
- Open security.
- Open readiness gates.

Quality bar:

- Page should feel like a launch map, not an admin workbench.
- Each setup row needs one clear action.

### 6. Settings

Purpose:

- Review tenant profile, platform identifiers, configuration health, and governed account changes.

Keep:

- Tenant name/status/plan.
- Code, primary domain, timezone, region.
- Published setup summary.
- Request account change link.

Move or reduce:

- Security readiness belongs on Security.
- Commercial approval belongs on Plan.
- Setup editing belongs on Setup/HR Admin routes.

Primary actions:

- Request account change.
- Open Setup Guide.
- Return to dashboard.

Quality bar:

- Platform-governed fields must not look directly editable if they require approval.
- Request account change should prefill the Plan change-request flow.

### 7. Security

Purpose:

- Review tenant security posture and security launch blockers.

Keep:

- Overall readiness.
- MFA/SSO.
- SCIM/session.
- Audit/data protection.
- Security blocker list.
- Evidence links to Trust Audit.

Move or reduce:

- Role editing stays on Roles.
- User activation stays on Users.
- Support grant lifecycle stays on Support Access.

Primary actions:

- Open audit.
- Return to dashboard.
- Route to the source page for a blocker.

Quality bar:

- Security page should read like posture and controls, not a raw checklist.
- Every blocker should explain owner, impact, and where to fix.

### 8. Support Access

Purpose:

- Manage temporary support access grants.

Keep:

- Request access form.
- Scope picker.
- Grant ledger.
- Approve, reject, start, end, revoke actions.
- Search grants.
- Pagination.

Move or reduce:

- Detailed support evidence should link to Trust Audit.
- Grant row decision actions should move into a modal if rows become too dense.

Primary actions:

- Request access.
- Approve grant.
- Reject grant.
- Start session.
- End session.
- Revoke grant.

Quality bar:

- Support access must feel controlled and auditable.
- Decision note requirements must be obvious before the user clicks.
- Scope labels must explain what support can access.

### 9. Trust Audit

Purpose:

- Search, filter, review, and export tenant evidence.

Keep:

- Event group filters.
- Event type filters.
- Support session filters.
- Active filters summary.
- Evidence ledger.
- Pagination.
- Download audit.

Move or reduce:

- No mutation actions on this page.
- No support grant action controls here.
- No user or role editing here.

Primary actions:

- Filter by group/type/session.
- Clear filters.
- Download audit.
- Page through evidence.

Quality bar:

- It should be obviously read-only.
- Long IDs and payloads must wrap and never create horizontal scroll.

## Modal And Drilldown Rules

Use modal dialogs for:

- Invite user.
- Update roles for one user.
- Suspend, activate, revoke confirmation.
- Create/edit role.
- Approve/reject/apply/cancel change request if row actions become crowded.
- Approve/reject/start/end/revoke support access if row actions become crowded.

Use page navigation for:

- Moving between dashboard and focused modules.
- Opening audit filters.
- Handing off to HR Admin setup pages.

Use expandable rows or side drawers only for:

- Viewing read-only details.
- Seeing permission descriptions.
- Reviewing audit payload summaries.

## Launch-Grade QA Plan

Each phase must include browser-based checks from a tenant owner point of view:

- Page loads with correct H1 and active side menu.
- Search/filter inputs work and reset page index.
- Primary action opens the correct modal or route.
- Modal closes with Escape and Close/Cancel.
- Disabled actions explain missing permission or missing data.
- Mutating actions show validation before submit.
- Pagination controls are visible and disabled correctly.
- Internal links do not 404 and do not expose dynamic placeholder segments.
- No horizontal overflow at desktop, tablet, and mobile widths.
- Row actions remain right-aligned on desktop and stack cleanly on mobile.
- Empty states explain what to do next.
- Audit/download links are available only where intended.

## Phase Plan

| Phase | Scope | Outcome | Status |
| --- | --- | --- | --- |
| Phase 1 | Inventory and responsibility map | Route-by-route target ownership and QA contract | Completed |
| Phase 2 | Dashboard | Convert dashboard into pure posture plus next-action router | Completed |
| Phase 3 | Users | Tighten user access workbench, modal validation, seat ownership, and role assignment flow | Completed |
| Phase 4 | Roles | Reduce permission matrix crowding and make role design a focused workflow | Completed |
| Phase 5 | Plan and Settings | Separate commercial request flow from tenant profile review | Completed |
| Phase 6 | Setup Guide and Security | Keep setup/security as action routers with clear owner, impact, and fix paths | Completed |
| Phase 7 | Support Access and Trust Audit | Make grant decisions and audit evidence calm, traceable, and non-overloaded | Completed |
| Phase 8 | Documentation | Update tenant-admin docs with examples, positive/negative cases, and navigation | Pending |
| Phase 9 | Browser Certification | Full Playwright route, link, modal, responsive, and permission-boundary gate | Pending |

## Phase 1 Completion Notes

Phase 1 is complete because the current Tenant Admin routes, action components, mutation APIs, modals, and evidence routes have been mapped into single-responsibility targets.

The next implementation phase should start with Dashboard because it is the first screen and currently repeats previews from Users and Roles. Once Dashboard is simplified, Users and Roles can be tightened without changing the overall navigation model.

## Phase 2 Completion Notes

Phase 2 is complete.

Dashboard changes made:

- Removed the embedded user-management preview table from `/tenant-admin`.
- Removed the embedded role/permission preview matrix from `/tenant-admin`.
- Added a focused workspace router with cards for Users, Roles, Plan, Setup Guide, Security, Support Access, and Trust Audit, shown only when the signed-in tenant admin has the matching permission.
- Kept Dashboard responsible for account posture, action queue, launch checklist, and routing only.
- Updated dashboard and final release-gate Playwright checks so they enforce the single-responsibility contract.

Validation evidence:

- `pnpm --dir web exec tsc --noEmit` passed.
- `pnpm --dir web lint` passed.
- `tenant-admin-dashboard-phase2-polish.spec.ts` passed on desktop and mobile against a bootstrapped local backend.
- `tenant-admin-final-release-gate.spec.ts` passed across all Tenant Admin routes on desktop and mobile, plus safe dialog/filter checks.

Testing note:

- Tenant Admin Playwright gates now run serially where they share the same seeded login. Parallel route sweeps can invalidate the same account token through the helper logout flow and produce false login redirects.
- The final release-gate link resolver ignores `/api/` download endpoints because those are authenticated file downloads, not user-facing navigation pages. Download behavior should stay covered by dedicated export/download tests.

## Phase 3 Completion Notes

Phase 3 is complete.

Users page changes made:

- Clarified `/tenant-admin/users` as a member access workspace: invite, assign roles, activate, suspend, revoke, and audit.
- Added an access workflow guide above the directory so tenant admins know the intended sequence without reading a manual.
- Kept all user mutations inside focused modal dialogs: invite member, update roles, and access-change confirmation.
- Reduced seat ownership into a compact role coverage summary with a direct link to Roles for permission design.
- Tightened member row actions and role text so the directory remains readable on desktop and stacks cleanly on mobile.

Validation evidence:

- `pnpm --dir web exec tsc --noEmit` passed.
- `pnpm --dir web lint` passed.
- `tenant-admin-users-dialog-certification.spec.ts` passed.
- `tenant-admin-users-roles-phase1-polish.spec.ts` passed.
- `tenant-admin-console-flows.spec.ts` passed.
- `tenant-admin-final-release-gate.spec.ts` passed on desktop and mobile during the Phase 3 route sweep.

## Phase 4 Completion Notes

Phase 4 is complete.

Roles page changes made:

- Clarified `/tenant-admin/roles` as a role design workspace, not a user assignment page.
- Added a three-step role design guide: define the job, select minimum access, then assign from Users.
- Kept role search, role cards, Add role, Edit role, activate, and deactivate as the primary workflow.
- Reduced long permission labels in the role catalog so role cards remain readable.
- Converted the permission matrix into a compact reference panel with module, critical-permission, and plan-locked counts.
- Kept detailed permission browsing and risk labels inside the Add/Edit role modal, where role design decisions happen.

Validation evidence:

- `pnpm --dir web exec tsc --noEmit` passed.
- `pnpm --dir web lint` passed.
- `tenant-admin-users-roles-phase1-polish.spec.ts` passed.
- `tenant-admin-roles-certification.spec.ts` passed with the existing guarded last-admin lockout scenario skipped.
- `tenant-admin-final-release-gate.spec.ts` passed on desktop, mobile, and safe dialog/filter checks.

## Phase 5 Completion Notes

Phase 5 is complete.

Plan page changes made:

- Clarified `/tenant-admin/plan` as a commercial control page for subscription review, usage evidence, and governed change requests.
- Added a three-step commercial workflow band: check subscription, review usage evidence, then submit a governed request.
- Kept current subscription and meter snapshots as read-only source-of-truth panels.
- Split change requests into two calm areas: Create request and Request queue.
- Kept request pagination, approval, reject, apply, cancel, and validation behavior intact.

Settings page changes made:

- Clarified `/tenant-admin/settings` as tenant identity, platform identifiers, readiness posture, and published setup review.
- Added a settings workflow band: confirm identity, check account posture, then request governed changes.
- Moved the account-change call to the Tenant account panel so the action is contextual and not duplicated.
- Kept account changes routed into the Plan change-request flow with configuration-change prefill.
- Kept readiness checks and published setup as supporting read-only evidence, not editable operational work.

Validation expectation:

- `pnpm --dir web exec tsc --noEmit`
- `pnpm --dir web lint`
- `tenant-admin-plan-setup-settings-phase3-polish.spec.ts`
- `tenant-admin-plan-settings-certification.spec.ts`
- `tenant-admin-final-release-gate.spec.ts`

## Phase 6 Completion Notes

Phase 6 is complete.

Setup Guide changes made:

- Clarified `/tenant-admin/setup` as a launch map and owner router, not a setup editing page.
- Added a three-step setup workflow band: confirm account baseline, complete HR/payroll foundations, then clear security and launch gates.
- Added dependency and outcome metadata to each setup area so tenant admins know why the handoff exists before opening the owner page.
- Kept the five launch areas focused: company profile, organization masters, users/access, payroll foundation, and security/audit.
- Kept setup editing on focused HR Admin or Tenant Admin owner pages through explicit row actions.

Security Readiness changes made:

- Clarified `/tenant-admin/security-readiness` as a posture, evidence, and blocker-resolution page.
- Added a three-step security workflow band: review posture, inspect evidence and owner, then fix blockers from the source page.
- Added compact domain summaries for MFA/SSO, SCIM/session, and audit/data protection so each security section is scannable before reading row details.
- Expanded launch blocker rows with impact and fix-path guidance while preserving the existing trust-audit and console routing.
- Kept security mutation work out of this page; it remains a launch-readiness router and evidence review surface.

Validation expectation:

- `pnpm --dir web exec tsc --noEmit`
- `pnpm --dir web lint`
- `tenant-admin-plan-setup-settings-phase3-polish.spec.ts`
- `tenant-admin-governance-phase4-polish.spec.ts`
- `tenant-admin-security-trust-final-certification.spec.ts`
- `tenant-admin-final-release-gate.spec.ts`

## Phase 7 Completion Notes

Phase 7 is complete.

Support Access changes made:

- Clarified `/tenant-admin/support-access` as the support access lifecycle page: request, approve, start, end, reject, revoke, and audit.
- Added a three-step support workflow band: request scoped support, approve/start/reject, then end/revoke/audit.
- Added compact guardrails for time-bound, scope-bound, and audit-bound access so tenant admins understand the safety model before acting.
- Kept the request form, scope picker, grant search, pagination, and grant actions in the existing focused action component.
- Kept detailed support evidence routed to Trust Audit instead of overloading the grant page.

Trust Audit changes made:

- Clarified `/tenant-admin/trust-audit` as a read-only evidence search and export page.
- Added a three-step audit workflow band: choose evidence scope, filter to the exact event, then review or export proof.
- Added an active evidence summary beside the current filters so users understand the result set before scanning the ledger.
- Kept event group, event type, support session filters, pagination, and export behavior intact.
- Kept all mutation actions out of Trust Audit.

Validation expectation:

- `pnpm --dir web exec tsc --noEmit`
- `pnpm --dir web lint`
- `tenant-admin-governance-phase4-polish.spec.ts`
- `tenant-admin-support-access-certification.spec.ts`
- `tenant-admin-security-trust-final-certification.spec.ts`
- `tenant-admin-final-release-gate.spec.ts`
