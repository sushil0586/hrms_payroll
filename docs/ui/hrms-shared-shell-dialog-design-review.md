# Accerio shared shell and popup design review

Date: 2026-10-19. Status: **changes recommended; no implementation or deployment**. This review precedes the [HR Admin phased plan](hrms-hr-admin-phased-implementation-plan.md) and supplements the [experience standard](hrms-hr-admin-experience-standard.md).

Scope: actual signed-in staging Leave Policies page and its Create Leave Policy dialog in a separate desktop Chrome tab; shared shell, search and dialog source. Opened and closed the dialog without entering data, applying a template or saving. Original user tabs were left untouched. No mobile/zoom/screen-reader/form mutation certification is claimed. Screenshots were viewed and displayed in the conversation, not exported as local PNG files.

## Recommendation

Keep the existing shell/component architecture and permission-aware navigation. Standardize its appearance and complete its interaction semantics before broad page rollout. Use the established Accerio light/indigo direction across workspaces; role-specific menus and business actions can differ within that family. Do not equate a visual shell refresh with new security, notification or search capabilities.

| Area | Observed | Proposed change | Preserve |
|---|---|---|---|
| Sidebar | HR sidebar is 184px wide in the inspected render, with small uppercase group labels and all group headings collapsed on Leave Policies. Dark legacy HR theme differs from ESS/MSS. | Use the existing 224px Accerio shell width as the starting desktop token; readable navigation labels, consistent icon treatment, obvious active page and ancestor group, predictable collapse behavior. Derive parent context for nested/setup pages instead of matching only a different sibling list URL. A compact/collapsed mode is optional after normal navigation is sound. | Existing permitted destinations, commercial restrictions, group structure and disabled reasons. Do not invent new menu visibility rules. |
| Global header | Search, People Operations, ESS/MSS links, user identity and Sign out compete in a compressed strip. Page role is repeated in several places. | One calm surface/border, consistent vertical alignment and a shared height baseline (reuse the existing 64px Accerio header as the initial reference). Separate product/workspace context from page heading. Keep one coherent account/workspace-action area; consolidate ESS/MSS links into a switcher only if all currently permitted shortcuts remain accessible. | Authorized workspace switching, visible identity/role context, logout, keyboard access and responsive navigation. Do not hide critical controls behind unlabeled icons. |
| Footer | No global content footer is rendered by this shell. The sidebar contains a promotional “Live workspace / HRMS Workspace” block in source, but computed display is none on the inspected HR page. | Do not add a large fixed footer. Keep the promotional block absent. A small optional utility area may show actual environment/build/help information only where supported, without consuming useful table height. Page form/dialog action footers are separate and should remain useful. | Content space, truthful environment labeling and existing real help/settings destinations. “Live workspace” is not a service-health certification. |
| Popups | Create Leave Policy is 760px wide and 679px high in an 828px-high viewport. Its 581px body scrolls over 2056px of content. It has no separate modal footer; submit is initially outside the viewport. Nested cards and a large template starter compete with the actual fields. | Use one shared dialog behavior/presentation system with small confirmation, standard form and wide/long form variants. Stable header and reachable action footer, one clearly owned body scroll region, consistent close control, restrained section styling, full-height/mobile layout as needed. For long policy forms use a wide/full-page editor or functional section navigation; do not force all tasks into the same small modal. | Existing form fields, template business semantics, validation, governance locks, API payloads and actual cancel/save behavior. Do not change policy defaults in a design pass. |

Dimensions above are actual observations or clearly marked starting references, not new independent page-level CSS constants. Implement sizing through centralized tokens and responsive component variants, and verify reflow before adopting exact values.

## Interaction changes that matter beyond appearance

