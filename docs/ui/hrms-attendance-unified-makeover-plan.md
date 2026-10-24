# Accerio HRMS Attendance Unified Makeover Plan

Implementation follow-up: [shared UI/UX rollout and verification](hrms-ui-ux-rollout-certification.md). The original discovery/evidence baseline below remains historical; presentation adoption does not imply full workflow acceptance.

**Status:** Planning baseline
**Scope:** HR Admin, ESS, MSS and Tenant Admin attendance experiences
**Design baseline:** Centralized Accerio design system and Leave Phase 2 patterns
**Safety:** No deployment, payroll-rule change, historical-record mutation or frozen-gate change is authorized by this document.

## Shared documentation baseline

Use the [cross-workspace UI/UX standard](hrms-ui-ux-standard.md), [Leave/Attendance implementation reference](hrms-leave-attendance-makeover-reference.md) and [screen adoption checklist](hrms-ui-ux-screen-adoption-checklist.md) for every convergence slice. The HR Admin 30-route family is already standardized under its [certificate](hrms-hr-admin-attendance-family-certification.md); this planning baseline does not certify the remaining cross-workspace convergence. Preserve each existing documented immediate versus committed filter contract.

## Objective

Bring every Attendance surface into one compact, premium Accerio family while preserving real authorization, attendance-close protections, payroll inputs, audit history and tenant isolation. The work follows the Leave makeover approach: shared presentation primitives first, workflow behavior second, and certification after each bounded slice.

## Current attendance surface inventory

| Workspace | Surface | Primary responsibility |
| --- | --- | --- |
| HR Admin | Attendance Records | Search, filter, inspect and governed attendance record maintenance |
| HR Admin | Attendance Record Import | Validated bulk ingestion with receipts and error feedback |
| HR Admin | Attendance Regularizations | Queue, review, approve/reject and audit decisions |
| HR Admin | Attendance Policy Assignments | Govern policy scope and effective dates |
| HR Admin | Employee Shift Assignments | Assign shifts with effective-dated validation and import support |
| HR Admin | Shift Roster Templates | Maintain reusable roster definitions |
| HR Admin | Holiday Calendars | Maintain attendance-relevant holiday catalogs |
| HR Admin | Attendance Reports | Collision, summary and operational reporting |
| ESS | My Attendance | Employee-scoped calendar/list, punches, hours, shifts and exceptions where authorized |
| ESS | Regularization Requests | Submit, track and cancel only supported employee requests |
| MSS | Attendance Approvals | Manager-scoped regularization review and decisions |
| Tenant Admin | Attendance governance | Tenant-level policy/navigation controls where existing contracts permit |

## Unified experience rules

All attendance pages use the existing Accerio tokens and shared components:

- Workspace shell, navigation and compact page header.
- Consistent filter bar with committed versus draft values, Apply, Reset and URL/history behavior.
- Shared tables with named scroll regions, keyboard navigation, pagination and responsive column priorities.
- Shared status badges for present, absent, late, pending, approved, rejected, closed and unavailable states.
- Shared detail drawers and dialogs with focus trapping, restoration, explicit accessible names and mobile scrolling.
- Shared loading, empty, error, retry, validation and uncertain-outcome feedback.
- Solid surfaces, compact spacing, readable disabled controls, visible focus rings and reduced-motion support.
- No decorative-only actions, fake attendance data or unsupported policy claims.

Business data, permissions and calculations remain outside presentation components.

## Workflow and authorization invariants

Every implementation slice must preserve:

- Employee-only access to employee attendance data.
- Manager scope and approval authorization for MSS decisions.
- Tenant isolation and privileged-role boundaries.
- Finalized/closed attendance snapshots as immutable.
- No direct employee mutation of raw punches or payroll inputs.
- Existing effective-dated shift, holiday and policy semantics.
- Existing attendance regularization audit records and decision history.
- Existing payroll calculation and statutory behavior.
- Existing API contracts unless a separately approved contract change is documented.

Unsupported actions must be visibly unavailable and explain why.

