# Payroll Issues

Use this page when payroll is blocked, an employee is missing, salary is not calculating, bank advice does not match, or payslips are not visible.

## Start Here

Open **HR Admin > Payroll > Payroll Control** first.

![Payroll Control summary](../assets/screenshots/payroll/payroll-control-summary.png)

Check:

- Payroll cycle dates.
- Employee count in scope.
- Ready, warning, blocked, and pending approval counts.
- Current decision.
- Top action list.

Do not start from Payroll Calculations unless inputs are already locked and the issue is clearly calculation-specific.

## Payroll Is Blocked

| Symptom | Likely reason | What to do |
| --- | --- | --- |
| Blocked count is greater than zero | Source data is incomplete | Open **Issues** or **Top action list**, then fix the source page. |
| Missing primary bank account | Employee has no active payroll bank account | Open employee payroll/bank details and add or activate a primary account. |
| Missing legal entity or branch | Employee structure is incomplete | Open **Employees** or **Organization** and correct structure. |
| Missing salary assignment | Employee has no active salary for the period | Open **Salary Setup** and assign salary with correct effective date. |
| Attendance pending | Attendance period has unresolved exceptions | Open **Attendance** and close regularizations. |
| Leave pending | Leave requests can change payable days | Open **Leave** or manager approvals and close the request. |

After fixing:

1. Save the source record.
2. Return to Payroll Control.
3. Refresh the page.
4. Confirm blocked count reduced.

## Employee Is Missing From Payroll

Check these in order:

| Check | Expected value |
| --- | --- |
| Employment status | Active or payroll eligible for the period |
| Date of joining | On or before payroll period end |
| Exit date | Blank or after payable period if employee should be paid |
| Pay group | Assigned to the selected payroll run |
| Legal entity | Present and matches run setup |
| Salary assignment | Active for the payroll period |
| Payroll scope | Employee included by run filters |

Common fix:

1. Open **Employees**.
2. Search the employee.
3. Confirm status, joining date, structure, manager, and payroll details.
4. Open **Salary Setup** and confirm salary assignment.
5. Return to Payroll Control.

## Salary Is Not Calculating

Open **Payroll Calculations** and inspect the run.

![Payroll calculation line trace](../assets/screenshots/payroll/payroll-calculations-line-trace.png)

Check:

- Inputs are locked for the correct payroll run.
- Employee has an active salary structure.
- Salary effective date is valid for the period.
- Payroll rules are active and published.
- Calculation issue register is clear.
- Employee is not excluded by pay group or employment status.

If one component is wrong:

1. Open the line trace.
2. Check the source, input, and result.
3. Identify whether the error belongs to salary setup, payroll rules, attendance, leave, adjustment, or statutory setup.
4. Fix the source.
5. Re-run the allowed calculation step according to payroll lock rules.

## Bank Advice Mismatch

Use this when bank advice amount or row count differs from payroll output.

Check:

| Check | What to compare |
| --- | --- |
| Payroll run | Bank advice and payroll output must use the same run. |
| Net pay total | Bank advice total should match final net pay after exclusions. |
| Employee rows | Row count should match payable employees with valid bank accounts. |
| Held payments | Employees intentionally held should be explained. |
| Bank profile | Correct bank export format and account mapping. |
| Provider exceptions | Failed provider jobs can block or delay delivery. |

Pages to open:

- **Payroll Outputs** for generated artifacts.
- **Payroll Handoff** for provider jobs and file delivery.
- **Finance Manager** for finance-level handoff review.

![Finance Manager control center](../assets/screenshots/finance-manager/control-center.png)

Do not upload bank advice if:

- Run name is wrong.
- Net pay total differs unexpectedly.
- Provider exceptions are unresolved.
- Some employee bank accounts are missing without explanation.

## Payslip Not Visible in ESS

Check:

| Check | Expected result |
| --- | --- |
| Payroll review | Approved or final according to process |
| Payroll outputs | Payslip artifact generated |
| Publication status | Published, not draft |
| Employee access | Employee has ESS access |
| Employee identity | ESS user is linked to employee profile |
| Payroll run | Employee was included in that run |

Employee view:

![ESS payslips](../assets/screenshots/ess/payslips.png)

If the employee can log in but sees no payslip:

1. Confirm payslips are published.
2. Confirm the employee was in the payroll run.
3. Confirm user-to-employee mapping.
4. Confirm the employee has ESS access.

## Escalation Details

When escalating a payroll issue, include:

- Payroll period.
- Payroll run name.
- Employee name/code if employee-specific.
- Blocker or warning text.
- Page where the issue appears.
- Expected value and actual value.
- Whether inputs are locked.
- Whether payroll calculation or outputs were already generated.

## Related Guides

- [Payroll Control](../hr-admin/payroll/payroll-control.md)
- [Employee to Payroll](../workflows/employee-to-payroll.md)
- [Payroll Close to Finance Handoff](../workflows/payroll-close-to-finance-handoff.md)
- [Salary Setup](../hr-admin/payroll/salary-setup.md)
- [Finance Manager](../finance-manager/index.md)

