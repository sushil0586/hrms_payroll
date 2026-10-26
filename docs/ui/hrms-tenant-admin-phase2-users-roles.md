# Tenant Admin Phase 2: users and roles

Accepted: 26 October 2026. Scope: `/tenant-admin/users`, `/tenant-admin/roles`, their mutation proxies and existing Tenant Admin membership/role APIs. Evidence: [`tenant-admin-makeover-phase2-2026-10-26`](../qa/evidence/tenant-admin-makeover-phase2-2026-10-26/).

## Outcome

Phase 2 brings membership and role administration under the same compact Accerio task hierarchy used by the completed HRMS families. Both pages now lead with a four-cell access summary, then put the primary task, safeguards, search and operational rows in a predictable order. The role layout stacks into a readable single column on narrow screens, and status and permission-risk badges retain their semantic color and contrast inside denser cards.

The implementation preserves the existing permission catalog, plan availability, system-role protection, seat rules and last-active-admin safeguards. It does not change permission meaning or grant authority from the client.

## Users workspace

- The summary strip reports active members, seat usage, total members and available roles without oversized dashboard tiles.
- The focused member-access panel explains the three-step task before the directory and keeps Invite member as the primary action.
- Search, paging, empty/no-match behavior and member actions remain local to the populated directory contract.
- Invite and access-change dialogs validate before submission, block duplicate submission, preserve input after uncertain transport outcomes and claim success only after a confirmed response.
- Confirmed membership responses update the visible directory immediately, then reconcile against an authoritative server refresh.
- Active, invited, suspended and revoked states use the existing backend state and stronger scoped badge styling.

## Roles workspace

- The summary strip reports total, custom, assigned and inactive roles.
- The Access model panel explains role definition, minimum permission selection and user assignment before the role catalog.
- Custom-role responses now update the local role list immediately before authoritative refresh, so a successful creation is visible even when refresh is still resolving.
- The permission overview is a named keyboard-focusable scroll region. Risk badges retain distinct low, medium, high and critical semantics.
- At 1180px and below, the role catalog and permission overview stack at usable widths; mobile headers and actions no longer compress the catalog into a narrow column.
- System-role editing, unavailable permissions, assigned-role deactivation and critical-permission removal continue to rely on backend enforcement.

## Mutation response and recovery contract

The Next.js membership and role mutation proxies request `?compact=1`. The compact response contains the changed membership or role and any generated-password receipt, while omitting the full Tenant Admin console snapshot. Existing direct API clients keep the original full response unless they opt into compact mode.

This reduced successful role responses from roughly 64–92 KB to about 315–346 bytes and membership responses from roughly 83–103 KB to about 737–813 bytes in the disposable run. The page applies the returned record locally and still calls `router.refresh()` for server reconciliation. Failed or disconnected writes keep the dialog values and describe the outcome as unconfirmed rather than inviting an automatic replay.

## Acceptance evidence

The final Playwright suite ran with retries disabled against one production web build and a disposable PostgreSQL workspace:

| Gate | Result |
| --- | --- |
| Chromium | 4/4 passed |
| Firefox | 4/4 passed |
| WebKit | 4/4 passed |
| Responsive captures | 12: Users and Roles at 1440px and 390px in all three engines |
| Selected axe scans | 6/6 reports with zero WCAG 2 A/AA and 2.1 AA violations |
| Focused backend regressions | 10/10 passed across compact responses, invite/member lifecycle, role lifecycle, permission denial, critical-permission protection, assigned/system-role protection and last-admin lockout |
| Engineering gates | TypeScript, focused ESLint, production build, Django check, migration drift check and diff check passed |

The browser scenarios cover compact desktop/mobile hierarchy, no page overflow, role stacking, persisted custom-role creation/deactivation, persisted member invitation, authoritative reload, uncertain role/invite writes, input preservation, role-limited navigation, disabled UI mutations, denied APIs and explicit compact-response assertions.

## Evidence interpretation

The evidence directory keeps failed preflights separately from the accepted root result. Those preflights record the corrected mobile width threshold, role stacking source order, badge contrast, focusable permission scrolling, delayed full-console mutation response, local secure-cookie setup and disposable-database binding. They are diagnostic history and are excluded from the 12/12 acceptance count.

The selected axe scans and automated keyboard semantics do not establish full WCAG conformance, screen-reader usability, native zoom or physical-device behavior. Production deployment and live customer data were outside this phase.

## Phase 3 handoff

Phase 3 covers Setup, Settings and Plan. Reuse the compact summary strip only for decision signals, keep one clear next action, distinguish configured/current/published state, preserve governed change-request rules, and apply the same confirmed-versus-unconfirmed mutation contract.
