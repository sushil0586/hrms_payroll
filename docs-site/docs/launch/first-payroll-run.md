# First Payroll Run Guide

Use this guide for the first real payroll cycle of a tenant.

## Goal

Complete the first payroll run with source readiness, locked inputs, calculation, review, outputs, finance handoff, and audit evidence.

## Before the First Run

Confirm:

- Go-live checklist is complete.
- Payroll calendar and period exist.
- Pay groups are final.
- Employees are in the correct payroll scope.
- Salary structures and assignments are complete.
- Bank accounts are available.
- Statutory setup is complete.
- Leave and attendance data is ready.
- Payroll approvers are assigned.
- Finance Manager access is tested.

## Step 1: Validate Setup

Open these pages:

- **Payroll Setup**
- **Salary Setup**
- **Payroll Rules**
- **Statutory**
- **Payroll Providers**

Check:

| Page | What to validate |
| --- | --- |
| Payroll Setup | Calendar, periods, pay groups, assignments |
| Salary Setup | Components, structures, CTC, employee assignments |
| Payroll Rules | Published rules, formulas, traceability |
| Statutory | Statutory profiles and deductions |
| Providers | Bank/provider delivery setup |

Do not continue if setup is incomplete or still being changed.

## Step 2: Run Payroll Readiness

Open **Payroll Control**.

![Payroll Control summary](../assets/screenshots/payroll/payroll-control-summary.png)

Check:

- Employee count in scope.
- Ready count.
- Warning count.
- Blocked count.
- Pending approvals.
- Top action list.

Fix blockers before moving forward.

## Step 3: Lock Inputs

Open **Payroll Inputs**.

![Payroll input snapshot trace](../assets/screenshots/payroll/payroll-inputs-snapshot-trace.png)

Before locking:

- Confirm payroll run and period.
- Confirm employee count.
- Confirm leave and attendance approvals.
- Confirm employee, salary, bank, and statutory data.

After locking:

- Do not expect source changes to automatically affect the run.
- Use adjustment or controlled re-run process if correction is needed.

## Step 4: Calculate Payroll

Open **Payroll Calculations**.

Check:

- Gross earnings.
- Deductions.
- Net pay.
- Employee count.
- Validation issues.
- Line trace for unusual amounts.

![Payroll calculation line trace](../assets/screenshots/payroll/payroll-calculations-line-trace.png)

Investigate unusual values before review.

## Step 5: Review Exceptions

Open **Payroll Review**.

![Payroll review exceptions](../assets/screenshots/payroll/payroll-review-exceptions.png)

For each exception:

1. Decide whether to fix source data or accept.
2. Record notes.
3. Confirm owner and approver.
4. Recalculate if source correction requires it.

Do not approve the first payroll run with unexplained exceptions.

## Step 6: Publish Outputs

Open **Payroll Outputs**.

Generate and review:

- Payslips.
- Payroll register.
- Bank advice.
- Statutory artifacts.
- Output manifest.

![Payroll output artifacts](../assets/screenshots/payroll/payroll-outputs-artifacts.png)

Publish payslips only after final approval.

## Step 7: Finance Handoff

Open **Payroll Handoff** and **Finance Manager**.

Finance should confirm:

- Net pay total.
- Bank advice.
- Payroll register.
- Statutory evidence.
- Provider exceptions.
- Audit evidence.

![Finance Manager control center](../assets/screenshots/finance-manager/control-center.png)

Do not release payment files if bank advice, provider exceptions, or net pay totals do not match approved payroll.

## Step 8: Employee and Manager Confirmation

After publish:

- Employee can see payslip in ESS.
- Manager does not have pending approvals affecting the period.
- HR can answer employee questions with payroll register and line trace evidence.
- Notification delivery is healthy.

## First Run Retrospective

After the first payroll:

| Review item | Question |
| --- | --- |
| Blockers | Which blockers repeated and need better setup? |
| Warnings | Which warnings should become hard controls? |
| Employee data | Which fields were commonly missing? |
| Attendance and leave | Were approvals completed on time? |
| Salary setup | Were components and structures correct? |
| Finance handoff | Did bank advice and reports meet finance expectations? |
| ESS | Did employees see payslips successfully? |

## Related Guides

- [Payroll Admin Monthly Checklist](../checklists/payroll-admin-monthly.md)
- [Payroll Close to Finance Handoff](../workflows/payroll-close-to-finance-handoff.md)
- [Payroll Issues](../troubleshooting/payroll.md)
- [Finance Manager Payroll Day](../checklists/finance-manager-payroll-day.md)

