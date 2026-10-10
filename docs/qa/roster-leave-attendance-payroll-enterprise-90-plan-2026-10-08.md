# Roster, Shift, Leave, Attendance, And Payroll Enterprise 90 Plan

Date: 2026-10-08  
Owner: HR Admin, ESS, MSS, Payroll, QA  
Goal: close the gap from the current integrated schedule-spine foundation to a 90% enterprise-grade implementation for roster, shift, leave, attendance, and payroll.

## Product Standard

Every user-facing workflow must help HR answer:

- what was scheduled
- what actually happened
- what exception exists
- who must act
- how the decision affects leave and payroll
- what evidence will remain after payroll close

Every UI created or changed under this plan must be:

- clear for a non-technical HR/payroll user
- preview-first for bulk or destructive actions
- explicit about skipped rows and failed records
- responsive on desktop, tablet, and mobile
- free of horizontal overflow
- covered by browser QA in the same phase

## Current State Summary

The product is past basic architecture. It already has:

- shift master and employee shift assignments
- attendance policies, records, regularizations, and assignment scoping
- roster template and rollout surfaces
- leave types, leave policies, balances, requests, approvals, evidence, withdrawal, and cancellation flows
- roster-aware ESS leave unit calculation
- payroll input snapshots carrying schedule-spine day-count evidence
- payroll rule/formula tests consuming schedule-spine inputs
- payroll output and payslip day-count basis evidence
- advisory payroll input reconciliation summary across snapshots and runs
- HR Admin, ESS, MSS, and payroll browser tests across the major surfaces

The remaining work is not just more screens. The main gap is making the system enforceable under messy payroll-close conditions.

## Gap Matrix

| Area | Current level | Gap to 90% enterprise grade |
| --- | ---: | --- |
| Shift master | 80% | Need stronger night-shift, grace, break, and payroll-impact semantics in resolver output. |
| Roster assignments | 75% | Need stronger conflict preview, bulk import, approval/audit, lock-window protection, and rollback evidence. |
| Roster templates | 65% | Need advanced cycle patterns, per-day explanations, failure-safe rollout, and richer browser QA. |
| Shared schedule spine | 80% | Need one explicit resolver contract consumed by all modules and versioned in audit evidence. |
| Attendance records | 70% | Need automated derivation from roster, punch, leave, holiday, regularization, and policy rules. |
| Attendance regularization | 70% | Need payroll-impact classification and post-lock adjustment path. |
| Leave calculation | 80% | Need deeper partial-day, sandwich, holiday-work, LWP, cancellation, and attendance-collision handling. |
| Leave balances | 75% | Need accrual jobs, year-end carry forward, encashment governance, and payroll liability proof. |
| Payroll input snapshots | 80% | Need high-risk reconciliation to become close exceptions or blockers. |
| Payroll reconciliation | 50% | Current implementation is advisory; needs workflow, exception generation, override audit, and exports. |
| Payroll close safety | 60% | Need late-change correction/arrears flow after input lock. |
| Browser QA | 70% | Need phase-by-phase browser packs for every new UX surface and mobile/tablet layout. |

## Phase 1: Resolver Contract Lockdown

Goal: make the shared schedule spine an explicit versioned contract.

Work:

- Define `schedule_spine.contract.v1` fields for one employee/date.
- Normalize resolver output for shift, weekly off, holiday, override, leave, expected hours, expected start/end, night-shift crossing, source refs, warnings, and payroll-impact flags.
- Add contract version and resolver source to every schedule-spine payload.
- Keep existing behavior stable while tightening the payload.

Backend QA:

- Fixed shift, no assignment fallback, custom weekly off, temporary override, weekly rotation, holiday, unassigned day, and night shift.
- Deterministic output for repeated resolver calls.

Browser QA:

- HR Admin shift assignment preview shows clear day explanations.
- HR Admin payroll input detail still shows day-count basis correctly.
- ESS leave apply modal still shows roster-aware units.
- Desktop, tablet, and mobile no-overflow checks.

Exit:

- All consumers can rely on one schedule-spine contract without guessing field names.

Phase 1 implementation notes:

