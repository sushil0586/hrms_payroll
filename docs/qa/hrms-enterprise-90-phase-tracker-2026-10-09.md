# HRMS Enterprise 90 Phase Tracker

Date started: 2026-10-09  
Scope: roster, shift, leave, attendance, payroll, reports, and the HR Admin/ESS/MSS workflows that support them.

## Operating Rules

- Build phase by phase. Do not mark a phase complete until implementation and browser-based Playwright QA both pass.
- Keep every page single-responsibility. Setup pages configure, queue pages review, detail pages inspect evidence, reports explain/export.
- Keep UI modern, slim, compact, and operational. Prefer dense readable controls, proper filters, pagination, and clear empty states.
- Avoid broad page-load payloads. Use server pagination, async employee search, lazy detail fetch, and scoped options.
- Use browser workflows for QA and realistic mutation paths. Bulk setup should be mostly bulk upload/API-through-browser, not backend seed shortcuts.
- Preserve RBAC, tenant isolation, audit evidence, lock-state protections, and import history.

## Completion Gate For Every Phase

Each phase must record:

- Implementation summary.
- Backend verification.
- Frontend/type verification.
- Browser Playwright QA command and result.
- Payload observations for any page/data endpoint touched.
- Remaining risks or follow-up phases.
- Final status: `Not started`, `In progress`, `QA pending`, `Complete`, or `Blocked`.

## Phase Plan

| Phase | Area | Objective | Status |
| --- | --- | --- | --- |
| E90-0 | Baseline tracker | Create this tracker and enforce phase gates. | Complete |
| E90-1 | Payroll Inputs | Split payroll input list payload from detail evidence; keep employee selection lazy. | Complete |
| E90-2 | Payroll Calculations and Review | Slim calculation/review setup payloads, paginate exception rows, certify review actions. | Complete |
| E90-3 | Payroll Outputs, Handoff, Adjustments | Slim output/handoff/adjustment pages, async employee lookup, proper filters and pagination. | Complete |
| E90-4 | Attendance Records and Regularizations | Finish time queue payloads, filters, imports, lock-state and post-lock impact UX. | Complete |
| E90-5 | Leave Requests, Balances, Policies | Finish leave operations pagination, detail drilldowns, import history, policy assignment UX. | Complete |
| E90-6 | Roster and Shift Operations | Roster templates, rollout audit, shift assignments, coverage filters, compact rollout QA. | Complete |
| E90-7 | Cross-module Reports | Payroll input exceptions, close readiness, attendance derivation, leave-attendance collisions, roster rollout audit. | Complete |
| E90-8 | UX Consistency Pass | Page responsibility, compact layouts, filters, pagination, empty states, mobile overflow. | Complete |
| E90-9 | Enterprise Guardrails | RBAC negatives, tenant isolation, audit history, import evidence, locked-state protections. | Not started |
| E90-10 | 100-Employee Certification | Realistic 100-employee scenario, mostly bulk upload, browser QA, final gap list. | Not started |

## Phase E90-0: Baseline Tracker

### Objective

Create one authoritative tracker for this enterprise-grade pass.

### Work Items

- Document operating rules.
- Define phase completion gate.
- Define phase sequence.

### QA Requirement

Documentation-only phase. No browser QA required because this phase changed only the tracker.

### Status

Complete.

## Phase E90-1: Payroll Inputs Payload Split

### Objective

Make `/hr-admin/payroll-inputs` operational at enterprise data volume by separating list data from full snapshot evidence.

### Current Observations

- Default payroll input setup has already stopped preloading employee options.
- Employee picker is lazy and uses `/api/hr-admin/employees/option-search`.
- Remaining large payload is snapshot/run evidence, not employee options.
- Latest observed setup payloads:
  - `snapshot_page_size=10`: about `389KB`.
  - unpaged/default setup request from QA helper: about `850KB`.
  - lazy employee search: about `5KB`.

### Work Items

- Add compact payroll input snapshot list payload for setup/list endpoints.
- Keep full source families on the snapshot detail endpoint only.
- Make the frontend fetch full snapshot detail only when a snapshot is selected.
- Keep run rail and lock-readiness metrics available without full source evidence.
- Ensure manual snapshot editing still receives full JSON evidence when editing an existing snapshot.
- Update Playwright QA to assert compact setup payload and lazy detail fetch.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `payroll-inputs-flows.spec.ts`
  - payload assertion for compact setup/list
  - lazy detail assertion for selected snapshot
  - no horizontal overflow

