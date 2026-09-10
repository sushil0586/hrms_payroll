# Phase 8A Workspace Shell UX Accessibility Certification

Date: 2026-09-10

Environment: local dev

## Scope

Phase 8A starts UX, accessibility, responsive, and performance certification by testing the shared workspace shell across key role entry points.

## Browser Coverage

Viewports:

- Desktop: `1440x900`
- Mobile: `390x844`

Routes:

- `/`
- `/hr-admin`
- `/hr-admin/employees`
- `/hr-admin/saas-control-plane`
- `/tenant-admin`
- `/platform-admin`
- `/ess/payslips`
- `/mss/approvals`
- `/support`

Assertions:

- Main landmark is visible.
- Exactly one `h1` exists.
- Expected page heading is visible.
- Sidebar and labelled navigation exist on workspace pages.
- Each route exposes at least one visible interactive command.
- First focusable control can receive focus.
- Visible links, buttons, inputs, selects, textareas, and ARIA command roles have accessible names.
- Visible interactive elements do not extend outside the viewport unless inside an intentional horizontal scroller.
- Text inputs, selects, and textareas meet minimum usable dimensions.
- Button-like controls are not tiny.
- Horizontal page overflow is absent.
- Screenshots are captured for each route and viewport.

## Defect Found And Fixed

- Closed action menu panels were still laid out because `.action-menu__panel` used `display: grid`, overriding native closed `<details>` behavior.
- This caused hidden employee action links to extend outside the mobile viewport.
- Fix: `.action-menu:not([open]) .action-menu__panel { display: none; }`

## Suite

- `web/tests/e2e/phase8a-workspace-shell-ux-accessibility.spec.ts`

Result:

- `2 passed`

## Residual Risks

- Broader launch workflow responsive sweep still needs to run after this shell gate.
- Keyboard tab-order certification for large CRUD forms remains pending.
- Performance timing budgets remain pending.
