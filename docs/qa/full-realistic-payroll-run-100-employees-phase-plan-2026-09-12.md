# Full Realistic Payroll Run: 1 Organization / 100 Employees Phase Plan

Generated: 2026-09-12  
Target environment: local first, then staging `https://hrms.accerio.in`  
Target tenant shape: one pilot organization with 100 employees  
Primary goal: prove the HRMS payroll SaaS can run a realistic monthly payroll cycle end to end with broad scenario coverage and browser-certified evidence.

Execution tracker:

- `docs/qa/pilot-100-execution-tracker-2026-09-12.md`

## Non-Negotiable Principles

- Use a dedicated pilot rehearsal tenant or clearly prefixed disposable data: `PILOT100_`.
- Do not mutate canonical demo data.
- Do not run destructive cleanup until evidence is exported and reviewed.
- Every touched page must be tested through Playwright at element level: sidebar, tabs, filters, pagination, forms, dropdowns, text fields, buttons, exports, drilldowns, empty states, validation, success states, and role denial.
- Every payroll artifact must remain traceable by source hash, checksum, run id, employee id, and export audit record.
- Every failure must be classified as product defect, test data defect, environment defect, flaky automation, or accepted business limitation.

## Target Data Profile

One organization should include:

| Area | Minimum Data |
|---|---|
| Legal entities | 1 legal entity |
| Locations | 2 locations |
| Branches | 2 branches mapped to locations |
| Business units | 3 business units |
| Departments | 8 departments |
| Cost centers | 10 cost centers |
| Grades | 6 grades |
| Designations | 20 designations |
| Employment types | Permanent, probation, contract, intern, consultant |
| Pay groups | Monthly salaried, executive, contractor |
| Salary structures | At least 4 active structures |
| Payroll period | 1 monthly period |
| Payroll run | 1 full run for 100 employees |
| Managers | 10 managers with direct reports |
| Employees | 100 active employees across all structures |

## Employee Scenario Distribution

| Scenario | Count | Purpose |
|---|---:|---|
| Clean salaried employees | 35 | Happy-path payroll calculation and payslip publication. |
| New joiners mid-month | 8 | Proration, onboarding lifecycle, partial attendance. |
| Exits / full-and-final | 5 | Settlement, hold/release, final payslip and finance handoff. |
| Employees with unpaid leave / LOP | 10 | Attendance-to-payroll impact. |
| Employees with overtime / allowances | 8 | Earnings and variable input validation. |
| Employees with one-time deductions | 8 | Adjustment approval and net pay impact. |
| Employees with reimbursements | 6 | Non-taxable / payable treatment and report visibility. |
| Employees with statutory declarations | 10 | TDS/declaration readiness and locked declaration proof. |
| Employees with bank-account issues | 5 | Bank advice blocker and handoff exception coverage. |
| Employees with document/lifecycle issues | 5 | HR warning visibility without blocking unrelated payroll. |

Total: 100 employees.

## Phase P100-0: Rehearsal Safety And Data Strategy

Goal:

Prepare the environment so a large realistic run is repeatable, traceable, and safe.

Development / setup:

- Decide target environment: local DB first, then staging.
- Create or select pilot rehearsal tenant.
- Define data prefix: `PILOT100_YYYYMMDD`.
- Add seed manifest path for all created ids.
- Define cleanup command but do not run it automatically.
- Ensure tenant has entitlements for 100 employees and required payroll runs.
- Confirm current staging route manifest includes latest reports.

Browser tests:

- Platform admin can find the tenant.
- HR admin can access dashboard, employee directory, payroll setup, payroll inputs, payroll review, payroll outputs, payroll handoff, and reports.
- Employee, manager, and unauthorized roles cannot access HR admin pages.

Done gate:

- Tenant selected.
- Data prefix recorded.
- Seed manifest design ready.
- Staging services active.
- No existing production-like records will be overwritten.

## Phase P100-1: Organization Master Configuration

Goal:

Create all organization master data needed by the 100 employees and ensure dropdowns are not hardcoded.

Development / setup:

- Legal entity.
- Locations.
- Branches.
- Business units.
- Departments.
- Cost centers.
- Grades.
- Designations.
- Employment types.
- Reporting-manager hierarchy.