## Target information architecture

### HR Admin Attendance Records

Compact header, period/status filters, employee and organization scope, result summary, table/list toggle where supported, detail drawer, governed edit/import actions, close-state indicators and export actions only when authorized.

### HR Admin Regularizations

Queue summary, committed filters, request detail, employee/manager context, attendance evidence, decision note validation, approval/rejection/cancel state transitions, retry and uncertain-outcome handling.

### ESS Attendance

Identity and current period summary, calendar/list views, day details, punches/hours/shifts/weekly offs/holidays/exceptions only when returned by authorized APIs, regularization entry points and request status.

### MSS Attendance

Manager queue, team scope, pending count, request detail, evidence panel, decision dialog and navigation back to the employee/request source.

### Governance and catalogs

Policy assignments, shifts, rosters and holiday calendars share the same form sections, effective-date controls, import workbenches, preview/commit semantics, audit feedback and close restrictions.

## Implementation phases

### Phase A — Discovery and contract map

Inventory routes, API calls, serializers, permissions, loading/error states, tests and historical-close checks. Produce an API reuse matrix and identify unsupported actions. No UI behavior changes.

### Phase B — Shared Attendance foundation

Standardize headers, filter contracts, summary cards, tables, detail drawers, status badges, dialogs, feedback states and mobile patterns. Add only presentation changes and semantic/accessibility corrections.

### Phase C — HR Admin Attendance Records

Modernize records list/detail/edit/import using shared components. Preserve filters, pagination, import validation, audit receipts and closed-period restrictions.

### Phase D — Regularizations and MSS approvals

Modernize HR queue and MSS approval detail. Verify manager scope, decision notes, retry behavior, pending state and audit history.

### Phase E — ESS Attendance

Apply the shared visual system to the certified ESS attendance workspace. Preserve employee ownership, timezone/period behavior, calendar/list semantics and regularization contracts.

### Phase F — Attendance governance

Standardize policy assignments, shifts, rosters, holidays and attendance reports. Keep effective-dated validation and close protections unchanged.

### Phase G — Cross-workspace certification

Run browser, API/PostgreSQL, RBAC, accessibility, responsive, cleanup and build gates. Publish evidence and update HR Admin/ESS trackers.

## Reusable component acceptance criteria

- Works with real loading, empty, error and retry states.
- Has an accessible name and keyboard path.
- Does not expose unauthorized fields or actions.
- Preserves URL/filter/history behavior.
- Avoids horizontal overflow at 320, 390, 768 and 1440 widths.
- Supports reduced-motion preference.
- Uses semantic tokens rather than page-level hardcoded colors.
- Does not encode attendance policy or payroll calculations.

## QA strategy

### Browser

Production-built Playwright across Chromium, Firefox and WebKit. Cover desktop, tablet and mobile; refresh, back/forward, pagination, filters, dialogs, keyboard navigation and retry states. Repeat historically flaky scenarios independently before classifying them as defects.

### Backend/API/PostgreSQL

Verify employee ownership, manager scope, tenant isolation, role denial, close-period immutability, regularization transitions, import validation, effective dates, audit records and payroll-input protection. Use isolated synthetic tenants only.

### Accessibility

Run automated Axe checks, accessible-name checks, keyboard/focus checks, dialog focus restoration, responsive reflow, contrast sampling and reduced-motion emulation. Report screen-reader testing, native 200/400% zoom, physical devices and formal WCAG assessment separately unless actually executed.

### Quality and cleanup

Run TypeScript, ESLint, Django checks, migration drift and production build. Remove synthetic tenants, users, documents, media, containers and temporary processes. Preserve failure traces, audit prefixes and release-gate files.

## Definition of done per slice

A slice is complete only when:

1. Shared components and tokens are reused.
2. Real backend workflows and permissions are preserved.
3. Focused browser and API tests pass across applicable roles.
4. Responsive screenshots and accessibility evidence are captured.
5. Historical-close and payroll-integrity checks pass.
6. Synthetic fixtures and infrastructure are cleaned.
7. A certification note records exact passed, failed, skipped, blocked and unexecuted counts.
8. Production, Lightsail and frozen release decisions remain unchanged unless separately approved.