- Added `schedule_spine.contract.v1` and `attendance.resolve_employee_work_schedule.v1` refs to work-day and work-schedule resolver payloads.
- Added shift semantics to each resolved day: break minutes, grace minutes, night-shift flag, cross-midnight flag, payable schedule flag, payroll day weight, and payroll impact summary.
- Preserved existing resolver field names so current leave, attendance, payroll, and UI consumers remain backward compatible.
- Payroll input schedule-spine snapshots now carry the contract refs and per-day payroll-impact fields.
- Frontend work-schedule types now expose the contract and payroll-impact fields.

Phase 1 QA evidence:

- Backend focused tests passed: resolver contract, policy default shift, custom weekly off, weekly rotation, holiday precedence, night-shift contract fields, API schedule preview, payroll snapshot schedule-spine counts, and reconciliation mismatch payload.
- TypeScript passed.
- `git diff --check` passed.
- Local live-auth browser QA with disposable SQLite backend:
  - ESS leave page/responsive modal checks passed: 2/2.
  - Payroll input workspace reconciliation/detail check passed: 1/1.
  - HR attendance operations shift-assignment inspector test skipped in the seeded local dataset because no shift-assignment rows existed; API-level schedule preview contract remains covered by backend tests.

## Phase 2: Enterprise Roster Pattern Engine

Goal: support realistic roster cycles and make rollout safe.

Work:

- Add roster pattern types: fixed weekly, weekly rotation, custom repeating cycle, 6-on-1-off, 5-on-2-off, 4-on-4-off, and 2-2-3.
- Support explicit cycle off days, shift references, anchor date, and effective period.
- Validate inactive shifts, missing shifts, overlapping windows, and empty cycle days.
- Add dry-run preview counts before apply.
- Store rollout evidence: total employees, created, skipped, failed, warnings, checksum.

UI/UX:

- Roster template form uses guided pattern controls instead of raw JSON where possible.
- Preview first, then apply.
- Skipped employees are readable with reason and suggested action.

Backend QA:

- Cycle rollover, anchor behavior, overlapping assignment denial, inactive shift denial, preview/apply parity.

Browser QA:

- Create roster template for each major pattern.
- Dry-run rollout with readable preview.
- Apply rollout and verify resulting employee schedule preview.
- Mobile/tablet layout and no-overflow checks.

Exit:

- HR can safely create and apply common roster patterns without backend knowledge.

Phase 2 implementation notes:

- Added roster `pattern_type` normalization for `custom_cycle`, `weekly_rotation`, `six_on_one_off`, `five_on_two_off`, `four_on_four_off`, and `two_two_three`.
- Guided patterns normalize into explicit work/off rotation entries, so rollouts continue to use the existing employee shift assignment model without a schema migration.
- Resolver now treats explicit roster off entries as weekly-off days and preserves work/off steps in the rotation sequence summary.
- Roster template API validates that a weekly rotation has at least one work step with a valid shift.
- Roster template form now exposes a guided Pattern selector and per-step Work/Off controls; off steps disable shift selection to reduce HR input mistakes.
- Roster template list summaries now show off steps plainly, such as `Off (2d)`.

Phase 2 QA evidence:

- Backend focused tests passed for:
  - 6-on/1-off resolver behavior with explicit off step.
  - Existing weekly-rotation resolver behavior.
  - 5-on/2-off roster template API normalization.
- TypeScript passed.
- `git diff --check` passed.
- Local live-auth browser QA with disposable SQLite backend:
  - `governance-assignment-form-flows.spec.ts -g "shift roster template creates"` passed: 1/1.
  - This covers create, update, rollout preview, rollout apply, and usable browser flow for roster templates.

## Phase 3: Attendance Derivation Engine

Goal: derive attendance status from schedule, punch, leave, holiday, and policy.

Work:

- Add derivation service for daily attendance outcomes.
- Inputs: schedule spine, punches/manual record, approved leave, holiday, regularization, attendance policy.
- Outputs: status, payable units, present units, absent units, LOP units, overtime, late/early flags, warnings.
- Support policy options for missing punch, late marks, half day, weekly off, holiday, remote, and night-shift windows.
- Add recompute job for period/employee/payroll-run windows.

