# Payroll + Attendance Reconciliation Hardening Plan

## Objective

Use the schedule spine as the shared source of truth to help HR and payroll catch mismatches before payroll is calculated, reviewed, locked, and published.

## Phase Order

### Phase 1: Input Snapshot Reconciliation Summary

- Compute reconciliation status for each payroll input snapshot.
- Compare schedule-spine working days with attendance present/LOP/paid days where captured.
- Compare leave requested/approved units with attendance LOP where captured.
- Surface high-signal findings in payroll input detail and payroll input exceptions report.
- Keep logic read-only and deterministic so it is safe for local/stage/browser QA.

### Phase 2: Payroll Close Gate Signals

- Aggregate reconciliation findings at payroll-run level.
- Add close-readiness categories for attendance/payroll day-count mismatches.
- Highlight unresolved high-risk inputs before input lock and review lock.

### Phase 3: Review Exception Generation

- Convert high-risk reconciliation findings into payroll review exceptions when a review opens.
- Preserve source snapshot, schedule-spine counts, attendance counts, and leave counts as evidence.
- Add decision workflow and audit trail for override vs correction.

### Phase 4: Reports And Export

- Add reconciliation-focused filters and CSV/manifest evidence.
- Include employee, run, risk, finding code, schedule counts, attendance counts, leave counts, and source hash.
- Add role denial tests for ESS/MSS users.

### Phase 5: Browser QA And Stage Certification

- Local Playwright: payroll input detail, report filters, mobile/tablet layout.
- Stage Playwright: real created data with roster-aware leave, attendance snapshot mismatch, and payroll input warning.
- Confirm no temporary data is left in an unsafe state.

## Current Pass

Phase 1 implementation is in progress because it gives immediate user value without changing payroll calculations or lock behavior.

## Phase 1 Implementation Notes

- Payroll input snapshot API now returns a `reconciliation_summary` for every snapshot.
- The summary compares schedule-spine working days against attendance present days, LOP days, paid days, leave units, and existing input blockers/warnings.
- Medium-risk findings currently catch missing attendance, missing LOP/regularization for short present days, unexplained working-day gaps, leave schedule mismatches, unpaid leave vs LOP mismatches, and input warnings.
- High-risk findings currently catch attendance days exceeding scheduled working days and existing input blockers.
- HR payroll input detail now shows a compact reconciliation panel before the schedule spine so payroll users see the risk before locking.
- Payroll input exceptions report now includes reconciliation risk, finding counts, and searchable finding messages.

## Phase 1 QA Evidence

- Backend targeted API tests cover roster-aware schedule spine counts and reconciliation warnings for an attendance/schedule mismatch.
- Frontend type validation covers the new `reconciliation_summary` contract through the payroll input detail and exception report surfaces.

## Phase 2 Implementation Notes

- Payroll run API now returns an aggregate reconciliation summary across all input snapshots in that run.
- Payroll input run cards show reconciliation finding count and risk so HR can identify risky runs without opening every employee.
- Lock readiness panel now shows reconciliation risk and total reconciliation findings beside ready/warning/blocked/locked counts.
- The first pass is advisory only; hard blocking remains tied to existing blocked snapshots until QA confirms the new signals on local and stage data.

## Local Verification - 2026-10-08

- `../.venv/bin/python manage.py test apps.common.tests.HrAdminOptionMetadataTests.test_payroll_input_snapshot_payload_flags_attendance_schedule_mismatch apps.common.tests.HrAdminOptionMetadataTests.test_payroll_input_snapshot_carries_schedule_spine_counts_from_employee_roster --keepdb`
- `../.venv/bin/python manage.py test apps.payroll.tests.PayrollPayslipRenderModelTests.test_output_reconciliation_passes_when_payslip_matches_register apps.payroll.tests.PayrollPayslipRenderModelTests.test_output_reconciliation_reports_amount_mismatches apps.payroll.tests.PayrollPayslipRenderModelTests.test_output_reconciliation_reports_register_rows_without_payslips apps.payroll.tests.PayrollPayslipRenderModelTests.test_publish_blocks_when_output_reconciliation_fails apps.payroll.tests.PayrollPayslipRenderModelTests.test_finance_handoff_blocks_when_output_reconciliation_fails --keepdb`
- `../.venv/bin/python manage.py check`
- `pnpm --dir web exec tsc --noEmit`
- `git diff --check`

Fresh rerun after chat recovery: all commands above passed on 2026-10-08.

## Local Browser Verification - 2026-10-08

- Started a disposable local Django backend on `127.0.0.1:8001` with SQLite and `bootstrap_demo_workspace`.
- `pnpm --dir web exec playwright test tests/e2e/payroll-inputs-flows.spec.ts tests/e2e/payroll-input-exceptions-report-certification.spec.ts --workers=1`

Result: 4/4 passed. This certified the payroll input reconciliation run/detail UI, payroll input exception reconciliation metric/search surface, report export evidence, employee denial, and horizontal overflow checks against local live-auth data.
