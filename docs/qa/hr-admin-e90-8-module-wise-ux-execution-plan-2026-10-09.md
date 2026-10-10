# HR Admin E90-8 Module-wise UX Execution Plan

Date: 2026-10-09  
Parent phase: E90-8 UX Consistency Pass  
Prototype: [HR Admin compact operations prototype](../prototypes/hr-admin-compact-operations-prototype.html)  
Unified model: [HR Admin Unified UI/UX Model](./hr-admin-unified-ui-ux-model-e90-8-2026-10-09.md)

## Operating Rule

Work module by module. Do not move to the next module until the current module is implemented, browser-tested, documented, and marked `Complete`.

Each module phase must include:

- Scope and screen list.
- UX changes implemented.
- Browser QA evidence.
- Desktop and mobile no-horizontal-overflow checks.
- Modal/drawer checks where view/update was introduced.
- Remaining risks or follow-up notes.
- Final status.

## Shared UX Standard

Every module follows the same model:

- Compact page header.
- Small professional font scale.
- Dense filters.
- Proper pagination.
- Slim metrics only where useful.
- Queue-first design for operational work.
- Modal/drawer for quick view/update.
- Full page only for create/edit, import, deep audit, or reports.
- Friendly empty/error/read-only states.
- No horizontal overflow on desktop/tablet/mobile.

## Phase Plan

| Phase | Module | Primary screens | Status |
| --- | --- | --- | --- |
| E90-8A | Shared UI foundation | CSS tokens, compact primitives, modal/drawer primitives, pagination/filter patterns | Complete |
| E90-8B | Time & Leave operations | Attendance records, regularizations, leave requests, leave balances | Complete |
| E90-8C | Shift & Roster operations | Shifts, employee shift assignments, roster templates, rollout history | Complete |
| E90-8D | Payroll operations | Inputs, calculations, review, adjustments, outputs, handoff, readiness | Complete |
| E90-8E | Reports | Payroll input exceptions, close readiness, attendance derivation, leave collisions, roster audit, report hubs | Complete |
| E90-8F | Policy & setup | Policy masters, policy assignments, governance panels, import workbenches | Complete |
| E90-8G | HR Admin shell & navigation | HR Admin dashboard, nav/catalog, module hubs, cross-links | Complete |
| E90-8H | Final UX certification | Full HR Admin route audit, responsive sweep, gap list | Complete |

## E90-8A: Shared UI Foundation

### Scope

- Shared compact layout primitives.
- Shared modal/drawer pattern.
- Shared filter toolbar pattern.
- Shared pagination and empty-state patterns.
- Shared CSS tokens aligned with the prototype.

### Work Items

- Identify existing reusable components and CSS classes.
- Add compact variants instead of one-off page styling.
- Create or standardize modal/drawer shell for quick view/update.
- Standardize button/control heights and font sizes for HR Admin.
- Ensure primitives do not break existing pages.

### Browser QA

- Component usage smoke through one representative HR Admin page.
- Desktop and mobile overflow check.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Relevant browser smoke spec.
- Update this plan status to `Complete`.

