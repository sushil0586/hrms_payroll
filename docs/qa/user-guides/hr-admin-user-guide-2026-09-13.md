# HR Admin User Guide

Date: 2026-09-13

## Purpose

The HR Admin owns people operations and payroll preparation for a tenant. This role maintains organization structure, employee lifecycle, salary setup, attendance and leave inputs, statutory declarations, payroll inputs, payroll processing readiness, payslip publication, and HR-facing reports.

The HR Admin is the main operational user for month-end payroll readiness.

## Main Workspace

- Primary route: `/hr-admin`
- Employee creation route: `/hr-admin/employees/new`
- Reports route: `/hr-admin/reports`
- Payroll handoff route: `/hr-admin/payroll-handoff`

## What The HR Admin Can Do

- Maintain organization masters such as legal entities, branches, locations, business units, departments, designations, grades, cost centers, and employment types.
- Create and update employees.
- Map employees to structure, reporting manager, salary, bank, and statutory settings.
- Review attendance and leave inputs.
- Prepare payroll input snapshots.
- Review payroll calculation outputs and exceptions.
- Publish payslips where permitted.
- Generate HR and payroll reports.
- Track readiness before finance handoff.

## What The HR Admin Should Not Do

- Do not mark finance handoff complete without payroll finance review.
- Do not modify tenant governance settings unless assigned Tenant Admin access.
- Do not change employee salary after payroll close unless the period is reopened through the approved process.
- Do not use seed scripts for normal work; pilot user actions should happen through the browser.

## First Login Checklist

1. Open `/hr-admin`.
2. Confirm dashboard/workspace loads live data.
3. Confirm no fallback/demo-data warning is shown.
4. Confirm left navigation is visible and grouped.
5. Confirm employee, organization, payroll, and reports areas can be opened.
6. Confirm browser zoom is normal and no controls overlap.

## Recommended Month-End Sequence

Follow this order for clean payroll processing:

1. Confirm organization masters.
2. Confirm employee directory.
3. Confirm salary setup.
4. Confirm attendance and leave inputs.
5. Confirm statutory declarations and employee compliance data.
6. Create or review payroll input snapshot.
7. Review payroll calculation.
8. Resolve exceptions.
9. Publish or prepare payslips.
10. Hand off approved payroll outputs to finance.
11. Generate reports and export audit evidence.

## Organization Master Workflow

Before adding employees, confirm:

- Legal entity exists and is active.
- Branch is mapped to the correct legal entity.
- Location is mapped where required.
- Business unit exists.
- Department is mapped to business unit.
- Cost center is mapped to legal entity.
- Designation and grade mapping is correct.
- Employment type is available.

If an employee form dropdown is empty after selecting a legal entity, check whether active branches, locations, departments, or cost centers are mapped. The product should show a clear inline warning when dependent data is missing.

## Employee Creation Workflow

1. Open Employees.
2. Select Add/Create Employee.
3. Enter personal details.
4. Enter contact details.
5. Select legal entity.
6. Select branch.
7. Confirm location alignment.
8. Select business unit and department.
9. Select designation and grade.
10. Select employment type.
11. Select reporting manager if available.
12. Enter joining and employment dates.
13. Add salary setup or continue to salary setup page.
14. Save employee.
15. Reopen the employee profile and confirm all data persisted.

## Payroll Input Snapshot Workflow

Use payroll input snapshots to freeze the data being used for a payroll run.

1. Open payroll input snapshot setup.
2. Select tenant, pay period, and pay group.
3. Review included employees.
4. Review attendance, leave, salary, statutory, and adjustment inputs.
5. Create snapshot.
6. Confirm snapshot count and totals.
7. Open the snapshot detail.
8. Verify pagination, filters, totals, and employee rows.
9. Do not proceed if key data is missing.

## Payroll Calculation Review

After calculation:

1. Open payroll calculation/output page.
2. Confirm employee count.
3. Confirm gross pay, deductions, employer contributions, and net pay totals.
4. Review exceptions.
5. Check negative net pay, missing bank, missing statutory setup, missing salary, and unpaid leave cases.
6. Resolve or document exceptions.
7. Rerun/review until results are stable.

## Payslip Publication Workflow

1. Open payslip publication/reporting page.
2. Confirm pay period and employee count.
3. Review unpublished, published, and failed counts.
4. Publish only after payroll totals are approved.
5. Confirm employee ESS can view payslip.
6. Export evidence if required.

## Reports To Use

- Payroll Register: employee-wise payroll summary.
- Bank Advice: payment handoff summary.
- Payslip Publication: payslip status.
- Compliance/TDS/Statutory reports: statutory readiness and filing inputs.
- Export Audit: evidence of report downloads and hashes.
- Finance Handoff Exceptions: unresolved finance blockers.

## Common Issues

| Issue | What to check |
| --- | --- |
| Dropdown is empty | Parent master mapping and active status |
| Employee cannot be saved | Required fields, duplicate employee code/email, missing structure |
| Payroll count is wrong | Employee active status, pay group mapping, joining/exit date |
| Payroll totals look wrong | Salary setup, leave loss, arrears, deductions |
| Payslip not visible in ESS | Publication status and employee mapping |

## Completion Criteria

HR Admin work for a pay period is complete when:

- Employee and organization data are verified.
- Snapshot is created and reviewed.
- Payroll results have no unresolved blocking exceptions.
- Payslip status is known.
- Finance handoff pack is ready.
- Reports and export audit evidence are available.

