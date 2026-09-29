# Payroll Inputs

Payroll Inputs are locked snapshots of source data used for payroll calculation.

## Purpose

Use Payroll Inputs to freeze employee, salary, attendance, leave, lifecycle, document, and banking data for a payroll run.

## Why inputs are locked

Payroll must be repeatable. If employee data changes after calculation, the payroll run should still show what was used at calculation time.

## What gets snapshotted

| Source family | Examples |
| --- | --- |
| Employee | Status, joining date, exit date, organization mapping. |
| Salary | Structure, version, CTC, component assignments. |
| Attendance | Payable days, absences, regularization decisions. |
| Leave | Approved leave, unpaid leave, leave without pay. |
| Banking | Primary account and payment readiness. |
| Statutory | Employee tax/statutory profile and applicable setup. |
| Adjustments | Approved arrears, bonus, deductions, and settlements. |

## Page layout

| Section | Meaning |
| --- | --- |
| Payroll cycle | Selected run and lock status. |
| Step tracker | Shows current payroll lifecycle stage. |
| Runs | Payroll runs available for input review. |
| Employee snapshots | Employees included in the selected run. |
| Snapshot trace | Source families used for the selected employee. |


![Payroll Inputs snapshot trace](../../assets/screenshots/payroll/payroll-inputs-snapshot-trace.png)

## Important fields

| Field | Meaning |
| --- | --- |
| Input profile | Input contract used by the payroll run. |
| Snapshot schema | Schema version of stored source data. |
| Source hash | Technical evidence that source data is unchanged. |
| Locked | Whether snapshot is frozen. |
| Blocked | Whether a snapshot issue prevents calculation. |

## Buttons and actions

| Button | What it does |
| --- | --- |
| Open Calculation | Moves to calculation page for selected run. |
| Lock inputs | Freezes source snapshot if available. |
| View trace | Shows source details for selected employee. |

## Workflow

1. Open Payroll Inputs.
2. Select the payroll run.
3. Review snapshot readiness.
4. Inspect blocked employees.
5. Fix source data if needed.
6. Lock inputs.
7. Move to Payroll Calculations.

## Before locking inputs

Confirm:

- Payroll Control has no unresolved blockers.
- Employee count matches HR expectation.
- Pending leave and attendance approvals are closed or intentionally excluded.
- Salary and bank coverage are acceptable.
- The selected run is the correct period.
- No HR user is still editing source data for the period.

## FAQ

### Can I change employee data after inputs are locked?

Yes, but the locked payroll run will continue using the old snapshot unless a new run or new snapshot is created.

### What if an employee is missing from snapshots?

Check employee status, pay group assignment, payroll period dates, salary assignment, and employee effective dates.

### Should I unlock inputs?

Only if your process explicitly allows it and the reason is documented. Unlocking or recreating inputs can change payroll results, so it should be treated as a controlled correction.