Playwright coverage:

- Create, read, update, deactivate/reactivate where supported.
- Validate required fields and duplicate code handling.
- Validate dependent dropdown narrowing:
  - Legal entity to branch.
  - Branch to location.
  - Business unit to department.
  - Department/cost center alignment.
  - Designation to grade.
- Validate pagination/search after enough records exist.

Done gate:

- Employee creation dropdowns have all expected options.
- Created masters are searchable and visible after refresh.
- Deactivated records are not offered in active employee setup where applicable.

## Phase P100-2: Policy And Payroll Configuration

Goal:

Configure leave, attendance, salary, statutory, payroll calendar, pay groups, and provider/handoff profiles.

Development / setup:

- Leave types and leave policies.
- Attendance policies, shifts, holiday calendar.
- Salary components:
  - Basic.
  - HRA.
  - Special allowance.
  - Bonus.
  - Overtime.
  - LOP deduction.
  - Loan/recovery.
  - Reimbursement.
  - PF.
  - ESI.
  - Professional tax.
  - TDS.
- Salary structures and versions.
- Pay groups and assignments.
- Payroll period and payroll run.
- Statutory packs, slabs, employer registrations, filing calendars.
- Provider connections and finance handoff profiles.

Playwright coverage:

- CRUD and validation for every setup object touched.
- Preview/calculation views where available.
- Duplicate code rejection.
- Active/inactive filters.
- Pagination for long lists.
- Report catalog confirms payroll/compliance reports are visible.

Done gate:

- A payroll run can be opened for the configured period.
- At least four salary structures can be assigned to employees.
- Statutory setup appears in TDS/challan/statutory filing reports.

## Phase P100-3: 100 Employee Creation And Access Matrix

Goal:

Create or seed 100 employees and verify HR/admin/user access behavior.

Development / setup:

- Create 100 employees with distribution listed above.
- Assign managers for reporting hierarchy.
- Assign pay groups and salary structures.
- Add bank accounts for 95 employees and invalid/missing bank data for 5.
- Add statutory profiles for required employees.
- Add document records for targeted document/lifecycle issue employees.

Playwright coverage:

- Employee directory search, filters, pagination, detail panels.
- Create/edit employee form controls.
- Structural dropdown selections.
- Bank account add/edit/primary controls.
- Access provisioning state.
- Manager view direct-report visibility.
- Employee self-service restricted visibility.
- Cross-role denial for HR-only employee pages.

Done gate:

- 100 employees visible in directory.
- Pagination works at page sizes 10/25/50.
- Manager hierarchy is visible.
- No employee leaks across unauthorized roles.

## Phase P100-4: Attendance, Leave, Lifecycle, And Inputs

Goal:

Produce realistic payroll input conditions across the 100 employees.

Development / setup:

- Attendance records for the payroll period.
- Leave requests and approvals.
- LOP cases.
- Overtime cases.
- New joiner partial month records.
- Exit/FNF cases.
- Reimbursement and deduction inputs.
- Statutory declaration submissions and locks.

Playwright coverage:

- ESS leave/attendance request creation.
- MSS approval/rejection.
- HR admin attendance operations.
- Leave balance impacts.
- Attendance exception report.
- Leave balance report.
- Lifecycle queue and aging reports.
- Employee statutory declarations.

Done gate:

- Payroll input snapshot source data exists for all 100 employees.
- Scenario counts match the planned distribution.
- Reports show the expected exceptions and risks.

## Phase P100-5: Payroll Input Snapshot And Lock

Goal:

Collect, review, and lock payroll inputs for all 100 employees.

Development / setup:

- Generate payroll input snapshots.
- Verify employee count and issue distribution.
- Resolve intentional blockers except the few retained for negative gate checks.
- Lock inputs.

Playwright coverage:

- Payroll inputs page:
  - Search.
  - Payroll run filter.
  - Status filter.
  - Issue filter.
  - Snapshot detail.
  - Pagination.
  - Lock action.
- Payroll input exceptions report:
  - CSV.
  - Manifest.
  - Export audit.
  - Drilldown.

Done gate:

- Snapshots exist for all 100 employees.
- Expected blockers/warnings visible.
- Input lock succeeds only when blockers are resolved or accepted by configured rules.
- Locked inputs cannot be mutated silently.

## Phase P100-6: Payroll Calculation And Review

Goal:

Run payroll calculation and certify review behavior for clean and exception cases.

Development / setup:

- Calculate draft payroll.
- Produce calculation lines for all 100 employees.
- Generate review exceptions for scenario employees.
- Apply decisions where needed.

Playwright coverage:

- Payroll calculations page:
  - Run selection.
  - Calculation summary.
  - Employee lines.
  - Component detail.
  - Pagination.
- Payroll review page:
  - Exceptions.
  - Severity filters.
  - Decision actions.
  - Review submit/approve/lock controls.
- Reports:
  - Salary variance.
  - Payroll review exceptions.

Done gate:

- Calculation completes for all eligible employees.
- Expected scenario variances appear.
- Review decisions persist after refresh.
- Negative lock controls work.

## Phase P100-7: Adjustments, Settlements, And Close Readiness

Goal:

Apply payroll-side changes and prove the run can reach close readiness.

Development / setup:

- Add one-time earnings and deductions.
- Approve/apply eligible adjustments.
- Create and apply exit settlements.
- Recompute or refresh readiness as needed.

Playwright coverage:

- Payroll adjustments page/report.
- Payroll settlements page/report.
- Payroll close readiness report.
- Close blockers and warnings.
- Drilldowns from reports back to operational pages.

Done gate:

- Close readiness shows ready or acceptable residual warnings.
- Adjustment and settlement evidence appears in reports.
- CSV/manifest/audit records exist.

## Phase P100-8: Payroll Outputs, Payslips, And ESS Proof

Goal:

Generate and publish payroll outputs for the run.

Development / setup:

- Generate payroll output batch.
- Generate payslip artifacts.
- Generate payroll register.
- Publish batch.
- Trigger employee access/read/download scenarios:
  - 20 employees acknowledge/read.
  - 10 employees download.
  - 2 signed URL grants revoked/expired if supported.

Playwright coverage:

- Payroll outputs page:
  - Batch list.
  - Artifact list.
  - Selected artifact detail.
  - Publish controls.
  - Signed access/revoke controls.
  - Artifact access audit CSV.
- ESS payslips:
  - Employee sees only own published payslips.
  - Employee read acknowledgement.
  - Download.
- Payslip publication report:
  - Publication state.
  - Acknowledgement.
  - Access risk.
  - CSV/manifest/audit.

Done gate:

- Payslips generated for expected employees.
- Published payslips visible in ESS only for owning employee.
- Publication report reflects read/download/revoke/expiry evidence.

## Phase P100-9: Finance Handoff And Provider Evidence

Goal:

Generate finance handoff and validate payout/provider readiness.

Development / setup:

- Generate finance handoff.
- Generate bank advice.
- Generate accounting/statutory artifacts where supported.
- Simulate or seed provider delivery states:
  - Submitted.
  - Acknowledged.
  - Reconciled.
  - Failed.
  - Retried.
  - Queued.
  - Dead-lettered if supported.

Playwright coverage:

- Payroll handoff page:
  - Handoff list.
  - Artifact list.
  - Delivery evidence.
  - Retry actions.
  - Callback evidence.
  - Provider job evidence.
  - Audit-pack action.
- Reports:
  - Bank advice.
  - Finance handoff exceptions.
  - Provider filing receipts.
  - Challan reconciliation.
  - Statutory filing status.

Done gate:

- Finance handoff is generated.
- Bank advice and provider evidence are visible.
- Exception report identifies expected failed/queued/retry states.
- Audit-pack readiness is visible.

## Phase P100-10: Full Report And Export Regression

Goal:

Prove all HR/payroll/compliance reports work against the 100-employee data set.

Playwright coverage:

- Report catalog.
- Workforce.
- Document compliance.
- Lifecycle queue.
- Lifecycle aging.
- Attendance register.
- Attendance exceptions.
- Leave balance.
- Payroll input exceptions.
- Payroll review exceptions.
- Payroll adjustments.
- Payroll settlements.
- Payroll close readiness.
- Payroll register.
- Salary variance.
- Bank advice.
- Payslip publication.
- Finance handoff exceptions.
- Statutory deductions.
- Challan reconciliation.
- Statutory filing status.
- Provider filing receipts.
- Compliance hub.
- Export audit history.

For every report:

- Open page.
- Validate header, metrics, columns.
- Test search.
- Test every dropdown.
- Test every sort option.
- Test pagination.
- Export filtered CSV.
- Export manifest.
- Validate checksum headers.
- Validate source endpoints.
- Validate evidence columns.
- Validate audit history record.
- Validate employee denial.

Done gate:

- Full report pack passes.
- Export audit history contains CSV and manifest records for every report.
- No report uses placeholder/demo data unless explicitly configured.

## Phase P100-11: Security, Isolation, And Negative Testing

Goal:

Prove sensitive payroll data is protected.

Playwright / API coverage:

- Employee cannot access HR reports.
- Employee cannot download another employee payslip.
- Manager sees only allowed team data.
- HR admin cannot cross tenant boundary.
- Platform admin does not see payroll artifacts unless explicitly allowed.
- Direct API calls without session fail closed.
- Invalid artifact id does not leak object details.
- Invalid report key does not leak backend details.

Done gate:

- No sensitive data appears in unauthorized response bodies.
- All denial cases return expected 401/403/404 with no token/password/secret leakage.

## Phase P100-12: UX, Accessibility, And Performance

Goal:

Prove the 100-employee data volume remains usable.

Playwright coverage:

- Desktop and mobile viewport checks.
- No horizontal overflow.
- Keyboard navigation on forms/tabs/tables.
- Sidebar/category navigation.
- Long table pagination.
- Page-ready timings for:
  - HR dashboard.
  - Employee directory.
  - Payroll inputs.
  - Payroll review.
  - Payroll outputs.
  - Payroll handoff.
  - Reports catalog.
  - Export audit history.
- Visual screenshots for core pages.

Done gate:

- No major layout overlap.
- Long pages are paginated or tabbed.
- Critical pages load within agreed staging budget or documented residual.

## Phase P100-13: Evidence Pack, Cleanup Decision, And Pilot Sign-Off

Goal:

Package evidence and decide whether the data is retained for pilot demo or cleaned.

Evidence pack:

- Seed manifest.
- Employee scenario matrix.
- Payroll run id.
- Output batch id.
- Finance handoff id.
- Report export audit ids.
- Playwright command log.
- Pass/fail counts.
- Screenshots/videos for failures.
- Known limitations.
- Cleanup command and dry-run output.

Done gate:

- Pilot rehearsal result is signed:
  - `Pilot-ready`
  - `Pilot-ready with accepted limitations`
  - `Blocked`
- Cleanup decision recorded:
  - Retain data for demo.
  - Archive/deactivate data.
  - Hard cleanup disposable records.

## Automation Deliverables

| Deliverable | Purpose |
|---|---|
| `backend` seed command or fixture script | Create the 1 org / 100 employee scenario repeatably. |
| `web/tests/e2e/pilot-100-*.spec.ts` suite family | Browser certify each phase. |
| `web/qa-artifacts/pilot-100/manifest.json` | Store ids, codes, and scenario mapping. |
| `docs/qa/pilot-100-run-report-YYYY-MM-DD.md` | Final evidence report. |

## Recommended Execution Order

1. Build seed manifest design.
2. Implement seed command for the 100-employee scenario.
3. Run P100-0 to P100-3 locally.
4. Run P100-4 to P100-9 locally.
5. Run P100-10 to P100-12 locally.
6. Deploy/confirm staging.
7. Seed staging pilot tenant.
8. Run the same P100 suite on staging.
9. Produce sign-off report.
10. Decide retain/archive/cleanup.

## Initial Confidence Targets

| Milestone | Confidence Target |
|---|---:|
| P100-3 employee and master data complete | 91% |
| P100-6 payroll calculation/review complete | 92% |
| P100-9 output/payslip/handoff complete | 93% |
| P100-12 full regression/performance complete | 95% |
| P100-13 sign-off complete | 96% |