### Implementation Summary

- Added a compact payroll input snapshot list serializer for setup/list responses.
- Kept the existing payroll input snapshot detail endpoint as the full evidence source.
- Updated `/hr-admin/payroll-inputs` to render compact list rows by default and show detail evidence only after a snapshot is selected.
- Kept employee selection lazy through async employee search.
- Updated payroll input exception and close-readiness report consumers to use compact-safe reconciliation metrics.
- Updated adjustment and settlement controls to accept compact snapshot rows.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-inputs-flows.spec.ts --workers=1` passed, 2/2.

### Payload Observations

- Payroll input setup with `snapshot_page_size=10`: about `94KB`, down from about `389KB`.
- Default payroll input setup QA request: about `113KB`, down from about `850KB`.
- Full snapshot detail endpoint remains available on demand: about `30KB` for the sampled snapshot.
- Lazy employee search remains compact: about `5.3KB`.

### Status

Complete.

## Phase E90-2: Payroll Calculations and Review

### Objective

Make payroll calculation and review workspaces enterprise-volume friendly by narrowing setup payloads, paging rail/detail evidence, and certifying review action UX in browser QA.

### Current Observations

- Calculation setup was still carrying heavy rule and line evidence into the first page load.
- Review setup was carrying broader calculation/run context than the queue needed.
- Browser QA initially showed calculation setup still too large after run pagination alone: about `416KB`, above the `350KB` target.

### Work Items

- Add server-side run pagination to payroll calculation setup.
- Load active rule versions only when explicitly requested.
- Reduce default calculation and review line/exception page sizes to `25`.
- Return compact calculation line rows in calculation/review setup payloads.
- Keep review setup scoped to the selected/visible calculations and related runs.
- Update payroll calculation, payroll review, salary variance report, and report export consumers for compact line rows.
- Extend Playwright tests with compact payload assertions and browser UX checks.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `payroll-calculations-flows.spec.ts`
  - `payroll-review-flows.spec.ts`
  - compact setup payload assertions
  - desktop, mobile, history, validation/error recovery flows

### Implementation Summary

- Payroll calculation setup now supports `run_page`, `run_page_size`, and opt-in `include_rule_versions`.
- Calculation and review setup responses use compact calculation line list rows instead of full trace/config/result snapshots.
- Review setup now returns only the calculation/run context needed by the visible queue and selected review.
- Pagination controls now use server/client `totalPages` instead of visible-row count, so compact pages do not hide navigation incorrectly.
- Salary variance report UI/export now accepts compact calculation line rows.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-calculations-flows.spec.ts tests/e2e/payroll-review-flows.spec.ts --workers=1` passed, 6/6.

### Payload Observations

- Calculation setup compact request now stays under the `350KB` Playwright gate.
- Review setup compact request stays under the `350KB` Playwright gate.
- Calculation setup no longer sends active rule versions unless `include_rule_versions=true`.
- Full calculation line trace/config snapshots are intentionally not included in setup rows; a later detail endpoint can restore deep trace drilldown without regrowing the initial payload.

### Status

Complete.

## Phase E90-3: Payroll Outputs, Handoff, Adjustments

### Objective

Keep payroll output, finance handoff, and adjustment workspaces usable at enterprise volume with compact setup payloads, scoped evidence lanes, and browser-certified desktop/mobile UX.

### Current Observations

- Payroll output and finance handoff setup already had server pagination for their major evidence lanes.
- Payroll adjustment setup still loaded full input snapshot evidence, up to 200 snapshots/adjustments, and eager employee options.
- Adjustment actions only need locked snapshot list rows for the selected run, not full payroll input evidence.

### Work Items

- Add adjustment setup query params for selected run scoping and page sizes.
- Return compact payroll input snapshot list rows from adjustment setup.
- Add adjustment setup pagination metadata for snapshots, adjustments, and post-lock impacts.
- Remove eager employee option loading from adjustment setup; employee selection remains handled through existing lazy employee search patterns where needed.
- Keep explicit all-runs mode for reports that need broader adjustment evidence.
- Scope handoff provider lanes to UI page sizes and compact provider evidence rows.
- Extend adjustment browser QA with compact payload assertions.
- Re-run output and handoff browser QA to certify existing pagination/evidence lanes remain stable.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `payroll-adjustments-flows.spec.ts`
  - `payroll-outputs-flows.spec.ts`
  - `payroll-handoff-flows.spec.ts`
  - compact adjustment setup payload assertion
  - desktop, mobile, history, and action failure recovery flows