UI/UX:

- Attendance record detail explains "why this status".
- Attendance exceptions page groups payroll-impacting exceptions first.
- HR can recompute a date range with preview counts.

Backend QA:

- Present, absent, half-day, late, weekly off, holiday, leave, missing punch, night shift, and approved regularization.

Browser QA:

- HR Attendance Operations: recompute preview and result.
- HR Attendance Records: explanation panel.
- ESS Attendance: employee sees status and regularization action.
- MSS Approvals: manager sees payroll impact before approval.
- Desktop/tablet/mobile no-overflow checks.

Exit:

- Attendance can be generated consistently enough for payroll input snapshots.

Phase 3 progress on 2026-10-08:

- Added `attendance.derivation_summary.v1` read-time summaries for attendance records.
- HR Admin attendance records and ESS attendance regularization now show "Why this status" and payable/LOP impact.
- Backend summary covers schedule contract refs, schedule day type/source, expected/worked hours, late/early/overtime, warnings, and payroll-impact units.
- Verification so far:
  - `../.venv/bin/python manage.py test apps.attendance.tests.AttendancePolicyAssignmentConflictTests.test_attendance_derivation_summary_explains_absent_working_day_payroll_impact apps.attendance.tests.AttendancePolicyAssignmentConflictTests.test_attendance_runtime_derives_late_minutes_and_overtime_from_shift --keepdb`
  - `../.venv/bin/python manage.py check`
  - `pnpm --dir web exec tsc --noEmit`
- Browser QA on a throwaway local seeded backend (`127.0.0.1:8013`) and frontend (`127.0.0.1:3113`):
  - `PLAYWRIGHT_PORT=3113 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3113 HRMS_API_BASE_URL=http://127.0.0.1:8013/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/hr-admin-attendance-operations-workflow-certification.spec.ts -g "attendance operations hub and record workbench" --workers=1`
  - `PLAYWRIGHT_PORT=3113 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3113 HRMS_API_BASE_URL=http://127.0.0.1:8013/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/ess-attendance-launch-certification.spec.ts -g "attendance page keeps" --workers=1`
  - Both passed, including assertions for "Why this status", payable/LOP impact, and no horizontal overflow coverage in the ESS modal path.

## Phase 4: Leave And Attendance Collision Rules

Goal: prevent silent contradictions between leave and attendance.

Work:

- Detect approved leave with present attendance.
- Detect pending leave during payroll close.
- Detect unpaid leave and attendance LOP mismatch.
- Handle partial-day leave against half-day attendance.
- Add configurable rules for sandwich, holiday overlap, weekly-off overlap, and holiday-work leave.
- Record collision findings as leave/attendance exceptions.

UI/UX:

- ESS leave detail shows counted and excluded dates with plain-language reasons.
- HR leave request detail shows payroll impact.
- Attendance and leave pages link to each other for conflicting dates.

Backend QA:

- Full-day leave, half-day leave, unpaid leave, weekly-off range, holiday range, sandwich range, cancellation, withdrawal, and present-on-leave collision.

Browser QA:

- ESS applies leave across custom weekly offs and sees correct unit breakdown.
- HR reviews collision on leave request and attendance record.
- MSS approves/rejects with collision warning.
- Mobile modal stability and no-overflow checks.

Exit:

- Leave and attendance cannot disagree without a visible exception.

Phase 4 progress on 2026-10-08:

- Added `leave_attendance.collision_summary.v1` for leave requests and `leave_attendance.collision_snapshot.v1` for payroll periods.
- Approved or partially approved leave overlapping payable attendance (`present`, `late`, `half_day`, `remote`) is now detected as payroll-blocking evidence.
- HR Admin leave requests, HR Admin attendance records, ESS attendance regularization, MSS leave approvals, and payroll input reconciliation now expose leave-attendance collision status.
- Payroll input reconciliation now raises a high-severity `leave_attendance_collision` finding when snapshot evidence has collisions.
- Verification:
  - `../.venv/bin/python manage.py test apps.attendance.tests.AttendancePolicyAssignmentConflictTests.test_leave_attendance_collision_summary_flags_approved_leave_with_payable_attendance apps.attendance.tests.AttendancePolicyAssignmentConflictTests.test_attendance_derivation_summary_explains_absent_working_day_payroll_impact --keepdb`
  - `../.venv/bin/python manage.py check`
  - `pnpm --dir web exec tsc --noEmit`
