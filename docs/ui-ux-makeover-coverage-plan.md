# UI/UX Makeover Coverage Plan

## Goal

Make sure the web makeover is applied consistently across the full admin experience so no important screen is left on an older visual or interaction pattern.

This document is the coverage tracker for the ongoing makeover work. It complements:

- `docs/ui-ux-modernization-strategy.md`
- `docs/ui-ux-modernization-rollout-plan.md`

## What "Done" Means

A screen is only considered fully modernized when it meets all of the following:

- uses the shared shell and centralized navigation
- uses the compact `PageIntro` pattern or an intentionally equivalent header
- uses shorter header copy, not marketing-style hero content
- uses compact actions, with popup menus where that reduces clutter
- uses filters before long explanatory text on list or queue pages
- uses modern card, detail, and form patterns from shared components/CSS
- avoids one screen carrying too many unrelated actions
- keeps create/edit flows consistent with the list or queue that leads into them
- passes `corepack pnpm --dir web build`
- passes `corepack pnpm --dir web typecheck`

## Shared Foundation Scope

These are the single-place controls that should drive the makeover:

- `web/src/app/globals.css`
- `web/src/styles/tokens.css`
- `web/src/styles/themes/default.css`
- `web/src/styles/motion.css`
- `web/src/components/patterns/page-intro.tsx`
- `web/src/components/patterns/metric-tile.tsx`
- `web/src/components/patterns/workspace-card.tsx`
- `web/src/components/patterns/form-section.tsx`
- `web/src/components/patterns/action-menu.tsx`
- `web/src/components/shell/hr-admin-chrome.tsx`
- `web/src/lib/ui/navigation.ts`
- `web/src/lib/ui/module-metadata.ts`

## Coverage Buckets

### Bucket 1: Shell And Global Patterns

- [x] HR admin shell layout
- [x] centralized navigation
- [x] compact shared header pattern
- [x] shared popup action menu
- [x] compact card and form styling foundation
- [ ] final density pass for shared lists/detail grids
- [ ] final responsive polish pass across desktop and laptop widths

### Bucket 2: Core Admin Hubs

- [x] `/hr-admin`
- [x] `/hr-admin/page.tsx`
- [x] `/hr-admin/attendance-operations`
- [x] `/hr-admin/documents`
- [x] `/hr-admin/policies`
- [x] `/hr-admin/workflows`
- [x] `/hr-admin/notifications-admin`
- [x] `/hr-admin/reports`

### Bucket 3: People And Access

- [x] `/hr-admin/employees`
- [x] `/hr-admin/employees/new`
- [x] `/hr-admin/employees/[employeeId]/edit`
- [x] `/hr-admin/employees/[employeeId]/access`
- [ ] final list/detail density pass on employee masters
- [ ] review whether employee create/edit should move to more popup/drawer flows later

### Bucket 4: Lifecycle Surfaces

- [x] `/hr-admin/lifecycle`
- [x] `/hr-admin/onboardings`
- [x] `/hr-admin/onboardings/new`
- [x] `/hr-admin/onboardings/[itemId]/edit`
- [x] `/hr-admin/probation-reviews`
- [x] `/hr-admin/probation-reviews/new`
- [x] `/hr-admin/probation-reviews/[itemId]/edit`
- [x] `/hr-admin/movements`
- [x] `/hr-admin/movements/new`
- [x] `/hr-admin/movements/[itemId]/edit`
- [x] `/hr-admin/exits`
- [x] `/hr-admin/exits/new`
- [x] `/hr-admin/exits/[itemId]/edit`
- [ ] reduce queue-card body density where still too verbose

### Bucket 5: Document Operations

- [x] `/hr-admin/employee-documents`
- [x] `/hr-admin/employee-documents/[itemId]/review`
- [x] `/hr-admin/document-categories`
- [x] `/hr-admin/document-categories/new`
- [x] `/hr-admin/document-categories/[itemId]/edit`
- [x] `/hr-admin/document-requirements`
- [x] `/hr-admin/document-requirements/new`
- [x] `/hr-admin/document-requirements/[itemId]/edit`
- [x] `/hr-admin/generated-letters`
- [ ] compact review/detail rows where needed

### Bucket 6: Notification Surfaces

- [x] `/hr-admin/notifications`
- [x] `/hr-admin/notifications/[itemId]/review`
- [x] `/hr-admin/notification-events`
- [x] `/hr-admin/notification-events/new`
- [x] `/hr-admin/notification-events/[itemId]/edit`
- [x] `/hr-admin/notification-templates`
- [x] `/hr-admin/notification-templates/new`
- [x] `/hr-admin/notification-templates/[itemId]/edit`
- [x] `/hr-admin/notifications-admin`
- [ ] final compact-card review on notifications admin

### Bucket 7: Organization And Governance

- [x] `/hr-admin/organization`
- [x] `/hr-admin/organization/[section]/new`
- [x] `/hr-admin/organization/[section]/[itemId]/edit`
- [x] `/hr-admin/workflow-templates`
- [x] `/hr-admin/workflow-templates/new`
- [x] `/hr-admin/workflow-templates/[itemId]/edit`
- [x] `/hr-admin/workflow-template-assignments`
- [x] `/hr-admin/workflow-template-assignments/new`
- [x] `/hr-admin/workflow-template-assignments/[itemId]/edit`
- [ ] final microcopy trim on governance forms if needed

### Bucket 8: Policy And Assignment Surfaces

