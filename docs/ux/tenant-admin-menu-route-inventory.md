# Tenant Admin Menu Route Inventory

This document tracks Tenant Admin typography and usability rollout. It mirrors the HR Admin inventory pattern so every menu, child route, link, button, dialog, and responsive state can be reviewed without rediscovering the workspace.

References:

- `docs/ux/typography-system.md`
- `web/tests/e2e/tenant-admin-dashboard-phase2-polish.spec.ts`
- `web/tests/e2e/tenant-admin-final-release-gate.spec.ts`
- `web/tests/e2e/tenant-admin-governance-phase4-polish.spec.ts`
- `web/tests/e2e/tenant-admin-plan-setup-settings-phase3-polish.spec.ts`
- `web/tests/e2e/tenant-admin-users-roles-phase1-polish.spec.ts`
- `web/tests/e2e/tenant-admin-usability-audit.spec.ts`

## Status Legend

- `Pending`: route is inventoried but not yet reviewed in this rollout.
- `In Progress`: route is actively being polished or certified.
- `Passed`: route has passed focused browser, typography, link, and responsive checks.

## Main Menu

| Group | Menu | Route | Intended Purpose | Rollout Phase | QA Status |
| --- | --- | --- | --- | --- | --- |
| Overview | Dashboard | `/tenant-admin` | Account posture, setup progress, next actions, user/access/security shortcuts | Phase 2 | Passed |
| Overview | Users | `/tenant-admin/users` | Invite users, update roles, activate/suspend/revoke access, review seat ownership | Phase 1 | Passed |
| Overview | Roles & Permissions | `/tenant-admin/roles` | Create/edit custom roles, inspect assignable permissions, protect system roles | Phase 1 | Passed |
| Subscription | Plan & Billing | `/tenant-admin/plan` | Review subscription, limits, commercial requests, and plan evidence | Phase 3 | Passed |
| Tenant Setup | Setup Guide | `/tenant-admin/setup` | Complete tenant launch steps and dependency guardrails | Phase 3 | Passed |
| Tenant Setup | Settings | `/tenant-admin/settings` | Tenant account details, configuration health, and governance checks | Phase 3 | Passed |
| Security & Governance | Security | `/tenant-admin/security-readiness` | Security posture, access policy checks, launch blockers | Phase 4 | Passed |
| Security & Governance | Support Access | `/tenant-admin/support-access` | Request, approve, and audit scoped support access grants | Phase 4 | Passed |
| Security & Governance | Audit Trail | `/tenant-admin/trust-audit` | Search tenant audit events and export evidence | Phase 4 | Passed |

## Phase 1: Users And Roles

Decision:

- Users and Roles should behave like account-control workbenches, not dense admin tables.
- Users directory keeps a compact table rhythm on desktop but reserves a wide action column so `Update roles`, `Suspend/Activate`, and `Revoke` never clip.
- Users rows collapse into readable cards on mobile.
- Roles list remains primary; permission overview is a supporting side panel with internal scroll for long catalogs.
- Role create/edit uses a modal because permission selection is a focused task, not something that should crowd the default screen.

Quality checks:

- H1 and side-nav active state visible.
- Logout visible.
- Visible links are real and do not contain placeholder/dynamic route tokens.
- User row actions are reachable, right-aligned, and unclipped.
- Invite, update-role, and create-role dialogs open and keep all controls inside the viewport.
- Desktop and mobile screenshots captured.
- No horizontal overflow.

Validation:

- Spec: `web/tests/e2e/tenant-admin-users-roles-phase1-polish.spec.ts`
- Screenshot directory: `web/test-results/tenant-admin-users-roles-phase1/`
- Passed on 2026-09-28 with `3 passed`: Users directory, Roles workspace, desktop dialogs, and mobile views.
- Broader safety audit: `tenant-admin-usability-audit.spec.ts --grep "desktop"` passed after the shared CSS update; full audit mobile and dialog smoke also passed. One full-run desktop pass hit a transient `ECONNRESET` while requesting `/tenant-admin`, then passed on rerun.

## Phase 2: Dashboard And Navigation

Decision:

- Dashboard should read like a control center: one action queue, one launch checklist, and clear shortcuts to the account areas.
- Keep headings short. Use supporting copy for context instead of long section names.
- Action rows keep the operational title first, metadata secondary, and the link/button aligned to the right on desktop.
- Launch checklist rows use compact status, title, and count columns so they scan without becoming another full table.
- On mobile, dashboard rows collapse into card-style stacks with visible actions and no horizontal scrolling.

Quality checks:

- H1, logout, active Dashboard nav, control-center shell, action queue, and launch checklist visible.
- Visible tenant-admin links resolve with successful status.
- Safe controls are focusable and do not clip.
- Action queue has no horizontal scroll on desktop.
- Action rows and checklist rows remain readable on mobile.
- Desktop and mobile screenshots captured.
- No horizontal overflow.