- Browser QA on a throwaway local seeded backend (`127.0.0.1:8014`):
  - HR Admin leave request queue: passed, including visible "Attendance collision" evidence and no-overflow coverage.
  - HR Admin attendance operations record workbench: passed, including visible "Leave collision" evidence.
  - ESS attendance launch modal: passed, including visible "Leave collision" evidence and no-overflow coverage.
  - Payroll input snapshot flows: passed after reconciliation metric change.

## Phase 5: Payroll Input Reconciliation Enforcement

Goal: move reconciliation from advisory to controlled payroll-close behavior.

Work:

- Convert high-risk reconciliation findings into payroll review exceptions.
- Add configurable close gate: advisory, warn, or block.
- Preserve snapshot metrics, finding code, source hash, schedule counts, attendance counts, leave units, and LOP units.
- Add override workflow with owner, reason, expiry/period scope, and audit event.
- Keep first production default as warn unless explicitly configured to block.

UI/UX:

- Payroll Inputs shows risk category with clear next action.
- Payroll Review shows generated exceptions with correction vs override choices.
- Payroll Close Readiness highlights reconciliation blockers separately from setup blockers.

Backend QA:

- Ready snapshot, warning snapshot, blocked snapshot, run aggregation, exception generation, override accepted, override rejected, lock blocked when policy says block.

Browser QA:

- Payroll Inputs: reconciliation risk panel and finding drilldown.
- Payroll Review: generated exception decision workflow.
- Payroll Close Readiness report: reconciliation category visible.
- Role denial: ESS/MSS cannot access payroll evidence.
- Desktop/tablet/mobile no-overflow checks.

Exit:

- Payroll cannot close blindly when schedule, attendance, leave, and LOP disagree.

Phase 5 progress on 2026-10-08:

- Added `payroll.input_lock_gate.v1` enforcement for the payroll input lock action.
- The lock endpoint now evaluates computed reconciliation findings for every snapshot and blocks high-severity findings even when the snapshot row itself is still `ready` or `warning`.
- Lock failure payload now includes `lock_gate`, `reconciliation_blocker_count`, and per-employee high findings for operator remediation.
- Payroll Inputs lock panel now shows a dedicated `Recon blockers` count and disables lock when high-risk reconciliation findings exist.
- Verification:
  - `../.venv/bin/python manage.py test apps.common.tests.HrAdminOptionMetadataTests.test_payroll_input_lock_blocks_high_reconciliation_findings_even_when_snapshot_not_blocked apps.common.tests.HrAdminOptionMetadataTests.test_payroll_input_snapshot_payload_flags_attendance_schedule_mismatch --keepdb`
  - `../.venv/bin/python manage.py check`
  - `pnpm --dir web exec tsc --noEmit`
  - `git diff --check`
- Browser QA on a throwaway local seeded backend (`127.0.0.1:8015`):
  - `NEXT_DIST_DIR=.next/playwright-phase5-lock-gate PLAYWRIGHT_PORT=3119 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3119 HRMS_API_BASE_URL=http://127.0.0.1:8015/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payroll-inputs-flows.spec.ts --workers=1`
  - Passed: payroll input workspace and period/pay-group filtering, including visible `Recon blockers` lock-gate evidence.

## Phase 6: Post-Lock Change And Arrears Workflow

Goal: make late leave/attendance changes safe after payroll inputs are locked.

Work:

- Detect source changes after payroll input lock.
- Classify change as no impact, rerun required, arrears candidate, or manual adjustment required.
- Create adjustment/settlement candidates from late approved leave, regularization, shift correction, or attendance recompute.
- Link candidate to original locked snapshot and source event.

UI/UX:

- HR sees "changed after payroll lock" banners on leave/attendance/payroll input detail.
- Payroll adjustment workspace shows source-linked candidates with accept/reject.
- ESS status copy avoids promising current payslip change when change will move to next payroll.