- [x] `/hr-admin/attendance-policies`
- [x] `/hr-admin/attendance-policies/new`
- [x] `/hr-admin/attendance-policies/[itemId]/edit`
- [x] `/hr-admin/leave-policies`
- [x] `/hr-admin/leave-policies/new`
- [x] `/hr-admin/leave-policies/[itemId]/edit`
- [x] `/hr-admin/leave-types`
- [x] `/hr-admin/leave-types/new`
- [x] `/hr-admin/leave-types/[itemId]/edit`
- [x] `/hr-admin/attendance-policy-assignments`
- [x] `/hr-admin/attendance-policy-assignments/new`
- [x] `/hr-admin/attendance-policy-assignments/[itemId]/edit`
- [x] `/hr-admin/leave-policy-assignments`
- [x] `/hr-admin/leave-policy-assignments/new`
- [x] `/hr-admin/leave-policy-assignments/[itemId]/edit`
- [x] `/hr-admin/policy-assignments`
- [ ] verify that the longer configuration forms stay visually light on mid-size laptop screens

### Bucket 9: Attendance Operations

- [x] `/hr-admin/attendance-operations`
- [x] `/hr-admin/attendance-records`
- [x] `/hr-admin/attendance-records/[itemId]/edit`
- [x] `/hr-admin/attendance-regularizations`
- [x] `/hr-admin/attendance-regularizations/[itemId]/review`
- [x] `/hr-admin/shifts`
- [x] `/hr-admin/shifts/new`
- [x] `/hr-admin/shifts/[itemId]/edit`
- [x] `/hr-admin/holiday-calendars`
- [x] `/hr-admin/holiday-calendars/new`
- [x] `/hr-admin/holiday-calendars/[itemId]/edit`
- [ ] tighten data-dense operational rows where needed

## Non-HR Admin Surfaces To Review Separately

These are outside the main HR admin cluster, but should be checked so the product does not feel split:

- [x] `/`
- [x] `/login`
- [x] `/ess`
- [x] `/mss/approvals`

## Remaining Makeover Work

The current work suggests the app is largely migrated to the new system, but not yet fully polished. The highest-value remaining passes are:

1. Shared list and detail density pass
   Apply the same compactness now seen in headers to record rows, detail grids, and selection cards.

2. Heavy-page body simplification
   Continue reducing unnecessary explanatory copy in:
   - reports
   - notifications admin
   - lifecycle queues
   - employee masters

3. Popup and contextual action pass
   Replace exposed action clutter with menus or contextual actions wherever that improves scannability.

4. Responsive desktop pass
   Test all major surfaces at common laptop widths so headers, metrics, filters, and detail panels do not feel too tall or too loose.

5. ESS/MSS visual alignment pass
   Make sure employee-facing and manager-facing areas do not feel like a different product generation.

## Review Checklist Per Screen

Use this checklist before marking any screen fully done:

- [ ] Header is no more than one strong title plus one short description
- [ ] Header actions are minimal and relevant
- [ ] Filters are visible before dense data where applicable
- [ ] Card copy is short and useful
- [ ] Detail sections feel read-fast, not form-like
- [ ] Primary CTA is obvious
- [ ] Secondary actions do not dominate
- [ ] Spacing feels compact on 13-14 inch laptop screens
- [ ] Page visually matches adjacent pages in the same workflow

## Recommended Working Order From Here

1. Complete the shared list/detail density pass
2. Review all lifecycle and employee data-heavy pages together
3. Review all attendance and policy data-heavy pages together
4. Review ESS and MSS surfaces
5. Do one final visual QA sweep across every route in this checklist

## Ownership Rule

Any new page added under `web/src/app/hr-admin/` should not be considered complete unless this document is updated and the new page is placed into one of the coverage buckets above.

## Playwright Browser Coverage

Initial browser coverage has now started through `docs/playwright-browser-visual-testing-development-plan.md`.

Current Playwright baseline:

- [x] Playwright dependency and config added for the web app
- [x] Chromium route smoke tests added for Tier 0 entry/workspace routes
- [x] first visual baseline added for `/login`, `/hr-admin`, `/hr-admin/employees`, `/ess`, and `/mss/approvals`
- [x] laptop and mobile screenshots generated for the first visual baseline
- [x] no-horizontal-overflow assertion added to shared browser helpers
- [x] Tier 1 HRMS operational route smoke coverage added for organization, policies, attendance, lifecycle, documents, notifications, audit, reports, ESS documents, ESS notifications, and MSS notifications
- [x] operational visual baseline added across laptop and mobile viewports for Tier 1 HRMS routes
- [x] mobile overflow issue fixed for long PageIntro titles and dense organization review actions
- [x] Playwright report artifacts wired into CI on browser smoke failure

Next Playwright expansion:

- [x] add operational queue browser flows for employee directory, organization setup, lifecycle, employee documents, notifications, and audit filters
- [x] add configuration-form visual coverage for employee, organization, leave policy, attendance policy, workflow template, and notification template forms
- [x] add configuration-form behavior coverage for required validation, preview guardrails, workflow steps, and channel-aware template controls
- [x] add remaining Tier 2 workflow browser flows for attendance regularization review, notification diagnostics drill-down, ESS source navigation, and MSS queue switching
- [x] add live-backend auth and role browser tests
- [x] add first live-backend workflow mutation test through MSS manager decision handling
- [x] verify live workflow mutation persistence through manager pending queue removal and HR admin workflow trace timeline
- [x] add edit-mode governance and assignment-form coverage for policy locks, assignment conflicts, workflow validation, document requirements, and shift rotation controls
- [x] add generated HR letter browser and visual coverage for preview, missing-variable validation, and artifact generation
- [x] add workflow trace browser and visual coverage for filters, step trace, overdue signal, and timeline rows
- [x] run automated release-readiness visual regression across the HRMS pilot route set
- [ ] complete manual pilot screenshot review if new visual changes are introduced
- [ ] expand from Chromium-only to the broader browser matrix after the first suite is stable