### Implementation Summary

- Payroll adjustment setup now supports `run_id`, `include_all_runs`, `snapshot_page_size`, `adjustment_page_size`, and `post_lock_page_size`.
- Adjustment setup now returns compact snapshot rows and paged post-lock impacts.
- Adjustment setup no longer sends the full employee option list by default.
- Payroll adjustment page scopes setup to the selected run when present.
- Payroll adjustment reports, close-readiness reports, and time-to-payroll views explicitly request all-run adjustment evidence.
- Adjustment API proxy now forwards query params so browser QA can validate compact payloads through the real frontend route.
- Payroll handoff now sends backend provider lane page sizes that match the compact UI and omits heavy provider request/response/security snapshots from setup rows.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-adjustments-flows.spec.ts tests/e2e/payroll-outputs-flows.spec.ts tests/e2e/payroll-handoff-flows.spec.ts --workers=1` passed, 7/7.

### Payload Observations

- Adjustment setup compact request with `snapshot_page_size=10`, `adjustment_page_size=10`, and `post_lock_page_size=10` stays under the `350KB` Playwright gate.
- Adjustment setup caps returned snapshots, adjustments, and post-lock impacts to the requested page sizes.
- Adjustment setup now returns `options.employees: []`, avoiding eager employee option payloads.
- Handoff default browser setup fell from about `1.7MB` to about `208KB` after lane page-size scoping and compact provider evidence rows.
- Handoff mobile one-row lane setup is about `193KB`.
- Output setup remains about `217KB` with `batch_page_size=8` and `artifact_page_size=8`.

### Status

Complete.

## Phase E90-4: Attendance Records and Regularizations

### Objective

Complete the HR-admin attendance record and regularization workspaces so time data is compact, filterable, import-ready, and browser-certified before it feeds payroll.

### Current Observations

- Attendance record and regularization lists were already server-paginated.
- Attendance workbench options were already slim and avoided eager employee preloading.
- Attendance records had status/source/date/lock/regularization filters, but not an explicit shift filter.
- Regularizations had status filters and search, but not explicit date-range filtering.

### Work Items

- Add backend `shift_id` filtering to HR-admin attendance records.
- Add backend `from_date` and `to_date` filtering to HR-admin attendance regularizations.
- Add a compact, accessible shift filter to the attendance records toolbar.
- Add date range filters to the regularization queue.
- Extend browser QA to assert compact list payloads, slim options, shift filtering, date-filtered regularization payloads, and async employee resolution during attendance import preview.
- Re-run attendance operations browser QA for bulk lock/unlock/status/regularized actions, network recovery, regularization inline rejection, full approval, and read-only terminal states.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `attendance-records-slim-options-qa.spec.ts`
  - `phase4c-hr-admin-operations-flows.spec.ts -g "attendance"`
  - compact payload assertions
  - import preview async employee resolution
  - bulk action and regularization approval/rejection flows

### Implementation Summary

- Attendance record API now supports `shift_id`.
- Attendance regularization API now supports `from_date` and `to_date`.
- Attendance records UI now exposes an accessible shift filter.
- Regularization queue now exposes date-range filters.
- Attendance QA now verifies compact records/regularization payloads and slim options through browser-driven requests.
- Existing attendance operations QA was adjusted to use case-insensitive status assertions so the modern title-cased UI remains stable.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/attendance-records-slim-options-qa.spec.ts --workers=1` passed, 1/1.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/phase4c-hr-admin-operations-flows.spec.ts -g "attendance" --workers=1` passed, 4/4.

### Payload Observations

- Attendance workbench options with shifts stay under the `25KB` Playwright gate and do not preload employees.
- Attendance records list with `page_size=1` stays under the `80KB` Playwright gate.
- Attendance regularizations list with `page_size=10` stays under the `120KB` Playwright gate.
- Employee resolution during attendance import preview continues through async employee option search and stays under the `10KB` Playwright gate.

### Status

Complete.

## Phase E90-5: Leave Requests, Balances, Policies

### Objective

Complete the HR-admin leave request, leave balance, and leave policy workspaces so leave operations are compact, reviewable, import-ready, and browser-certified.

### Current Observations

- Leave request, balance, transaction, and policy workbench endpoints already used paginated shapes.
- Leave balance action forms needed visible employee options from the current page while preserving async employee search for broader lookup.
- Leave balance metric labels had drifted from the enterprise QA contract.
- The frontend leave request API route handled mutations but did not proxy GET requests for RBAC-negative browser checks.

### Work Items

- Restore professional leave balance metric labels for encashment, adjustments, and pending reviews.
- Keep the leave balance employee selector compact by seeding only current-page employee options and retaining lazy search.
- Update leave balance import QA to read paginated API responses.
- Add frontend GET proxying for leave requests so browser RBAC checks exercise the real backend permission response.
- Re-run leave request, balance, import, and policy browser QA.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `phase4c-hr-admin-operations-flows.spec.ts -g "leave balance"`
  - `hr-admin-leave-request-operations-certification.spec.ts`
  - `leave-balance-import-flows.spec.ts`
  - `hr-admin-time-leave-policy-ui-audit.spec.ts`

### Implementation Summary

- Leave balance dashboard labels now expose `Encashed units`, `Net adjustments`, and `Pending reviews`.
- Leave balance operations now pass current-page employee options into the shared employee search select while keeping async search behavior.
- Shared employee search select now accepts optional initial options and preserves the compact lazy lookup pattern.
- Leave balance import QA now consumes paginated `items` responses.
- HR Admin leave request frontend API now proxies GET requests to the backend, allowing browser-level RBAC negative checks.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/phase4c-hr-admin-operations-flows.spec.ts -g "leave balance" --workers=1` passed, 1/1.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-leave-request-operations-certification.spec.ts tests/e2e/leave-balance-import-flows.spec.ts --workers=1` passed, 3/3.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/hr-admin-time-leave-policy-ui-audit.spec.ts --workers=1` passed, 5/5.