1. **Search naming:** `WorkspaceSearch` filters navigation destinations and shortcuts locally; it is not a backend employee-record search. Label it “Search pages and actions” (or similarly accurate wording). Do not imply global record search until an authorized API-backed contract exists. Retain the current keyboard shortcut and test result keyboard semantics.
2. **Active navigation:** ensure nested pages show a visible selected destination or parent context, with `aria-current` on the correct link. Preserve the user's expanded groups appropriately; do not collapse everything unexpectedly on navigation. HR mobile links currently lack the close-on-select branch used for ESS/MSS; verify and standardize that behavior rather than copying a second mobile menu.
3. **Dialog tabs:** `HrAdminActionModal` renders its `tabs` as spans with `role="tab"`; only the first is statically selected and there are no tab handlers/panels. Multiple HR callers supply these labels. Replace them with real accessible section links/tabs where they navigate, or ordinary noninteractive section labels without tab semantics. Do not invent a wizard workflow merely to make the decoration clickable.
4. **Shared dialog behavior:** `HrAdminActionModal` already includes initial focus, Tab trapping, Escape, scroll lock, restoration and dirty-change protection. Preserve and verify these instead of recreating them. `WorkspaceDialogFrame` is a presentation frame with dialog semantics but no equivalent focus lifecycle of its own; consumers must supply behavior or converge through the shared implementation. Background inertness and actual assistive-technology traversal require verification.
5. **Unsaved changes:** the existing modal uses native `window.confirm`. A consistent accessible discard-confirmation variant is preferable, but must retain the protection and avoid stacked focus traps. Test both Keep editing and Discard; visual polish cannot silently remove the guard.
6. **Product copy:** the current popup describes unchanged APIs/validation and “JSON behind the scenes.” Replace implementation-history/internal-storage copy with task guidance where it does not help the administrator make a decision. Do not change the underlying behavior.

## Shared component contract

- Shell: single branding/color/typography/spacing system, role-aware navigation data, consistent header and responsive menu.
- Header search: truthful scope, accessible name, keyboard operation, clear/no-match state and permission-consistent destinations.
- Popup: shared accessible lifecycle plus explicit size/content variants; single title/description, visible close, body and actions; semantic buttons/tabs; unsaved/pending/error states.
- Footer: no decorative global footer; compact supported utilities only. Dialog/form actions use shared sticky/reflow patterns where needed.

Use existing `WorkspaceChrome`, semantic Accerio tokens, modal/form primitives and shared styles. Do not add a component library, clone per-workspace shells or push payroll/permission logic into presentation helpers.

Source references: `web/src/components/shell/workspace-chrome.tsx:116` (search), `:293` (theme scope), sidebar/footer/header below that; `web/src/components/shell/hr-admin-chrome.tsx`; `web/src/components/patterns/hr-admin-action-modal.tsx`; `web/src/components/patterns/workspace-standard.tsx:120`; `web/src/styles/accerio.css` and legacy HR overrides in `web/src/app/globals.css`.

## Required QA before accepting these changes

- Sidebar: permitted/disabled destinations, nested-route highlighting, group expansion across navigation, keyboard focus, overflow, mobile menu selection/dismissal.
- Header: supported workspace switching, account identity/role, search shortcut and results, logout, long names, small screens, no overlapping controls.
- Footer: no lost table height, truthful environment/build values, no fabricated help links or health badges.
- Dialogs: confirmation/short/long forms; keyboard-only open/use/close; initial/trapped/restored focus; Escape; dirty cancel/discard; pending-save close rules; validation/error/retry; mobile keyboard and visible actions; long translations/content and no double scrolling.
- Chromium/Firefox/WebKit; 1440/1024/768/390/320 CSS pixels; 200%/400% native zoom where executable; reduced motion, accessible names, contrast and actual screenshot inspection. Record actual screen reader/browser/OS coverage separately; formal WCAG remains unverified without the appropriate assessment.
- Rerun impacted ESS/MSS and HR workflows because the shell/modal implementation is shared. Preserve RBAC, tenant isolation and all business/history protections. No staging changes until separately authorized and verified.

## Placement in the implementation plan

A0 now includes this shell/dialog review and a concrete design specification/reference checkpoint. In A1, build only the shared behavior needed for the Attendance safety pilot. In A2 and onward, every touched page must conform to the same approved shell/control/dialog family. A4 performs the broad shell/form rollout; it is not permission to leave earlier phases visually inconsistent. Do not delay a genuine wrong-scope selection fix while waiting for decorative polish.

**Decision:** sidebar, header and popup refinements are warranted; a large global footer is not. Settle and document these shared patterns before broad page-by-page modernization. This review is a recommendation, not an approved mockup or functional/accessibility certification.