Backend QA:

- Late leave approval, late leave cancellation, late regularization approval, roster correction after lock, adjustment candidate generation, audit trace.

Browser QA:

- HR approves late regularization and sees payroll-impact candidate.
- Payroll admin accepts adjustment candidate.
- ESS sees updated request status with next-payroll messaging.
- Desktop/tablet/mobile no-overflow checks.

Exit:

- Locked payroll remains immutable, while late operational truth still becomes payable correction evidence.

Status on 2026-10-08:

- Added `payroll.post_lock_impact.v1` evidence for attendance regularizations that overlap locked payroll input snapshots.
- Payroll adjustment setup now exposes locked-snapshot post-lock impact candidates with employee, run, period, source hash, recommended action, and deterministic adjustment source refs.
- Payroll adjustments created from the action panel can carry `post_lock_source` evidence and default to a post-lock arrear component when an impact exists.
- HR Admin payroll adjustments overview now shows a Post-lock impacts metric and a compact arrears review list.

QA completed:

- `../.venv/bin/python manage.py test apps.common.tests.HrAdminOptionMetadataTests.test_payroll_adjustment_setup_surfaces_locked_snapshot_post_lock_impacts apps.common.tests.HrAdminOptionMetadataTests.test_payroll_input_lock_blocks_high_reconciliation_findings_even_when_snapshot_not_blocked --keepdb`
- `../.venv/bin/python manage.py check`
- `pnpm --dir web exec tsc --noEmit`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8016`: `NEXT_DIST_DIR=.next/playwright-phase6-post-lock PLAYWRIGHT_PORT=3120 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3120 HRMS_API_BASE_URL=http://127.0.0.1:8016/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payroll-adjustments-flows.spec.ts --workers=1`

## Phase 7: Reports, Exports, And Audit Evidence

Goal: make enterprise review and audit practical.

Work:

- Add reconciliation-focused report columns and filters.
- Add roster rollout audit report.
- Add attendance derivation exception report.
- Add leave-attendance collision report.
- Add export manifests with checksums and source endpoints.
- Add audit events for resolver contract version, recompute jobs, overrides, and post-lock candidates.

UI/UX:

- Reports start with operational filters and human-readable risk labels.
- Every report has Export CSV, Manifest, pagination, and direct drilldown actions.

Backend QA:

- Report filters, CSV headers, manifest schema, checksums, source endpoints, audit rows, role denial.

Browser QA:

- Each new report: filters, pagination, export, manifest, drilldown, empty state, employee denial.
- Desktop/tablet/mobile no-overflow checks.

Exit:

- HR/payroll can prove what happened without querying the database.

Status on 2026-10-08:

- Payroll input exceptions exports and manifests now include reconciliation status, risk, high/medium finding counts, finding count, and first finding evidence.
- Payroll adjustment reports now expose post-lock evidence in the browser, including post-lock linked metrics, source refs, locked snapshot source, impacted period, and recommended action.
- Payroll adjustment exports and manifests now include post-lock source columns so arrear/correction decisions can be audited from CSV and manifest evidence.
- Added a dedicated Leave-Attendance Collision Report with operational filters, payroll blocking metrics, collision evidence rows, CSV export, manifest, report catalog entry, and attendance report family placement.
- Added a dedicated Attendance Derivation Exceptions Report with derived status, schedule source, worked/expected hours, payable/LOP units, payroll-impacting flags, warnings, collision counts, CSV export, manifest, report catalog entry, and attendance report family placement.
- Added a dedicated Roster Rollout Audit Report with template/pattern metadata, scope, rollout window, target/created/skipped counts, completion rate, risk classification, CSV export, manifest, report catalog entry, and attendance report family placement.
- Demo data includes one post-lock-linked arrear adjustment, keeping local report QA representative.
- Demo data includes one leave-attendance collision, keeping local report QA representative.

QA completed:

- `../.venv/bin/python manage.py check`
- `pnpm --dir web exec tsc --noEmit`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8017`: `NEXT_DIST_DIR=.next/playwright-phase7-reports PLAYWRIGHT_PORT=3121 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3121 HRMS_API_BASE_URL=http://127.0.0.1:8017/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/payroll-input-exceptions-report-certification.spec.ts tests/e2e/payroll-adjustments-report-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8018`: `NEXT_DIST_DIR=.next/playwright-phase7b-collisions PLAYWRIGHT_PORT=3122 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3122 HRMS_API_BASE_URL=http://127.0.0.1:8018/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/leave-attendance-collisions-report-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8019`: `NEXT_DIST_DIR=.next/playwright-phase7c-derivation PLAYWRIGHT_PORT=3123 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3123 HRMS_API_BASE_URL=http://127.0.0.1:8019/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/attendance-derivation-exceptions-report-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8020`: `NEXT_DIST_DIR=.next/playwright-phase7d-roster PLAYWRIGHT_PORT=3124 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3124 HRMS_API_BASE_URL=http://127.0.0.1:8020/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/roster-rollout-audit-report-certification.spec.ts --workers=1`

## Phase 8: Enterprise UX Polish And Workflow Guides

Goal: make the connected flow easy to operate repeatedly.

Work:

- Add an end-to-end Time to Payroll control view.
- Show schedule, attendance, leave, payroll input, reconciliation, review, and output state in one journey.
- Add guided remediation actions.
- Tighten labels, empty states, error states, loading states, and success feedback.

UI/UX:

- No marketing-style pages.
- Dense, scannable operational layout.
- Actions are obvious and close to the data they affect.
- Use badges, segmented controls, tabs, filters, and compact panels consistently.

Browser QA:

- Full HR Admin journey from roster preview to payroll input reconciliation.
- ESS journey from leave request to attendance status to payslip day-count basis.
- MSS approval journey for leave and attendance.
- Mobile and tablet smoke for each touched page.

Exit:

- A real HR/payroll operator can follow the flow without engineering help.

Status on 2026-10-08:

- Added `/hr-admin/time-to-payroll` as the first end-to-end control view across roster rollout, leave collisions, attendance derivation, payroll input reconciliation, and post-lock arrears.
- Added Time to Payroll to HR Admin navigation and Time & Leave search destinations.
- The control view now gives HR/payroll users journey status, payroll findings, attendance exceptions, post-lock impact counts, stage-by-stage status, next recommended action, and direct evidence links.
- Added a guided Clearance plan panel so the next risky stage explains the required clearance condition, remediation path, and immediate operating/report actions.
- Added compact stage drilldown rows so every journey card shows its clearance condition and top operator action without forcing users to open the report first.
- Added tablet and mobile browser certification for the dense Time to Payroll control view, including stage cards, clearance details, primary evidence links, and no-horizontal-overflow checks.
- Added a Close readiness starter checklist so low-data or first-cycle tenants see which roster, attendance, leave, payroll input, and arrears evidence exists and which setup action comes next.
- Added browser certification for HR admin access, report drilldown, no horizontal overflow, and employee role denial.

QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8021`: `NEXT_DIST_DIR=.next/playwright-phase8-timepay PLAYWRIGHT_PORT=3125 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3125 HRMS_API_BASE_URL=http://127.0.0.1:8021/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8022`: `NEXT_DIST_DIR=.next/playwright-phase8b-timepay PLAYWRIGHT_PORT=3126 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3126 HRMS_API_BASE_URL=http://127.0.0.1:8022/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8023`: `NEXT_DIST_DIR=.next/playwright-phase8c-timepay PLAYWRIGHT_PORT=3127 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3127 HRMS_API_BASE_URL=http://127.0.0.1:8023/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8024`: `NEXT_DIST_DIR=.next/playwright-phase8d-timepay PLAYWRIGHT_PORT=3128 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3128 HRMS_API_BASE_URL=http://127.0.0.1:8024/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8025`: `NEXT_DIST_DIR=.next/playwright-phase8e-timepay PLAYWRIGHT_PORT=3129 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3129 HRMS_API_BASE_URL=http://127.0.0.1:8025/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/time-to-payroll-control-certification.spec.ts --workers=1`

## Phase 9: Stage Certification And 100-Employee Realistic Run

Goal: prove the system survives realistic payroll-close volume and messy data.