### Payload Observations

- Leave balances list at `page_size=12` is about `7KB`.
- Leave balance transactions at `page_size=12` are about `10KB`.
- Policy workbench options with leave policies included are about `7KB`.
- Employee selection remains scoped to visible leave balance rows initially, with broader lookup handled by async search.

### Status

Complete.

## Phase E90-6: Roster and Shift Operations

### Objective

Complete the HR-admin roster template, shift assignment, rollout history, and rollout audit surfaces so roster operations stay compact, paginated, and browser-certified before they feed attendance and payroll.

### Current Observations

- Shift assignment and roster template queues already had filters and paginated list responses.
- Roster rollout history was still returned as a flat recent array and rendered directly in the rollout panel.
- Roster rollout audit exports and time-to-payroll controls consumed rollout history as an array, so they needed explicit evidence-page requests after pagination.
- Existing roster workflow QA depended on local seeded target options and could skip when those options were unavailable.

### Work Items

- Convert HR-admin shift roster rollout history to a paginated response.
- Include rollout `scope_labels` in the serialized rollout history rows.
- Request a small rollout history page from the roster template page and render compact pagination inside the rollout panel.
- Keep report/export and time-to-payroll consumers on explicit broader rollout evidence pages.
- Add browser QA for compact shift assignment, roster template, and rollout history payloads through authenticated app routes.
- Re-run rollout audit report/export/RBAC QA.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `roster-shift-operations-compact-qa.spec.ts`
  - `roster-rollout-audit-report-certification.spec.ts` HR-admin/export path
  - `roster-rollout-audit-report-certification.spec.ts` employee RBAC path

### Implementation Summary

