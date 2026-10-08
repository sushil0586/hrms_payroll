# Time, Attendance, Leave, Roster, And Payroll Schedule Spine Plan

Date: 2026-10-08  
Owner: HR Admin, Attendance, Leave, Payroll, ESS, MSS, QA  
Goal: make shifts, rosters, attendance, leave, and payroll consume one shared employee/date schedule truth, with browser-certified UX at every phase.

## Product Principle

The app must always answer this question consistently:

> For employee X on date Y, what was expected, what actually happened, and how should it affect leave, attendance, and payroll?

Today the system already has strong building blocks: shifts, employee shift assignments, weekly rotations, temporary overrides, attendance policies, holidays, leave unit breakdowns, and payroll attendance snapshots. The next hardening step is to formalize one shared resolver contract and make every module consume it instead of letting each module infer working days differently.

## Shared Work-Day Contract

Every employee/date resolution should return a stable payload:

| Field | Purpose |
| --- | --- |
| `employee_id` | Employee being resolved. |
| `date` | Work date being resolved. |
| `day_type` | `working_day`, `weekly_off`, `holiday`, `leave`, `unassigned`, or future extended types. |
| `shift_id`, `shift_name` | Resolved expected shift. |
| `expected_start_at`, `expected_end_at` | Expected work window, including night-shift cross-date handling. |
| `expected_hours` | Expected payable/work hours before actual attendance. |
| `weekly_off_source` | Shift, roster pattern, override, or fallback. |
| `holiday_id` | Holiday source where applicable. |
| `roster_assignment_id` | Assignment that won resolution. |
| `roster_pattern_id` | Template/pattern source when applicable. |
| `override_id` | Temporary override, swap, holiday-work marker, or comp-off source when applicable. |
| `leave_request_id` | Approved/pending leave source when applicable. |
| `resolution_source` | Human-readable explanation for UI and audit. |
| `warnings` | Compliance or data-quality warnings. |

Range resolver:

- `resolve_employee_work_schedule(employee, start_date, end_date)`
- Used by leave preview, attendance calendar, roster preview, payroll snapshot, manager roster, and ESS upcoming shifts.

## Resolution Priority

The winning day expectation should be deterministic:

1. Approved leave or leave marking for the date when the consumer needs final state.
2. Holiday-work roster override when the employee is explicitly scheduled to work on a holiday.
3. Temporary shift override.
4. Approved shift/weekly-off swap.
5. Employee-specific roster assignment.
6. Team, department, location, branch, grade, employment-type roster assignment.
7. Attendance policy default shift.
8. Tenant fallback only when no policy/assignment exists.

Consumer-specific interpretation:

- Attendance asks: expected work day, then compares actual punches.
- Leave asks: should this date consume leave units under the selected leave policy?
- Payroll asks: what locked attendance/leave result should affect payable days, LOP, overtime, shift allowance, and holiday work?

## UI/UX Principles

- Use HR-friendly language: "Preview schedule", "Why this day?", "Weekly off", "Temporary change", "Holiday worked", "Payroll impact".
- Avoid exposing backend terms like assignment-kind priority unless HR asks for audit detail.
- Every preview must explain each date in plain language.
- Every bulk apply must have preview first, success/failure toast, and clear skipped-row reasons.
- All modals/drawers must close on successful submit, cancel, and Escape.
- Every changed screen needs desktop, tablet, and mobile Playwright coverage with no horizontal overflow.

## Phase Order

### Phase 0: Architecture Baseline And Risk Map

Goal: freeze current behavior before deeper changes.

Work:

- Inventory current shift, roster, attendance, leave, and payroll behavior.
- Document current APIs, models, and UI flows.
- Identify module-specific assumptions that could diverge.
- Capture current test coverage and known gaps.

QA:

- Backend test inventory.
- Playwright test inventory.
- Known-gap matrix.

Exit:

- This document plus current-state notes are complete.
- No runtime behavior changed.

### Phase 1: Shared Work-Day Resolver

Goal: create one backend source of truth for employee/date expectation.

Work:

- Add `resolve_employee_work_day`.
- Add `resolve_employee_work_schedule`.
- Include resolved shift, weekly off, holiday, roster source, expected hours, and warnings.
- Keep existing module behavior stable until consumers are migrated.