## Recommended first slice

Start with **HR Admin Attendance Records plus shared attendance filter/table/detail patterns**. This slice has the broadest reuse value for regularizations, reports and MSS while keeping payroll and close-period behavior bounded. After its certification passes, reuse the same components for Regularizations/MSS, then ESS Attendance, then governance catalogs.

## Screen convergence plan

Use this order for screens that are not yet fully aligned with the Accerio family. Each row is a bounded implementation and certification slice.

| Order | Screen family | Convergence work | Functional checks | Exit evidence |
| ---: | --- | --- | --- | --- |
| 1 | HR Admin Attendance Records | Align header density, summary strip, filter grouping, table/detail spacing, status badges, pagination and mobile overflow | Filter persistence, date validation, page-size behavior, detail access, bulk permissions, locked-row protection | Chromium/Firefox/WebKit screenshots, keyboard/axe checks, API ownership/RBAC tests |
| 2 | HR Admin Attendance Regularizations | Reuse queue/detail layout, decision dialog, note validation, status feedback and focus restoration | Approve/reject/cancel, retry after transport failure, manager/HR scope, audit history | Browser workflow matrix, API transition tests, audit evidence |
| 3 | MSS Attendance Approvals | Match MSS queue/detail shell, compact metrics, evidence panel and action placement | Team scope, pending state, decision authorization, duplicate-submit protection | MSS smoke, cross-tenant denial, responsive screenshots |
| 4 | ESS Attendance | Match ESS header, period summary, calendar/list presentation, day detail and request entry points | Employee ownership, timezone/period boundaries, closed history, regularization request status | ESS browser suite, PostgreSQL close checks, mobile/keyboard evidence |
| 5 | Attendance Record Import | Standardize import workbench, preview/commit states, row errors and retry language | CSV validation, exact employee lookup, partial results, audit receipt, no unsafe retry | Import browser/API tests and cleanup receipt |
| 6 | Attendance Policy Assignments | Align governance cards, effective-date forms, preview/commit actions and disabled states | Scope validation, overlapping dates, permission denial, effective-date history | Browser/API/RBAC evidence |
| 7 | Employee Shift Assignments and Rosters | Apply shared form sections, compact tables, import and detail patterns | Effective-dated assignment, overlap validation, import preview and rollback restrictions | Focused browser/API tests |
| 8 | Holiday Calendars | Match catalog/table/form family and mobile actions | Calendar CRUD, date validation, tenant scope and downstream visibility | Browser/API and responsive evidence |
| 9 | Attendance Reports | Standardize report filter bars, summary panels, tables, exports and empty states | Filter semantics, pagination, report authorization and close-period read behavior | Report browser/API evidence |
| 10 | Tenant Admin attendance governance | Align navigation, policy visibility and read-only/management states | Existing permission keys, hidden menu overrides, tenant isolation | Tenant Admin smoke and API denial tests |

### Convergence checklist for every screen

- Shared Accerio shell, header, typography, spacing and semantic tokens.
- No page-specific duplicate component where an existing shared pattern applies.
- Consistent title, description, action order and status language.
- Compact filters with committed URL state, Apply/Reset and validation feedback.
- Loading, empty, error, retry, success and uncertain-outcome states.
- Mobile widths 320/390, tablet 768 and desktop 1440 without horizontal overflow.
- Keyboard order, focus visibility, dialog trapping/restoration and accessible names.
- Real API data only; unsupported actions visibly unavailable.
- Employee, manager, HR and tenant authorization checks.
- Closed attendance and payroll-integrity protections.
- Screenshots, traces, API results and synthetic cleanup recorded before moving on.

### Prioritization rule

Fix shared shell, filter, table, dialog or feedback defects once at the shared component level. Fix workflow or permission defects in the owning screen family. Do not accept a visual-only convergence change until the associated real workflow and negative authorization cases are exercised.