Work:

- Bulk upload at least 100 employees through the real HR Admin import workbench instead of backend seeding.
- Keep backend seed commands out of Phase 9 certification except for baseline tenant/demo authentication setup.
- Use approximately 90% bulk upload/API import workflows and 10% browser operational actions so real import validations, skipped rows, audit rows, and UI evidence are exercised.
- Include normal, night-shift, rotating roster, weekly-off variation, leave, LWP, late regularization, and post-lock changes.
- Run payroll input collection, reconciliation, review, approval, output, ESS payslip, and finance handoff.

QA:

- Backend targeted suite.
- Local browser suite.
- Stage browser suite.
- Export evidence pack.
- No temporary stage data left in unsafe state.

Exit:

- 90% enterprise-grade readiness can be claimed for roster/shift/leave/attendance/payroll integration.

Phase 9A status on 2026-10-08:

- Added browser certification that uploads a 101-row employee CSV through HR Admin Bulk imports: 100 valid workforce rows plus one duplicate row that must remain blocked.
- The test commits only ready rows through the employee bulk import workbench, verifies 100 imported employee records through the app API, searches a created employee in the browser directory, and verifies committed import audit evidence by source hash.
- This confirms the Phase 9 approach will be bulk-upload-first, not direct backend seeding.

Phase 9A QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8026`: `NEXT_DIST_DIR=.next/playwright-phase9-bulk-upload-c PLAYWRIGHT_PORT=3132 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3132 HRMS_API_BASE_URL=http://127.0.0.1:8026/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 9B status on 2026-10-08:

- Expanded the same bulk-upload certification to load payroll prerequisites for the 100 imported employees.
- Added 100 valid employee bank account rows plus blocked duplicate-primary, invalid IFSC, and missing-employee rows through the Employee bank import workbench.
- Added 100 valid reporting manager mappings plus blocked duplicate-mapping, invalid-manager, and missing-reason rows through the Reporting manager import workbench.
- Verified committed import audit evidence by exact source hash for employees, bank accounts, and reporting manager mappings.

Phase 9B QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8027`: `NEXT_DIST_DIR=.next/playwright-phase9b-bulk-upload-b PLAYWRIGHT_PORT=3134 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3134 HRMS_API_BASE_URL=http://127.0.0.1:8027/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 9C status on 2026-10-08:

- Added a Shift assignment import workbench on HR Admin Shift assignments for CSV-driven roster coverage by employee code, shift name, assignment mode, effective window, and primary flag.
- Expanded the 100-person bulk certification to upload 100 valid shift assignment rows plus blocked duplicate-window, invalid-shift, invalid-date, and missing-employee rows.
- Verified committed import audit evidence by exact source hash for employee shift assignments.
- Policy options now expose employee code so CSV imports can match employees by real HR identifiers.

Phase 9C QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8028`: `NEXT_DIST_DIR=.next/playwright-phase9c-bulk-upload PLAYWRIGHT_PORT=3135 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3135 HRMS_API_BASE_URL=http://127.0.0.1:8028/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 9D status on 2026-10-08:

- Added HR Admin Attendance records CSV import for daily evidence by employee code, date, status, source, shift, timings, regularization, lock state, and notes.
- Added backend HR Admin attendance record creation through the same runtime derivation path used by record edits, preserving shift, holiday, late, overtime, and payroll-impact calculations.
- Expanded the 100-person bulk certification to upload 100 realistic attendance rows across present, late, absent, half-day, remote, on-leave, overtime, and regularized cases plus blocked duplicate-date, invalid-status, invalid-date, and missing-employee rows.
- Verified committed import audit evidence by exact source hash for attendance records and confirmed the imported attendance day is searchable in the browser queue.
- Attendance operation options now expose employee code so imports can match by HR identifier.

Phase 9D QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8029`: `NEXT_DIST_DIR=.next/playwright-phase9d-attendance-rerun2 PLAYWRIGHT_PORT=3138 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3138 HRMS_API_BASE_URL=http://127.0.0.1:8029/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 9E status on 2026-10-08:

- Added HR Admin Leave policy assignment import so imported employees can receive employee-specific leave policy coverage by employee code and policy name before leave transactions are loaded.
- Added HR Admin Leave request import for employee code, leave type, date range, day portions, reason, and evidence reference.
- Added bulk import API paths for leave policy assignments and leave requests so browser imports can commit high-volume rows without bypassing tenant permissions, policy validation, or per-row status evidence.
- Expanded the 100-person certification to import 100 leave policy assignments plus blocked duplicate-policy, invalid-policy, invalid-priority, and missing-employee rows.
- Expanded the same certification to import 100 future-dated leave requests that collide with imported attendance evidence, plus blocked duplicate-range, invalid-type, invalid-date, and missing-employee rows.
- Verified committed import audit evidence by exact source hash for leave policy assignments and leave requests, and confirmed imported leave requests are searchable in the HR Admin queue.

Phase 9E QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- `git diff --check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8030`: `NEXT_DIST_DIR=.next/playwright-phase9e-leave-rerun8 PLAYWRIGHT_PORT=3147 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3147 HRMS_API_BASE_URL=http://127.0.0.1:8030/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 9F status on 2026-10-08:

- Added HR Admin Payroll Inputs bulk snapshot import for the imported workforce, using employee code plus payroll-ready salary, attendance, leave, LOP, overtime, and working-day values.
- Added a tenant-permissioned backend bulk import path for payroll input snapshots so 100-person payroll input collection can run through browser/API boundaries without direct backend seeding.
- Expanded the 100-person certification to create a payroll run, import 100 payroll input snapshots, reject duplicate snapshot rows, lock inputs, calculate payroll, open review, submit, approve, final-lock, generate outputs, publish outputs, generate finance handoff, and verify the calculation/review/output/handoff pages render without horizontal overflow.
- Fixed payroll bulk snapshot salary evidence to include annual CTC derived from monthly gross so draft calculation passes enterprise validation rather than bypassing salary readiness.

Phase 9F QA completed:

- `pnpm --dir web exec tsc --noEmit`
- `../.venv/bin/python manage.py check`
- Local browser QA with disposable SQLite backend on `127.0.0.1:8030`: `NEXT_DIST_DIR=.next/playwright-phase9f-payroll-close-rerun6 PLAYWRIGHT_PORT=3154 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3154 HRMS_API_BASE_URL=http://127.0.0.1:8030/api/v1 HRMS_ENABLE_DEMO_DATA=false PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 pnpm --dir web exec playwright test tests/e2e/phase9-bulk-upload-100-workforce-certification.spec.ts --workers=1`

Phase 10 UI/UX navigation hardening note:

- After this pass, audit every roster, shift, leave, attendance, payroll, report, and import page for professional navigation, complete filters, stable pagination, readable density, empty/error/success states, no horizontal overflow, and clear user-friendly copy.
- Prioritize high-volume pages first: employee list/import, shift assignments, attendance records, leave requests, payroll inputs, payroll calculations, payroll review, payroll outputs, payroll handoff, import history, and reconciliation reports.
- Every UI/UX polish change must ship with browser QA for desktop and at least one constrained/mobile viewport where the page can naturally overflow.

## Definition Of 90% Enterprise Grade

The system reaches 90% when all of these are true:

- One schedule-spine contract drives leave, attendance, and payroll.
- Roster patterns cover common enterprise schedules.
- Attendance derivation is deterministic and explainable.
- Leave and attendance collisions are visible and actionable.
- Payroll reconciliation can warn or block based on configuration.
- Post-lock changes produce controlled correction evidence.
- Every important exception has an owner, status, reason, and audit trail.
- HR Admin, ESS, MSS, and Payroll user journeys are browser-certified.
- Reports and exports let a tenant prove payroll-close decisions.
- UI remains usable on desktop, tablet, and mobile.

## Execution Rule

Do not count a phase complete if backend logic exists but the user cannot understand or operate it in the browser.

Every phase that changes UI must finish with:

- Playwright coverage for the changed screen.
- At least one no-horizontal-overflow assertion.
- Empty, success, validation-error, and permission-denial states where applicable.
- QA notes added to this document or a linked phase certificate.