- `hr-admin/shift-roster-rollouts` now returns a paginated envelope with `items`, `page`, `page_size`, `total_count`, and `total_pages`.
- Roster rollout rows now include `scope_labels` in the serializer.
- Roster template page now requests rollout history with `rollout_page` and `rollout_page_size`, defaulting to a slim history page.
- Roster rollout panel now shows compact rollout history pagination without nesting a card inside the rollout panel.
- Shift assignment, roster template, and roster rollout app API routes now support GET proxying for authenticated browser QA.
- Roster rollout audit report and time-to-payroll views explicitly request larger rollout evidence pages where broader reporting context is required.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/roster-shift-operations-compact-qa.spec.ts --workers=1` passed, 1/1.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/roster-rollout-audit-report-certification.spec.ts -g "HR admin" --workers=1` passed, 1/1.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/roster-rollout-audit-report-certification.spec.ts -g "employee cannot" --workers=1` passed, 1/1.
- Existing workflow QA: `hr-admin-attendance-operations-workflow-certification.spec.ts -g "shift assignment inspector"` skipped because this local dataset did not expose the required employee/rollout target options.

### Payload Observations

- Shift assignment list at `page_size=3` is about `2.6KB`.
- Roster template list at `page_size=3` is about `1.6KB`.
- Roster rollout history at `page_size=2` is about `1KB`.
- Roster template page workbench options for rollout scoping are about `18.6KB`.

### Status

Complete.

## Phase E90-7: Cross-module Reports

### Objective

Certify the cross-module report layer that connects roster, leave, attendance, and payroll evidence into payroll close readiness, exception triage, export evidence, and RBAC-controlled reporting.

### Current Observations

- Attendance derivation exceptions, leave-attendance collisions, payroll input exceptions, payroll close readiness, roster rollout audit, and time-to-payroll control pages already existed.
- Attendance derivation and leave-attendance collision reports were browser-certified without implementation changes.
- Payroll close readiness was browser-certified without implementation changes.
- Payroll input exceptions still loaded the broad `/hr-admin/payroll-input-snapshots/` list on first page load, about `1.7MB`, despite compact setup rows being available.
- Time-to-payroll control already links roster, leave, attendance, payroll input, and payroll close evidence and needed browser certification across desktop/tablet/mobile.

### Work Items

- Reuse compact payroll input setup snapshot rows on the payroll input exceptions report page.
- Re-run payroll input exceptions export, manifest, audit, pagination, filter, and employee RBAC QA.
- Re-run attendance derivation exceptions report export/manifest/RBAC QA.
- Re-run leave-attendance collision report export/manifest/RBAC QA.
- Re-run payroll close readiness report export/manifest/audit/RBAC QA.
- Re-run time-to-payroll control journey, RBAC, tablet, and mobile QA.
- Carry forward roster rollout audit report evidence from E90-6 as part of the cross-module report layer.

### Completion Gate

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `../.venv/bin/python manage.py test apps.common.tests --keepdb`
- Browser QA:
  - `attendance-derivation-exceptions-report-certification.spec.ts`
  - `leave-attendance-collisions-report-certification.spec.ts`
  - `payroll-close-readiness-report-certification.spec.ts`
  - `payroll-input-exceptions-report-certification.spec.ts`
  - `time-to-payroll-control-certification.spec.ts`
  - roster rollout audit evidence from E90-6

### Implementation Summary

- Payroll input exceptions report now uses `getHrAdminPayrollInputSnapshotSetup()` for both runs and compact snapshot rows.
- Removed the broad unpaged payroll input snapshot list request from the payroll input exceptions page.
- Cross-module reports retain export, manifest, checksum, export-audit, drilldown, pagination, filter, print, and RBAC coverage through existing report workspaces.

### Verification

- Frontend/type check: `pnpm --dir web exec tsc --noEmit` passed.
- Backend system check: `../.venv/bin/python manage.py check` passed.
- Backend tests: `../.venv/bin/python manage.py test apps.common.tests --keepdb` passed, 17/17.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts tests/e2e/leave-attendance-collisions-report-certification.spec.ts ... --workers=1` passed the attendance and leave report specs, 4/4, before the frontend server dropped during the next grouped spec startup.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-close-readiness-report-certification.spec.ts --workers=1` passed, 2/2.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/payroll-input-exceptions-report-certification.spec.ts --workers=1` passed, 2/2.
- Browser QA: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 HRMS_API_BASE_URL=http://localhost:8001/api/v1 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1` passed, 4/4.
- Roster rollout audit report was certified in E90-6: HR-admin/export 1/1 and employee RBAC 1/1 passed.

### Payload Observations

- Payroll input exceptions page no longer calls broad `/hr-admin/payroll-input-snapshots/`, previously about `1.7MB`.
- Payroll input exception setup remains about `114KB`.
- Attendance derivation report source request with `page_size=500` is about `143KB`.
- Leave-attendance collision report source request with `page_size=500` is about `162KB`.
- Payroll close readiness still depends on several broader payroll evidence requests for export-level coverage, including payroll settlement setup; this remains acceptable for report/export paths but should stay out of routine operational pages.

### Status

Complete.

## Phase Execution Log