### E90-8A Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Added the shared `hr-admin-compact-ui` foundation in `web/src/app/globals.css`.
- Standardized compact HR Admin density for page intros, metric tiles, workspace cards, controls, queue toolbars, record cards, pagination, report filters, and drawer surfaces.
- Added shared modal primitives for quick view/update workflows: `hr-admin-modal-backdrop`, `hr-admin-action-modal`, modal tabs, modal grids, and modal sections.
- Applied the compact foundation to `/hr-admin/policies` and `/hr-admin/policy-assignments` as representative HR Admin hub screens.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-compact-hubs-certification.spec.ts --workers=1` passed, 2/2.

Notes:

- This phase only created and applied the shared foundation. E90-8B onward will migrate operational pages module by module and validate each with browser-based QA before marking complete.

## E90-8B: Time & Leave Operations

### Scope

- `/hr-admin/attendance-records`
- `/hr-admin/attendance-regularizations`
- `/hr-admin/leave-requests`
- `/hr-admin/leave-balances`

### UX Goals

- Queue-first compact screens.
- View/update modals for record review, regularization decisions, leave decisions, and balance actions where practical.
- Dense filters and pagination.
- Compact metric strips.
- Low-scroll desktop layout.

### Browser QA

- Attendance record list/filter/action QA.
- Regularization decision modal QA.
- Leave request review modal QA.
- Leave balance action modal QA.
- Desktop and mobile no-horizontal-overflow.
- RBAC/read-only state where applicable.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Relevant backend check/tests if APIs change.
- Playwright QA for Time & Leave screens.
- Mark E90-8B complete before E90-8C.

### E90-8B Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to `/hr-admin/attendance-records`, `/hr-admin/attendance-regularizations`, `/hr-admin/leave-requests`, and `/hr-admin/leave-balances`.
- Added compact Time & Leave overrides for the operations strip, queue toolbar, queue cards, detail grids, notices, import panels, and action areas.
- Preserved single-responsibility page structure: records, regularizations, leave requests, and balances remain separate operational pages.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `attendance-records-slim-options-qa.spec.ts` passed, 1/1.
- Browser QA: `hr-admin-attendance-operations-workflow-certification.spec.ts -g "attendance operations hub|regularization queue"` passed, 2/2.
- Browser QA: `hr-admin-leave-request-operations-certification.spec.ts` passed, 2/2.
- Browser QA: `leave-balance-import-flows.spec.ts` passed, 1/1 on isolated Playwright port 3101.

Notes:

- A grouped browser run on port 3100 hit frontend server lifecycle failures after the first spec. Re-running the affected specs on fresh/isolated Playwright ports passed without product assertions failing.

## E90-8C: Shift & Roster Operations

### Scope

- `/hr-admin/shifts`
- `/hr-admin/employee-shift-assignments`
- `/hr-admin/shift-roster-templates`
- Roster rollout panel/history.

### UX Goals

- Compact list pages.
- Modal/drawer for assignment conflict preview and rollout preview.
- Keep create/edit forms as full pages.
- Keep rollout history paginated and compact.

### Browser QA

- Shift list responsive QA.
- Shift assignment filters/pagination/modal QA.
- Roster template filters/pagination/rollout modal QA.
- Rollout history pagination QA.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Relevant backend check/tests if APIs change.
- Playwright QA for Shift & Roster screens.
- Mark E90-8C complete before E90-8D.

### E90-8C Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to `/hr-admin/shifts`, `/hr-admin/employee-shift-assignments`, and `/hr-admin/shift-roster-templates`.
- Added compact roster/shift overrides for form grids, field hints, toggle rows, action bars, and rollout history details.
- Preserved full-page create/edit forms while keeping list, filter, pagination, and rollout history screens compact.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `PLAYWRIGHT_PORT=3101 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/roster-shift-operations-compact-qa.spec.ts --workers=1` passed, 1/1.

## E90-8D: Payroll Operations

### Scope

- `/hr-admin/payroll-inputs`
- `/hr-admin/payroll-calculations`
- `/hr-admin/payroll-review`
- `/hr-admin/payroll-adjustments`
- `/hr-admin/payroll-outputs`
- `/hr-admin/payroll-handoff`
- `/hr-admin/payroll-readiness`

### UX Goals

- Compact payroll control screens.
- Modal/drawer for exception decisions, adjustment evidence, post-lock impacts, and provider/handoff evidence.
- Keep heavy evidence lazy-loaded.
- Preserve compact payload work from E90-1 to E90-3.

### Browser QA

- Payroll inputs compact/detail QA.
- Calculation/review modal QA.
- Adjustment/post-lock modal QA.
- Output/handoff evidence QA.
- Readiness responsive QA.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Relevant backend check/tests if APIs change.
- Playwright QA for Payroll screens.
- Mark E90-8D complete before E90-8E.

### E90-8D Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to payroll inputs, calculations, review, adjustments, outputs, handoff, and readiness.
- Added compact payroll overrides for payroll setup panels, cards, pagination, tables, and empty states.
- Preserved existing payroll evidence and detail flows while making the operational surfaces slimmer and more consistent.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA batch 1: `payroll-inputs-flows.spec.ts`, `payroll-calculations-flows.spec.ts`, and `payroll-review-flows.spec.ts` passed, 8/8.
- Browser QA batch 2: `payroll-adjustments-flows.spec.ts`, `payroll-outputs-flows.spec.ts`, `payroll-handoff-flows.spec.ts`, and `payroll-readiness-flows.spec.ts` passed, 8/8.

## E90-8E: Reports

### Scope

- `/hr-admin/reports`
- `/hr-admin/reports/payroll-input-exceptions`
- `/hr-admin/reports/payroll-close-readiness`
- `/hr-admin/reports/attendance-derivation-exceptions`
- `/hr-admin/reports/leave-attendance-collisions`
- `/hr-admin/reports/roster-rollout-audit`
- Other report hub pages touched by navigation.

### UX Goals

- Report pages stay evidence-focused.
- Compact filters and metrics.
- Export CSV, Manifest, Print consistent across reports.
- No mutation controls inside reports.
- Clear drilldowns back to source pages.

### Browser QA

- Report filter/export/manifest QA.
- Print button smoke where available.
- Employee RBAC negative checks.
- Desktop and mobile overflow checks.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Playwright report certification specs.
- Mark E90-8E complete before E90-8F.

### E90-8E Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to the report catalog, attendance report hub, payroll input exceptions, payroll close readiness, attendance derivation exceptions, leave-attendance collisions, roster rollout audit, leave balance, and payroll adjustments report pages.
- Added compact report overrides for report workspaces, command panels, filter panels, catalog summary, tables, row actions, category tabs, and pagination.
- Fixed leave balance report export compatibility with the current paginated leave balance response envelope.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed before and after the export compatibility fix.
- Browser QA full report batch passed 13/14 before the leave balance export compatibility fix.
- Browser QA rerun: `leave-balance-report-certification.spec.ts` passed, 2/2.
- Covered report specs: payroll input exceptions, payroll close readiness, attendance derivation exceptions, leave-attendance collisions, roster rollout audit, leave balance, and payroll adjustments.

## E90-8F: Policy & Setup

### Scope

- Leave policies and assignments.
- Attendance policies and assignments.
- Shifts/policy options where shared.
- Import workbenches.
- Governance panels.

### UX Goals

- Compact list pages.
- Full page create/edit forms.
- Modal/drawer only for conflict preview or quick inspection.
- Consistent governance/read-only states.
- Consistent import preview layout.

### Browser QA

- Policy list/filter QA.
- Assignment form/create/edit QA.
- Conflict preview modal QA.
- Import workbench QA.
- RBAC/read-only QA.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Relevant backend check/tests if APIs change.
- Playwright policy/setup specs.
- Mark E90-8F complete before E90-8G.

### E90-8F Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to leave types, leave policies, attendance policies, leave policy assignments, attendance policy assignments, and their create/edit pages.
- Added compact setup overrides for form sections, governance panels, platform governance notices, and import workbench previews.
- Kept create/edit as full pages while making controls, sections, governance hints, and import areas slimmer and consistent.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `hr-admin-setup-policy-frontend-validation.spec.ts` plus `hr-admin-time-leave-policy-ui-audit.spec.ts` passed, 14/14.

## E90-8G: HR Admin Shell & Navigation

### Scope

- `/hr-admin`
- HR Admin module hubs.
- Sidebar/navigation catalog.
- Cross-links between operations and reports.

### UX Goals

- Compact HR Admin landing page.
- Clear module grouping.
- No dead or duplicate navigation paths.
- Consistent labels.
- Professional shell across desktop/tablet/mobile.

### Browser QA

- HR Admin dashboard responsive QA.
- Navigation route audit.
- No-horizontal-overflow sweep for major hubs.
- Permission-aware navigation checks.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- Playwright navigation/hub audit.
- Mark E90-8G complete before E90-8H.

### E90-8G Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Applied the shared `hr-admin-compact-ui` foundation to the HR Admin dashboard.
- Added compact dashboard overrides for action queues, readiness rows, launch audit, guardrails, evidence chips, and workspace grids.
- Preserved existing permission-aware navigation semantics and commercial scope gating.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `hr-admin-shell-phase2-certification.spec.ts` and `hr-admin-compact-hubs-certification.spec.ts` passed, 5/5.

## E90-8H: Final UX Certification

### Scope

- Full HR Admin route sweep.
- Cross-module responsive audit.
- Final gap list.
- Update E90 tracker.

### Browser QA

- Desktop route audit.
- Mobile route audit.
- No-horizontal-overflow checks.
- Modal open/close checks on representative queues.
- Report export smoke.

### Completion Gate

- All previous E90-8 phases complete.
- `pnpm --dir web exec tsc --noEmit`
- Final Playwright route audit passes.
- Document remaining gaps.
- Mark E90-8 complete in the enterprise phase tracker.

### E90-8H Completion Record

Status: Complete on 2026-10-09.

Implementation:

- Added `hr-admin-e90-8-final-ux-certification.spec.ts` as the final phase browser certification.
- Certified representative desktop routes across dashboard, Time & Leave, Shift/Roster, Payroll, Reports, and Policy/Setup.
- Certified representative mobile routes for dashboard, leave operations, payroll review, and payroll input exceptions report.
- Certified representative report export and manifest access from compact report pages.

Verification:

- Backend check: `../.venv/bin/python manage.py check` passed.
- Frontend type check: `pnpm --dir web exec tsc --noEmit` passed.
- Browser QA: `hr-admin-e90-8-final-ux-certification.spec.ts` passed, 3/3.

Remaining gaps:

- The final certification is representative, not every HR Admin route in the navigation catalog. E90-9 should expand RBAC and tenant-isolation coverage before launch certification.
- Some legacy setup/report pages outside the roster, leave, attendance, payroll, policy, and report scope may still need individual UX polish during E90-9/E90-10 if they become launch-critical.
- Browser QA uses isolated Playwright port `3101` because long grouped dev-server runs on `3100` showed lifecycle instability earlier in the pass.

## Execution Log

| Date | Phase | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-09 | E90-8 Plan | Created | This document | Module-wise UX execution plan created before implementation. |
| 2026-10-09 | E90-8A | Complete | Django check, `tsc`, `hr-admin-compact-hubs-certification.spec.ts` 2/2 passed | Shared compact HR Admin UI foundation added and applied to policy hub screens. |
| 2026-10-09 | E90-8B | Complete | Django check, `tsc`, attendance records 1/1 passed, attendance operations/regularizations 2/2 passed, leave requests 2/2 passed, leave balance import 1/1 passed | Time & Leave operation pages adopted the compact HR Admin foundation with tighter operation strips, queues, detail grids, notices, and import panels. |
| 2026-10-09 | E90-8C | Complete | Django check, `tsc`, `roster-shift-operations-compact-qa.spec.ts` 1/1 passed | Shift and roster operation pages adopted the compact foundation with tighter forms, filters, rollout panel, and rollout history. |
| 2026-10-09 | E90-8D | Complete | Django check, `tsc`, payroll inputs/calculations/review 8/8 passed, adjustments/outputs/handoff/readiness 8/8 passed | Payroll operation pages adopted the compact foundation with tighter panels, pagination, tables, cards, and empty states. |
| 2026-10-09 | E90-8E | Complete | Django check, `tsc`, report batch 13/14 passed, leave balance report rerun 2/2 passed | Report catalog and cross-module reports adopted the compact foundation; leave balance export now supports paginated source envelopes. |
| 2026-10-09 | E90-8F | Complete | Django check, `tsc`, policy/setup validation and audit specs 14/14 passed | Policy/setup pages adopted the compact foundation with tighter forms, governance panels, and import workbench previews. |
| 2026-10-09 | E90-8G | Complete | Django check, `tsc`, shell/navigation and compact hub specs 5/5 passed | HR Admin dashboard adopted the compact foundation with tighter action queues, launch audit, guardrails, evidence chips, and workspace grids. |
| 2026-10-09 | E90-8H | Complete | Django check, `tsc`, final HR Admin UX certification 3/3 passed | Final representative desktop/mobile route sweep and report export smoke passed; remaining gaps documented for E90-9/E90-10. |