Validation:

- Spec: `web/tests/e2e/tenant-admin-dashboard-phase2-polish.spec.ts`
- Screenshot directory: `web/test-results/tenant-admin-dashboard-phase2/`
- Passed on 2026-09-28 with `2 passed`: dashboard desktop and mobile.
- Broader tenant audit also passed on 2026-09-28 with `3 passed`: all tenant-admin pages at desktop, all tenant-admin pages at mobile, and safe dialog actions.

## Phase 3: Plan Setup And Settings

Decision:

- Setup Guide should behave like an ordered launch path, not a static checklist. Each setup area now has a visible step number, owner, status, evidence, and one clear action.
- Dependency guardrails belong in a sidecar so first-run admins can understand sequence without crowding the primary setup path.
- Plan keeps read-only commercial evidence separate from governed change-request work.
- Change requests use a compact form grid, clear payload helper text, paginated request rows, and right-aligned row actions on desktop.
- Settings separates account identity, readiness checks, and published setup records into calmer sections with short headings and supporting copy.

Quality checks:

- Setup, Plan, and Settings H1s visible with expected section headings.
- Visible internal links resolve across Tenant Admin and HR Admin handoff links.
- Change-request form fields, payload editor, pagination, empty state, and row actions are reachable.
- Setup area rows do not horizontally scroll on desktop and stack cleanly on mobile.
- Settings account-change link routes to the governed Plan change-request flow.
- Desktop and mobile screenshots captured.
- No horizontal overflow.

Validation:

- Spec: `web/tests/e2e/tenant-admin-plan-setup-settings-phase3-polish.spec.ts`
- Screenshot directory: `web/test-results/tenant-admin-plan-setup-settings-phase3/`
- Passed on 2026-09-28 with `3 passed`: Setup desktop, Plan/Settings desktop, and Setup/Plan/Settings mobile.
- Broader tenant audit also passed on 2026-09-28 with `3 passed`: all tenant-admin pages at desktop, all tenant-admin pages at mobile, and safe dialog actions.

## Phase 4: Security Governance

Decision:

- Security Readiness should read as security-domain evidence, not a dense checklist. Each check now separates summary, evidence, status, and owner.
- Support Access should keep the request form, scope picker, and grant ledger visually distinct so operators understand the approval lifecycle.
- Support grant actions remain right-aligned on desktop and full-width stacked on mobile.
- Trust Audit should lead with filters, then show a compact evidence ledger. Event group, event type, and support-session filters remain direct links.
- Long audit/source/hash values wrap inside the row instead of forcing horizontal scrolling.

Quality checks:

- Security, Support Access, and Trust Audit H1s visible with expected section headings.
- Visible internal links resolve across dashboard, audit, and filter links.
- Support request controls, grant ledger actions, audit pagination, and security rows are reachable.
- Governance rows do not horizontally scroll on desktop and collapse to one column below tablet width.
- Desktop and mobile screenshots captured.
- No horizontal overflow.

Validation:

- Spec: `web/tests/e2e/tenant-admin-governance-phase4-polish.spec.ts`
- Screenshot directory: `web/test-results/tenant-admin-governance-phase4/`
- Browser gate targets: Security desktop, Support Access desktop, Trust Audit desktop, and all three governance routes on mobile.

## Phase 5: Final Release Gate

Decision:

- Tenant Admin needs one full-workspace release gate after the focused phases so route-by-route fixes cannot drift apart.
- The final gate reviews every menu route at desktop and mobile sizes with screenshots, active navigation, logout visibility, required section text, visible links, visible controls, and no horizontal overflow.
- The final gate also smoke-tests safe account-control dialogs and non-mutating filters so common user actions are covered without altering production-like data.
- This phase does not introduce a new visual pattern. It enforces the typography and usability contract already established in Phases 1 through 4.

Quality checks:

- Dashboard, Users, Roles, Plan, Setup Guide, Settings, Security, Support Access, and Audit Trail all expose correct H1s and expected content.
- Desktop side navigation marks exactly one active route.
- Mobile routes render without horizontal overflow and keep controls reachable.
- Visible internal links resolve and do not expose placeholder route tokens.
- Invite, update-role, add-role, and edit-role dialogs open and close cleanly.
- User, role, support-grant, and audit-filter states remain readable.
- Desktop and mobile screenshots are captured for every route.

Validation:

- Spec: `web/tests/e2e/tenant-admin-final-release-gate.spec.ts`
- Screenshot directory: `web/test-results/tenant-admin-final-release-gate/`
- Browser gate targets: all Tenant Admin routes at desktop, all Tenant Admin routes at mobile, and safe dialogs/filters.

## Next Phases

Tenant Admin can now move to deployment verification or role-boundary regression. Future work should be feature-led, not typography-led, unless a new menu or child route is added.
