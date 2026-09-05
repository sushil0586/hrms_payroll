# Playwright Browser And Visual Testing Development Plan

## 1. Purpose

This document defines the development plan for adding browser-based Playwright testing to the HRMS web app while continuing the modern UI/UX makeover.

The goal is to make the product visually trustworthy, regression-safe, and comfortable to evolve before payroll work begins.

This plan complements:

- `docs/ui-ux-modernization-strategy.md`
- `docs/ui-ux-modernization-rollout-plan.md`
- `docs/ui-ux-makeover-coverage-plan.md`
- `docs/hrms-first-completion-plan.md`

## 2. Current Position

The current web app already has a broad modernized surface:

- HR admin shell and centralized navigation
- compact `PageIntro`, `MetricTile`, `WorkspaceCard`, `FormSection`, and queue/detail patterns
- HR admin routes for employees, organization, policies, attendance, lifecycle, documents, notifications, audit, and reports
- ESS and MSS workspaces with notification and approval flows
- explicit demo-mode behavior for browser exploration

The quality baseline is now in place:

- web typecheck exists
- web lint exists
- web build exists
- backend smoke tests exist
- CI exists for web, mobile, backend, and Chromium browser smoke checks
- Playwright route smoke exists for Tier 0 and top-level Tier 1 HRMS routes
- visual screenshot baselines exist for the first workspace routes and top-level operational HRMS routes across laptop and mobile viewports
- shared browser assertions check app shell rendering, expected H1 headings, app error states, and horizontal overflow

The remaining browser-confidence layer is broader workflow and release depth:

- release-risk closure after the first full HRMS browser, visual, and live-backend pass
- additional live-backend mutation coverage for the highest-risk approval and review paths
- broader cross-browser matrix after the Chromium baseline stays stable
- stronger automated checks for layout overlap and unusable dense screens

## 3. Target Outcome

After this work, every critical HRMS web surface should be testable in a real browser.

The browser test suite should answer:

- Does the page load without crashing?
- Does the correct workspace shell render?
- Does auth and demo-state behavior work as expected?
- Do filters, pagination, detail panels, forms, and actions behave?
- Does the page look modern, compact, and consistent?
- Does the layout stay usable on desktop, laptop, tablet, and mobile widths?
- Did a visual change happen intentionally?

## 4. Testing Principles

### 4.1 Browser Tests Are Product Tests

Playwright tests should follow real HRMS workflows, not only click isolated controls.

Preferred examples:

- HR opens the employee directory, filters employees, reviews a detail panel, and opens edit/access actions.
- HR reviews attendance regularizations and opens an approval decision.
- Employee opens ESS, checks leave history, and opens a notification source link.
- Manager opens MSS approvals, switches queues, and reviews a selected request.
- HR opens notification diagnostics and drills into failed notification queue filters.

### 4.2 Visual Tests Protect Screens, Not Pixels Alone

Screenshot tests should protect layout, hierarchy, spacing, density, and component consistency.

They should not become fragile because of:

- timestamps
- dynamic counts
- random seeded names
- browser font anti-aliasing
- small animation timing differences

Where needed, freeze or mask volatile content.

### 4.3 Modern UI Is A Testable Requirement

A screen should not be considered done only because it passes TypeScript.

It should also pass browser review for:

- no overlapping text
- no clipped buttons
- readable tables and cards
- predictable shell navigation
- compact page headers
- visible primary action
- consistent token-driven styling
- useful empty and error states

### 4.4 Start With Demo Mode, Then Add Live Backend

The first Playwright layer should run against web demo mode so visual checks are deterministic and cheap.

After the smoke layer is stable, add live-backend tests using the demo workspace seeded by:

```bash
pnpm --dir web test:e2e:live
```

This gives us two complementary suites:

- demo visual suite for stable UI snapshots
- live workflow suite for API-backed behavior

## 5. Proposed Test Structure

Recommended web test layout:

```text
web/
  playwright.config.ts
  tests/
    e2e/
      auth.spec.ts
      hr-admin-navigation.spec.ts
      ess.spec.ts
      mss-approvals.spec.ts
    visual/
      hr-admin-core.visual.spec.ts
      hr-admin-operations.visual.spec.ts
      ess-mss.visual.spec.ts
      responsive.visual.spec.ts
    helpers/
      auth.ts
      demo-mode.ts
      routes.ts
      screenshots.ts
      selectors.ts
      test-data.ts
```