QA:

- Fixed shift.
- No assignment fallback.
- Custom weekly off.
- Holiday calendar.
- Night shift.
- Temporary override.
- Weekly rotation.

Exit:

- Resolver tests prove the same employee/date result is deterministic.

### Phase 2: Roster Pattern Engine

Goal: support common real-world roster cycles.

Work:

- Extend roster template config with `pattern_type`.
- Support fixed, weekly rotation, custom repeating cycle, 6-on-1-off, 5-on-2-off, 4-on-4-off, and 2-2-3.
- Support explicit off-day entries inside cycles.
- Validate inactive/missing shift references.

QA:

- Anchor date behavior.
- Cycle rollover.
- Off-day resolution.
- Invalid pattern rejected with HR-readable message.

Exit:

- Resolver can explain every date in a roster cycle.

### Phase 3: Roster Assignment And Preview UX

Goal: make HR confident before applying roster changes.

Work:

- Add preview API for employee/team scope plus date range.
- Improve roster template and rollout UI into a guided flow:
  - choose scope
  - choose pattern
  - choose dates
  - preview schedule
  - apply
- Show skipped employees and conflicts before apply.

QA:

- Browser preview/apply flow.
- Conflict preview.
- Success/failure messages.
- Desktop/tablet/mobile no-overflow checks.

Exit:

- HR can preview schedule impact before writing assignments.

### Phase 4: Attendance Integration

Goal: attendance consumes the shared resolver.

Work:

- Attendance runtime uses resolved work day.
- Store resolver source snapshot on attendance records where useful.
- Planned vs actual fields become clear in API/UI.
- Weekly off, holiday, late, early exit, and overtime derive from resolved shift.

QA:

- Missing punch on working day.
- Missing punch on weekly off.
- Holiday auto-mark.
- Night shift check-in/out.
- Flexible shift.
- Overtime and late mode.

Exit:

- Attendance no longer derives working day independently from roster/shift truth.

### Phase 5: Leave Integration

Goal: leave unit calculation consumes the shared resolver.

Work:

- Leave preview and submit use resolved schedule.
- Breakdown explains each date: working day, weekly off, holiday, sandwich counted, calendar-day counted.
- Holiday-work override can make a holiday count as working day.
- Half-day leave respects expected shift context.

QA:

- Friday-Monday normal weekend.
- Custom roster weekly off.
- Holiday inside leave.
- Sandwich rule.
- Calendar-day policy.
- Working-day policy.
- Night-shift edge case coverage.

Exit:

- Leave request summary and final request use the same resolved dates.

### Phase 6: Payroll Integration

Goal: payroll consumes locked attendance/leave/work-day evidence.

Work:

- Payroll attendance snapshot includes resolver evidence.
- Compute payable days, LOP days, paid/unpaid leave units, overtime hours, holiday worked, shift/night allowance hooks.
- Include source IDs and hashes for audit.
- UI exposes "why this payroll day counted" evidence.

QA:

- Paid leave does not reduce pay.
- Unpaid leave reduces pay.
- Absent day produces LOP.
- Overtime included.
- Holiday worked included.
- Payroll snapshot trace visible in HR review/output evidence.

Exit:

- Payroll does not recalculate schedule assumptions independently.

### Phase 7: Exceptions, Swaps, And Operational Changes

Goal: support day-to-day roster changes.

Work:

- Temporary shift change.
- Shift swap request.
- Weekly off swap.
- Holiday work marker.
- Comp-off marker.
- Manager/HR approval where required.
- Notification events for affected employees/managers.

QA:

- Employee swap request.
- Manager approval/rejection.
- HR override.
- Conflict detection.
- Attendance and payroll update after approval.

Exit:

- Operational exceptions have audit, approval, and downstream impact.

### Phase 8: Calendar UX

Goal: make schedule planning easy to understand.

Work:

- HR roster calendar with employee rows and date columns.
- Color-coded shifts, off days, holidays, leave, and exceptions.
- Click date to see explanation.
- Filters by department, location, branch, shift, and employee.
- Manager team roster.
- ESS upcoming shifts.

QA:

