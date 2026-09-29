# Payroll Admin Monthly Checklist

Use this checklist for the monthly payroll cycle.

## Goal

Move payroll from source readiness to locked inputs, calculation, review, outputs, and finance handoff with evidence.

![Payroll Control summary](../assets/screenshots/payroll/payroll-control-summary.png)

## Payroll Cycle Stages

| Stage | Page | Outcome |
| --- | --- | --- |
| Setup | Payroll Setup, Salary Setup, Payroll Rules, Statutory, Providers | Configuration is ready for the period. |
| Readiness | Payroll Control | Source blockers are cleared. |
| Inputs | Payroll Inputs | Payroll source snapshot is locked. |
| Calculation | Payroll Calculations | Draft payroll is calculated and traceable. |
| Review | Payroll Review | Exceptions are explained and approved. |
| Outputs | Payroll Outputs | Payslips, registers, and artifacts are generated. |
| Handoff | Payroll Handoff | Finance and provider evidence is ready. |

## Pre-Payroll Setup Check

Open setup pages before the payroll period closes.

Check:

- Payroll calendars and periods exist.
- Pay groups are active.
- Employees are assigned to the correct pay group.
- Salary structures and components are active.
- Payroll rules are published and correct.
- Statutory setup is complete.
- Provider setup is ready if files or APIs are used.

Do not wait until calculation day to correct setup.

## Readiness Check

1. Open **Payroll Control**.
2. Confirm payroll period and run.
3. Review ready, warning, blocked, and pending approval counts.
4. Open issues and top action list.
5. Fix blockers from source pages.
6. Refresh Payroll Control.

Common source owners:

| Blocker | Owner |
| --- | --- |
| Missing employee structure | HR Admin |
| Missing salary assignment | Payroll Admin |
| Missing bank account | HR Admin or Payroll Admin |
| Pending leave or attendance | HR Admin and Manager |
| Statutory setup missing | Payroll Admin |
| Provider setup issue | Payroll Admin or technical operations |

## Lock Inputs

Open **Payroll Inputs**.

![Payroll input snapshot trace](../assets/screenshots/payroll/payroll-inputs-snapshot-trace.png)

Check before locking:

- Correct payroll run is selected.
- Employee count is expected.
- Source blockers are closed.
- Leave and attendance approvals are complete.
- Salary and bank coverage is correct.

Do not lock if HR is still changing employee, leave, attendance, salary, or bank data for the period.

## Calculate Payroll

Open **Payroll Calculations**.

Check:

- Gross earnings.
- Deductions.
- Net pay.
- Employee count.
- Line count.
- Issue register.
- Any line trace that looks unusual.

![Payroll calculation line trace](../assets/screenshots/payroll/payroll-calculations-line-trace.png)

Investigate:

- Zero net pay.
- Negative net pay.
- Very high or low gross pay.
- Missing statutory deduction.
- Component amount unexpected for one employee.

## Review Exceptions

Open **Payroll Review**.

![Payroll review exceptions](../assets/screenshots/payroll/payroll-review-exceptions.png)

For each exception:

1. Read the reason.
2. Decide whether to fix source data or accept with note.
3. Add owner notes where needed.
4. Confirm reviewer approval.

Do not approve payroll if severe exceptions are unexplained.

## Generate Outputs

Open **Payroll Outputs**.

Check:

- Payroll register generated.
- Payslips generated.
- Payslip publication status is correct.
- Bank advice exists if required.
- Statutory reports exist if required.
- Output artifacts match the final run.

Do not publish payslips until payroll review is final.

## Handoff to Finance

Open **Payroll Handoff**.

Check:

- Bank advice.
- Payroll register.
- Provider jobs.
- Statutory evidence.
- Export manifest.
- Failed or stale jobs.

Then Finance Manager should review the finance-side control center.

## Monthly Close Evidence

Keep:

- Payroll readiness status.
- Input lock proof.
- Calculation totals.
- Exception review notes.
- Approval status.
- Output artifact list.
- Finance handoff evidence.
- Provider exception notes.
- Statutory evidence.

## Do Not Continue If

- Payroll Control has unresolved blockers.
- Inputs are locked for the wrong run.
- Calculation issue register has blockers.
- Review exceptions are unexplained.
- Output totals differ from reviewed totals.
- Finance handoff has blocked provider exceptions.

## Related Guides

- [Payroll Overview](../hr-admin/payroll/index.md)
- [Payroll Close to Finance Handoff](../workflows/payroll-close-to-finance-handoff.md)
- [Payroll Issues](../troubleshooting/payroll.md)
- [Finance Manager Payroll Day](finance-manager-payroll-day.md)