Recommended scripts:

```json
{
  "test:e2e": "playwright test tests/e2e",
  "test:visual": "playwright test tests/visual",
  "test:browser": "playwright test",
  "test:browser:update": "playwright test --update-snapshots"
}
```

Root workspace scripts can delegate to the web app:

```json
{
  "test:web:e2e": "pnpm --dir web test:e2e",
  "test:web:visual": "pnpm --dir web test:visual",
  "test:web:browser": "pnpm --dir web test:browser"
}
```

## 6. Environment Modes

### 6.1 Demo Visual Mode

Purpose:

- fastest stable browser coverage
- visual screenshot baseline
- runs without backend

Environment:

```bash
HRMS_ENABLE_DEMO_DATA=true
HRMS_API_BASE_URL=
```

Expected behavior:

- pages render deterministic demo content
- write actions do not need to mutate backend records
- screenshots are stable enough for review

### 6.2 Live Local Mode

Purpose:

- end-to-end validation against Django APIs
- auth, role, permission, and workflow checks

Environment:

```bash
HRMS_ENABLE_DEMO_DATA=false
HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Backend setup for manual exploration:

```bash
cd backend
../.venv/bin/python manage.py migrate
../.venv/bin/python manage.py bootstrap_demo_workspace
../.venv/bin/python manage.py runserver 127.0.0.1:8000
```

The automated live suite uses `web/playwright.live.config.ts`, which resets a dedicated SQLite database and starts Django plus Next on isolated ports.

Expected behavior:

- login uses seeded credentials
- HR admin, ESS, and MSS workspaces render from live API responses
- approval and review flows can be tested with controlled seeded data

## 7. Browser Matrix

### 7.1 Required Browsers

Phase 1:

- Chromium only

Phase 2:

- Chromium
- WebKit

Phase 3:

- Chromium
- WebKit
- Firefox

### 7.2 Required Viewports

Use these as standard visual breakpoints:

```text
desktop-wide: 1440 x 1000
laptop:       1280 x 832
small-laptop: 1024 x 768
tablet:        768 x 1024
mobile:        390 x 844
```

The laptop and small-laptop viewports are especially important because HR teams often use dense admin tools on ordinary office laptops.

## 8. Route Coverage Plan

### 8.1 Tier 0: Shell And Entry Points

These routes must be covered first:

- `/`
- `/login`
- `/hr-admin`
- `/ess`
- `/mss/approvals`

Acceptance checks:

- page loads without client or server error
- correct shell/nav appears
- key primary actions are visible
- workspace access messaging is clear
- mobile layout does not overlap or clip

### 8.2 Tier 1: HR Admin Hubs

Cover high-level hubs next:

- `/hr-admin/employees`
- `/hr-admin/organization`
- `/hr-admin/policies`
- `/hr-admin/attendance-operations`
- `/hr-admin/lifecycle`
- `/hr-admin/documents`
- `/hr-admin/workflows`
- `/hr-admin/notifications-admin`
- `/hr-admin/reports`
- `/hr-admin/audit`

Acceptance checks:

- shell active state is correct
- metrics and cards align
- filters appear before dense data
- empty/error states are styled
- major links do not lead to broken routes

### 8.3 Tier 2: Operational Queues

Cover pages where real users spend time:

- `/hr-admin/attendance-records`
- `/hr-admin/attendance-regularizations`
- `/hr-admin/leave-balances`
- `/hr-admin/onboardings`
- `/hr-admin/probation-reviews`
- `/hr-admin/movements`
- `/hr-admin/exits`
- `/hr-admin/employee-documents`
- `/hr-admin/notifications`

Acceptance checks:

- filtering updates URL state
- pagination works
- selected detail state is readable
- approval/review actions are reachable
- queue cards do not become text-heavy on laptop widths

### 8.4 Tier 3: Configuration Forms

Cover create/edit forms that carry business-risk:

- employees
- organization masters
- leave types
- leave policies
- attendance policies
- policy assignments
- shifts
- holiday calendars
- workflow templates
- document categories
- document requirements
- notification templates
- notification events
- notification channel configs

Acceptance checks:

- forms fit without awkward horizontal overflow
- field errors are visible near fields
- governed/locked controls are visually disabled
- submit/cancel actions are consistently placed
- long forms remain scannable through sections

Current completion:

- `web/tests/e2e/configuration-form-flows.spec.ts` covers representative behavior across employee, organization, leave policy, attendance policy, workflow template, and notification template create forms.
- `web/tests/visual/configuration-form-baseline.visual.spec.ts` protects those six forms across laptop and mobile viewports.
- Current form coverage includes required-field validation, employee date warnings, leave/attendance preview guardrails, workflow step add/remove, notification channel field enablement, and no-horizontal-overflow checks.
- `web/tests/e2e/governance-assignment-form-flows.spec.ts` covers edit-mode governance locks for platform-managed leave and attendance policies plus leave assignment, attendance assignment, workflow assignment, document requirement, and shift rotation behavior.
- `web/tests/visual/governance-assignment-baseline.visual.spec.ts` protects seven governance and assignment forms across laptop and mobile viewports.
- Open Tier 3 gaps now move to remaining lower-frequency forms such as holiday calendars, document categories, notification events, notification channel configuration, and deeper live-backend mutation coverage.

### 8.5 Tier 4: ESS And MSS Depth

Cover employee and manager workspaces:

- `/ess`
- `/ess/documents`
- `/ess/notifications`
- `/mss/approvals`
- `/mss/notifications`

Acceptance checks:

- employee and manager workspaces feel visually aligned with HR admin
- histories, inboxes, and details are readable
- source links are reachable
- action panels fit on mobile

## 9. Visual Design Acceptance Checklist

Every visually tested page should pass this checklist:

- [ ] The page title is visible without scrolling.
- [ ] The page header is compact and not marketing-like.
- [ ] Primary and secondary actions are visually distinct.
- [ ] Navigation active state is clear.
- [ ] Metrics do not dominate operational content.
- [ ] Filters are easy to find.
- [ ] Dense lists are readable on a 1280px laptop.
- [ ] Cards are not nested inside other cards.
- [ ] Button text does not clip.
- [ ] Status chips are readable and consistent.
- [ ] Empty states feel intentional.
- [ ] Error states tell the user what failed.
- [ ] Text does not overlap adjacent content.
- [ ] No horizontal overflow exists at required viewports.
- [ ] The screen uses shared tokens and patterns rather than isolated styling.

## 10. Playwright Assertions To Standardize

Create shared helper assertions for:

- app shell exists
- route heading is visible
- no page-level error boundary is visible
- no horizontal overflow at viewport width
- no obvious text clipping in buttons and chips
- primary nav item is active
- data-state badge shows live or demo mode
- screenshots mask volatile timestamps

Example helper names:

```ts
await expectAppShell(page);
await expectNoAppError(page);
await expectNoHorizontalOverflow(page);
await expectModernHeader(page, "Employees");
await expectScreenshotStable(page, "hr-admin-employees-laptop");
```

## 11. Data Strategy

### 11.1 Demo Snapshot Data

Use existing frontend demo payloads for visual tests.

Benefits:

- deterministic
- fast
- no backend dependency
- ideal for screenshot baselines

Risks:

- can drift from backend reality
- does not catch API contract breaks

Mitigation:

- run separate live-backend smoke tests
- keep demo data aligned with TypeScript types

### 11.2 Seeded Backend Data

Use `bootstrap_demo_workspace` for live browser tests.

Seeded roles:

- employee: `riya.sharma`
- manager: `karan.mehta`
- HR admin: `nisha.rao`
- platform admin: `platform.admin`

Benefits:

- catches auth and API integration failures
- verifies route protection
- validates real workflow responses

Risks:

- slower
- requires DB setup
- can be brittle if tests mutate shared records

Mitigation:

- reset DB before CI live-browser tests
- prefer read-heavy live tests first
- isolate mutation tests into a smaller suite

## 12. Development Phases

## Phase 0: Prerequisite Cleanup

Objective:

Make browser testing installable and keep current quality gates green.

Tasks:

- fix current web lint blockers
- confirm `pnpm --dir web typecheck`
- confirm `pnpm --dir web lint`
- confirm `pnpm --dir web build`
- confirm backend Django check and smoke tests through `.venv`

Exit criteria:

- existing CI checks are green before Playwright is added

## Phase 1: Install Playwright And Add Smoke Harness

Objective:

Create the browser-test foundation.

Tasks:

- add `@playwright/test` to `web` dev dependencies
- add `web/playwright.config.ts`
- add browser test scripts
- configure `webServer` to start Next dev server
- add `tests/helpers/routes.ts`
- add first route smoke tests for `/`, `/login`, `/hr-admin`, `/ess`, and `/mss/approvals`

Exit criteria:

- `pnpm --dir web test:e2e` runs locally in Chromium
- failures produce traces, screenshots, and HTML report

## Phase 2: Add Demo Visual Baselines

Objective:

Protect the current modern UI direction with screenshot tests.

Tasks:

- enable `HRMS_ENABLE_DEMO_DATA=true` in visual test config
- add screenshots for Tier 0 and Tier 1 routes
- define masks for volatile timestamps and generated counts where needed
- add desktop, laptop, and mobile snapshots for the highest-value routes
- document snapshot update rules

Exit criteria:

- `pnpm --dir web test:visual` produces stable Chromium snapshots
- visual snapshot updates require intentional review

## Phase 3: Add Layout Quality Assertions

Objective:

Catch layout bugs automatically before relying on human screenshot review.

Tasks:

- implement no-horizontal-overflow helper
- implement button/chip clipping checks
- check that shell nav and page headings are visible
- check that form action bars remain visible or reachable
- add responsive tests for laptop, small-laptop, tablet, and mobile

Exit criteria:

- critical pages fail automatically for obvious overflow or clipping

## Phase 4: Add Live Backend Browser Tests

Objective:

Validate real auth, role routing, and API-backed workspace behavior.

Tasks:

- add backend startup instructions for local and CI
- seed demo workspace before tests
- add login helper for seeded users
- test HR admin login and dashboard load
- test employee ESS dashboard and leave history load
- test manager MSS approval queue load
- test unauthorized workspace access redirects or blocks correctly

Exit criteria:

- live browser tests prove the app can operate against local Django APIs

Current completion:

- `web/playwright.live.config.ts` resets a dedicated SQLite database, seeds the workspace, and starts Django plus Next with live API settings.
- `pnpm --dir web test:e2e:live` runs seeded live browser tests.
- Seeded auth coverage now proves unauthenticated redirect, HR admin access, employee ESS access, employee HR admin denial, and manager MSS access.
- The live workflow coverage verifies a real manager rejection mutation, confirms the request leaves the manager pending queue, and confirms the rejected workflow trace appears for HR admin with employee context and decision note history.
- HR admin landing access now redirects unauthorized users before admin dashboard data loading begins.

## Phase 5: Cover Operational Workflows

Objective:

Move beyond page-load checks into real product flows.

Tasks:

- employee directory filter and detail review
- organization section filter and selected-record review
- attendance regularization queue filter and review
- employee document queue filter and review
- notification diagnostics to queue drill-down
- ESS notification source-link navigation
- MSS approval queue switching and detail review

Current completion:

- `web/tests/e2e/operational-queue-flows.spec.ts` covers employee directory filtering and selected master detail review.
- The same suite covers organization structural layer/status filtering, lifecycle type filtering plus demo bulk guardrails, document expiry filtering plus reminder candidate selection, notification pending queue filtering plus retry candidate selection, and audit source/search filtering.
- `web/tests/e2e/tier-two-workflow-flows.spec.ts` covers attendance regularization filtering to full review, notification diagnostics drill-down to retry-ready queue, ESS notification source navigation, and MSS leave-to-attendance queue switching.
- `web/tests/e2e/generated-letter-flows.spec.ts` covers generated HR letter preview, storage submission, missing-variable validation, and layout overflow on the generated-letter workspace.
- `web/tests/visual/generated-letter-baseline.visual.spec.ts` protects the generated-letter workspace across laptop and mobile viewports.
- Open Tier 2 workflow gaps now move from first mutation coverage to additional live-backend approval/review mutations chosen by release risk.

Exit criteria:

- Tier 0, Tier 1, and Tier 2 routes have meaningful browser coverage

## Phase 6: CI Integration

Objective:

Make browser checks part of release confidence without slowing every commit too much.

Recommended CI split:

- pull requests: Chromium smoke tests plus selected visual snapshots
- nightly or manual: full visual suite across more viewports
- pre-release: full browser matrix plus live-backend workflow tests

Tasks:

- add Playwright browser install step
- cache browser binaries where practical
- upload Playwright reports as CI artifacts
- run visual tests only when web files or visual baseline files change
- add manual workflow dispatch for snapshot refresh review

Exit criteria:

- CI gives useful browser failure reports
- visual regressions are visible in artifacts
- slow tests are separated from fast PR checks

## 13. Modern UI Development Rules During This Plan

During browser-test rollout, all new or changed screens should follow these rules:

- use shared shell and navigation configuration
- use `PageIntro` or a deliberate equivalent
- keep header text short
- keep filters and primary actions above dense records
- use shared pattern components before adding one-off markup
- avoid nested cards
- avoid page-specific raw colors where tokens exist
- test at 1280px and 390px before marking done
- add or update a Playwright screenshot when a major screen changes

## 14. First Route Set For Visual Baseline

Start with this exact sequence:

1. `/login`
2. `/hr-admin`
3. `/hr-admin/employees`
4. `/hr-admin/organization`
5. `/hr-admin/lifecycle`
6. `/hr-admin/employee-documents`
7. `/hr-admin/notifications`
8. `/hr-admin/reports`
9. `/hr-admin/audit`
10. `/ess`
11. `/ess/documents`
12. `/ess/notifications`
13. `/mss/approvals`
14. `/mss/notifications`

This sequence covers:

- entry
- admin shell
- dense people data
- master data
- lifecycle
- documents
- notification trust layer
- reports and audit
- employee workspace
- manager workspace

## 15. Screenshot Naming Standard

Use stable names:

```text
login.desktop.png
login.mobile.png
hr-admin-dashboard.laptop.png
hr-admin-employees.laptop.png
hr-admin-employees.mobile.png
hr-admin-organization.laptop.png
hr-admin-lifecycle.laptop.png
hr-admin-documents.laptop.png
hr-admin-notifications.laptop.png
hr-admin-reports.laptop.png
ess-dashboard.mobile.png
mss-approvals.mobile.png
```

Avoid names tied to implementation details or temporary feature branches.

## 16. Review Workflow For Visual Changes

When screenshots change:

1. Run the visual suite locally.
2. Open the Playwright HTML report.
3. Review before and after images.
4. Confirm the difference is intentional.
5. Update snapshots with `pnpm --dir web test:browser:update`.
6. Mention the affected routes in the implementation summary.

Snapshot updates should be treated like product UI changes, not mechanical test churn.

## 17. Definition Of Done

A frontend screen touched during this initiative is done when:

- web lint passes
- web typecheck passes
- web build passes
- route smoke test exists or is updated
- screenshot baseline exists for important visual surfaces
- laptop and mobile layouts are reviewed
- no horizontal overflow is detected
- visual change is documented in the PR or work summary

## 18. Recommended Immediate Sprint

### Sprint Goal

Establish the first Playwright browser baseline and make the modern UI review repeatable.

### Tasks

1. Fix current web lint errors.
2. Add Playwright dependency and config.
3. Add demo-mode route smoke tests for Tier 0 routes.
4. Add visual screenshots for `/login`, `/hr-admin`, `/hr-admin/employees`, `/ess`, and `/mss/approvals`.
5. Add layout assertion helper for horizontal overflow.
6. Add CI job for Chromium browser smoke tests.
7. Update `docs/ui-ux-makeover-coverage-plan.md` with Playwright coverage status.

### Sprint Exit Criteria

- `pnpm --dir web test:e2e` passes locally.
- `pnpm --dir web test:visual` passes locally.
- Playwright report artifacts are generated on failure.
- At least five key routes have browser screenshots.
- The team has a repeatable path for approving visual changes.

## 19. Recommended Priority After First Sprint

After the first sprint, expand in this order:

1. resolve or formally accept the remaining mobile dependency audit risk
2. additional live-backend approval and review mutations chosen by release risk
3. full responsive visual matrix
4. cross-browser coverage

This keeps the first investment focused and useful while creating a test foundation that can grow with payroll readiness.

## 20. Summary

The next frontend quality step is to make the modern UI measurable in a browser.

Playwright should become the safety layer for:

- visual consistency
- route stability
- responsive layout confidence
- role-based workspace behavior
- real user workflow coverage

Once this is in place, the project can continue trust-layer and release-readiness work with much less fear of breaking the screens that already carry the HRMS product.