| Date | Phase | Result | Evidence | Notes |
| --- | --- | --- | --- | --- |
| 2026-10-09 | E90-0 | Complete | This document; `git diff --check -- docs/qa/hrms-enterprise-90-phase-tracker-2026-10-09.md` | Created phase tracker and completion gate. Documentation-only; browser QA not required. |
| 2026-10-09 | E90-1 | Complete | `tsc`, Django check, common tests, `payroll-inputs-flows.spec.ts` 2/2 passed | Payroll input setup/list now compact; full source evidence moved to detail fetch. |
| 2026-10-09 | E90-2 | Complete | `tsc`, Django check, common tests, `payroll-calculations-flows.spec.ts` + `payroll-review-flows.spec.ts` 6/6 passed | Calculation/review setup payloads compacted with run paging, opt-in rule versions, scoped review context, and compact calculation line rows. |
| 2026-10-09 | E90-3 | Complete | `tsc`, Django check, common tests, `payroll-adjustments-flows.spec.ts` + `payroll-outputs-flows.spec.ts` + `payroll-handoff-flows.spec.ts` 7/7 passed | Adjustment setup compacted with run scoping, paged snapshots/adjustments/post-lock impacts, no eager employees; output/handoff workspaces re-certified. |
| 2026-10-09 | E90-4 | Complete | `tsc`, Django check, common tests, `attendance-records-slim-options-qa.spec.ts` 1/1 passed, `phase4c-hr-admin-operations-flows.spec.ts -g "attendance"` 4/4 passed | Attendance records gained shift filtering; regularizations gained date filters; compact payloads, import preview, bulk actions, and regularization decisions certified. |
| 2026-10-09 | E90-5 | Complete | `tsc`, Django check, common tests, leave balance operations 1/1 passed, leave request/import 3/3 passed, policy UI audit 5/5 passed | Leave balances restored enterprise labels, current-page employee options, paginated import QA, and leave request GET proxy for browser RBAC checks. |
| 2026-10-09 | E90-6 | Complete | `tsc`, Django check, common tests, roster/shift compact QA 1/1 passed, rollout audit HR-admin 1/1 passed, rollout audit employee RBAC 1/1 passed | Roster rollout history is paginated; rollout panel shows compact history controls; report/time-to-payroll consumers request broader evidence explicitly. |
| 2026-10-09 | E90-7 | Complete | `tsc`, Django check, common tests, attendance/leave reports 4/4 passed, payroll close readiness 2/2 passed, payroll input exceptions 2/2 passed, time-to-payroll 4/4 passed, roster rollout audit carried from E90-6 | Cross-module report layer certified; payroll input exceptions first-load payload now uses compact setup rows instead of the broad snapshot list. |
| 2026-10-09 | E90-8A | Complete | Django check, `tsc`, `hr-admin-compact-hubs-certification.spec.ts` 2/2 passed | Shared compact HR Admin UI foundation created for page intros, controls, cards, queues, pagination, report filters, drawers, and quick view/update modals; applied to policy hub screens. |
| 2026-10-09 | E90-8B | Complete | Django check, `tsc`, attendance records 1/1 passed, attendance operations/regularizations 2/2 passed, leave requests 2/2 passed, leave balance import 1/1 passed | Time & Leave operation pages adopted the compact HR Admin foundation with tighter operation strips, queues, detail grids, notices, and import panels. |
| 2026-10-09 | E90-8C | Complete | Django check, `tsc`, `roster-shift-operations-compact-qa.spec.ts` 1/1 passed | Shift and roster operation pages adopted the compact foundation with tighter forms, filters, rollout panel, and rollout history. |
| 2026-10-09 | E90-8D | Complete | Django check, `tsc`, payroll inputs/calculations/review 8/8 passed, adjustments/outputs/handoff/readiness 8/8 passed | Payroll operation pages adopted the compact foundation with tighter panels, pagination, tables, cards, and empty states. |
| 2026-10-09 | E90-8E | Complete | Django check, `tsc`, report batch 13/14 passed, leave balance report rerun 2/2 passed | Report catalog and cross-module reports adopted the compact foundation; leave balance export now supports paginated source envelopes. |
| 2026-10-09 | E90-8F | Complete | Django check, `tsc`, policy/setup validation and audit specs 14/14 passed | Policy/setup pages adopted the compact foundation with tighter forms, governance panels, and import workbench previews. |
| 2026-10-09 | E90-8G | Complete | Django check, `tsc`, shell/navigation and compact hub specs 5/5 passed | HR Admin dashboard adopted the compact foundation with tighter action queues, launch audit, guardrails, evidence chips, and workspace grids. |
| 2026-10-09 | E90-8H / E90-8 | Complete | Django check, `tsc`, final HR Admin UX certification 3/3 passed | E90-8 UX consistency pass complete; final representative desktop/mobile route sweep and report export smoke passed, with E90-9/E90-10 gaps documented. |