- Desktop/tablet/mobile screenshots.
- Dense roster.
- Long employee names.
- Calendar horizontal handling.
- Keyboard/accessibility basics.

Exit:

- HR, manager, and employee can understand schedule without opening raw records.

### Phase 9: Import And Export

Goal: support HR operations at scale.

Work:

- Download roster import template.
- Upload roster spreadsheet.
- Validate employee, shift, date, overlap, and policy errors.
- Preview errors before apply.
- Export roster calendar.

QA:

- Valid import.
- Invalid shift code.
- Missing employee.
- Overlap conflict.
- Partial apply or block-all mode.

Exit:

- HR can manage large rosters without manual row-by-row entry.

### Phase 10: Compliance Guardrails

Goal: add industry-grade warnings.

Work:

- Minimum rest gap.
- Maximum weekly hours.
- Maximum continuous working days.
- Night-to-morning warning.
- Holiday work without comp-off/overtime warning.
- Inactive shift warning.
- Required override reason.

QA:

- Backend tests for every guardrail.
- Browser warning display.
- Override reason required.

Exit:

- Risky rosters are clearly flagged before apply/payroll.

### Phase 11: End-To-End Industry Certification

Goal: prove the schedule spine works across industry patterns.

Scenarios:

- Office: Monday-Friday fixed shift.
- Retail: Tuesday weekly off.
- Factory: morning/evening/night rotation.
- Healthcare: 4-on-4-off.
- BPO: night shift with overtime.
- Logistics: holiday worked plus comp-off.

QA:

- Backend full suite.
- Playwright desktop/tablet/mobile.
- Leave + attendance + roster + payroll combined scenario.
- Stage certification.
- User docs updated.

Exit:

- Confidence target: 9/10+ for roster, attendance, leave, and payroll sync.

## Recommended Execution Order

1. Phase 0: Baseline and risk map.
2. Phase 1: Shared work-day resolver.
3. Phase 2: Roster pattern engine.
4. Phase 3: Roster assignment preview UX.
5. Phase 5: Leave integration.
6. Phase 4: Attendance integration.
7. Phase 6: Payroll integration.
8. Phase 7: Exceptions and swaps.
9. Phase 8: Calendar UX.
10. Phase 9: Import/export.
11. Phase 10: Compliance guardrails.
12. Phase 11: End-to-end industry certification.

Reason for this order:

- Resolver first prevents module divergence.
- Pattern engine and preview UX make HR validation possible before downstream changes.
- Leave integration comes before attendance/payroll because leave unit bugs are highly visible to employees.
- Payroll waits until attendance/leave evidence is stable enough to lock into snapshots.
- Calendar, import/export, and compliance guardrails are more valuable once the underlying resolution contract is reliable.

## First Implementation Slice

Build only the smallest safe spine:

1. Add resolver service and backend tests.
2. Add schedule preview API for one employee/date range.
3. Add HR preview panel in roster assignment/template UI.
4. Migrate leave preview to use resolver.
5. Add Playwright tests for fixed shift, custom weekly off, holiday, weekly rotation, and leave unit preview.

This slice gives immediate confidence without jumping into drag/drop calendar or spreadsheet import complexity too early.

## Implementation Log

### 2026-10-08: Phase 0/1 Started

Completed:

- Documented the schedule-spine architecture, shared work-day contract, resolution priority, UI/UX principles, and phase order.
- Added public attendance resolver functions:
  - `resolve_employee_work_day(employee, work_date)`
  - `resolve_employee_work_schedule(employee, start_date, end_date)`
- The resolver currently returns shift, expected start/end, expected hours, weekly-off source, holiday source, attendance policy source, roster assignment source, assignment kind, sequence summary, override marker, and warnings.
- Kept existing attendance and leave runtime behavior unchanged while introducing the new contract for phased migration.
- Added backend tests for:
  - attendance-policy default shift with custom weekly off
  - weekly rotation assignment resolution
  - holiday precedence over working-day shift expectation

Verification:

- `./.venv/bin/python manage.py test apps.attendance.tests --keepdb` passed: 17 tests.
- `git diff --check` passed.

Next:

- Add a read-only preview API around `resolve_employee_work_schedule`.
- Migrate leave preview/unit breakdown to consume the resolver after API contract stabilizes.

### 2026-10-08: Phase 1 Preview API Added

Completed:

- Added HR-admin read-only work schedule preview endpoint:
  - `GET /api/v1/hr-admin/work-schedule-preview/?employee_id=...&start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- Added request validation for tenant-scoped employee access, date ordering, and a 93-calendar-day preview limit.
- Added a Next.js proxy route:
  - `/api/hr-admin/work-schedule-preview`
- Added API coverage proving the endpoint returns roster-driven weekly offs and working-day counts from the shared resolver.

Next:

- Add an HR-readable preview panel in roster assignment/template UI.
- Migrate leave apply/detail unit breakdown to consume this work schedule contract instead of duplicating weekend logic.

### 2026-10-08: HR Schedule Preview UI Started

Completed:

- Upgraded the HR-admin Shift inspector to call the shared work schedule preview endpoint.
- The inspector now shows HR-readable totals for calendar days, working days, weekly offs, and holidays.
- The per-day preview now explains the resolved shift, assignment mode, attendance policy, resolution source, and warnings.
- Kept the wording explicit that this preview reflects saved roster/runtime data, so HR does not confuse unsaved form edits with active schedule truth.

Next:

- Add browser-based Playwright coverage for the inspector on desktop/tablet/mobile.
- Migrate leave apply/detail unit breakdown to consume this same endpoint or backend resolver.

### 2026-10-08: Browser Coverage Added For Schedule Inspector

Completed:

- Updated `hr-admin-attendance-operations-workflow-certification.spec.ts` so the Shift inspector now exercises `/api/hr-admin/work-schedule-preview`.
- The browser test now verifies failure recovery, schedule summary metrics, resolved shift, attendance policy, assignment mode, and resolution source.
- Updated the employee RBAC denial check to cover the new read-only schedule preview route.

Verification:

- TypeScript passed.
- `git diff --check` passed.
- Focused Playwright execution was attempted locally, but stopped before the page loaded because `/api/auth/login` returned HTTP 500 for the seeded HR-admin persona. Re-run once the local auth/backend seed is available.

Next:

- Run the focused browser spec on a healthy local/stage environment.
- Migrate leave apply/detail unit breakdown to the same resolver contract.

### 2026-10-08: Leave Unit Calculation Migrated To Schedule Spine

Completed:

- Refactored leave requested-unit calculation to consume `resolve_employee_work_schedule`.
- Refactored leave unit breakdown rows to use the shared schedule-spine output for holiday, weekly-off, shift, attendance-policy, assignment-kind, and resolution-source metadata.
- Preserved the no-attendance-policy fallback where leave treats non-weekend unassigned days as working days.
- Added regression coverage where an employee-specific roster assignment overrides the attendance-policy default shift and makes Saturday/Sunday count while Monday/Tuesday are excluded.

Verification:

- `apps.leave_management.tests` + `apps.attendance.tests` passed: 44 tests.
- `manage.py check` passed.
- `git diff --check` passed.

Next:

- Run the updated browser inspector spec on stage/local with working auth.
- Add ESS leave Playwright coverage for the employee-specific roster weekly-off calculation.
- Feed the same schedule-spine day counts into payroll absence/LWP snapshot hardening.

### 2026-10-08: ESS Leave Browser Coverage Aligned To Schedule Spine

Completed:

- Updated the ESS leave roster-weekly-off browser certification to call `/api/hr-admin/work-schedule-preview` during setup instead of the older shift-only resolver.
- The test still validates the employee-visible leave detail breakdown: Saturday/Sunday counted, Tuesday/Wednesday excluded, and the correct requested units shown.

Verification:

- TypeScript passed.
- `apps.leave_management.tests` + `apps.attendance.tests` passed: 44 tests.
- `git diff --check` passed.
- Focused ESS Playwright execution was attempted locally, but stopped before page load because `/api/auth/login` returned HTTP 500 for the seeded HR-admin persona.

Next:

- Re-run both focused browser specs on stage or a local backend with seeded auth working.
- Start payroll absence/LWP snapshot integration with the schedule-spine day counts.

### 2026-10-08: Payroll Input Snapshots Carry Schedule-Spine Counts

Completed:

- Enriched payroll input snapshots with `attendance_snapshot.schedule_spine`.
- Added `leave_snapshot.schedule_spine` summary counts for payroll formulas and absence/LWP rules.
- Preserved HR-entered attendance/leave snapshot payloads while adding the schedule-spine sub-object.
- Snapshot schedule evidence now includes calendar days, working days, weekly offs, holidays, unassigned days, non-working days, payable schedule days, and per-day roster/policy resolution metadata.
- Added API regression coverage proving payroll snapshots follow employee-specific roster weekly offs instead of a fixed Saturday/Sunday assumption.

Verification:

- Focused payroll/common tests passed: 16 tests.
- Attendance + leave + common API tests passed together: 57 tests.
- TypeScript passed.
- `manage.py check` passed.
- `git diff --check` passed.

Next:

- Surface the payroll schedule-spine summary in payroll input snapshot UI.
- Add payroll formula/rule tests that consume `attendance.schedule_spine.working_days` and `leave.schedule_spine.non_working_days`.
- Re-run browser specs on stage/local auth once login is healthy.

### 2026-10-08: Payroll Input UI Shows Schedule-Spine Basis

Completed:

- Payroll input snapshot cards now show roster-derived working-day counts and weekly-off counts when schedule-spine evidence is present.
- Selected snapshot detail now includes a compact "Payroll day-count basis" panel with calendar days, working days, weekly offs, holidays, non-working days, payable schedule days, leave summary, and resolver source.
- Daily schedule evidence is available behind an expandable section so the detail panel stays readable.
- Raw source-family cards still hide the nested schedule-spine object to avoid duplicating large JSON in the compact evidence grid.

Verification:

- TypeScript passed.
- Focused payroll schedule-spine API regression passed.
- `git diff --check` passed.

Next:

- Add payroll rule/formula tests that consume `attendance.schedule_spine.working_days`.
- Add Playwright coverage for the payroll input snapshot schedule-spine panel once local/stage auth is healthy.

### 2026-10-08: Payroll Formula Coverage Added For Schedule-Spine Inputs

Completed:

- Added payroll rule evaluation coverage that consumes:
  - `attendance.schedule_spine.working_days`
  - `leave.schedule_spine.non_working_days`
- Verified dependency tracing records the schedule-spine paths, so formula audit evidence can show exactly which day-count inputs were used.

Verification:

- Payroll tests passed: 15 tests.
- Attendance + leave + payroll schedule-spine API regression passed together: 45 tests.
- `git diff --check` passed.

Next:

- Add Playwright coverage for payroll input schedule-spine visibility after auth is healthy.
- Add calculation-run coverage where a real active payroll rule uses the schedule-spine context during draft payroll calculation.

### 2026-10-08: Draft Payroll Calculation Uses Schedule-Spine Formula Inputs

Completed:

- Added a database-backed payroll calculation test with:
  - locked payroll run
  - locked payroll input snapshot carrying schedule-spine counts
  - active payroll rule version
  - draft payroll calculation execution
- Verified the generated payroll calculation line uses `attendance.schedule_spine.working_days` and `leave.schedule_spine.non_working_days`.
- Verified trace dependencies and context snapshots preserve those schedule-spine inputs for audit.

Verification:

- Payroll tests passed: 16 tests.
- Attendance + leave + payroll + schedule-spine API regression passed together: 61 tests.
- TypeScript passed.
- `git diff --check` passed.

Next:

- Add Playwright coverage for payroll input schedule-spine visibility after auth is healthy.
- Add payroll output/payslip visibility for day-count basis where appropriate.

### 2026-10-08: Payslip Output Carries Schedule-Spine Day-Count Basis

Completed:

- Added day-count basis to the deterministic payslip render model from the locked payroll input snapshot.
- Payroll output artifacts now preserve attendance and leave schedule-spine evidence in payslip config for file generation.
- Payslip PDF payloads include the day-count source plus working/weekly-off/holiday counts.
- HR payroll output detail and ESS payslip detail show a compact day-count basis panel beside tax-sheet evidence.

Verification:

- Payroll tests passed: 17 tests.
- Attendance + leave + payroll + schedule-spine API regression passed together: 62 tests.
- TypeScript passed.
- Django system check passed.
- `git diff --check` passed.
