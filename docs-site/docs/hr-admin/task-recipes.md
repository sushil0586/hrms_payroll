# HR Admin Task Recipes

Task recipes are short, practical workflows for common HR Admin work. Use these when you know what you need to do but are not sure which page owns the action.

## Fix a payroll blocker

1. Open **Dashboard** or **Payroll Control**.
2. Read the blocker name and count.
3. Open the action button, such as **Fix blockers**, **Review employees**, or **Check setup health**.
4. Correct the source record on the opened page.
5. Save the change.
6. Return to **Payroll Control**.
7. Confirm the blocker count reduced.

| Blocker type | Likely page |
| --- | --- |
| Missing branch, location, department, manager | Employees or Organization |
| Missing bank account | Employee bank accounts |
| Missing salary assignment | Salary Setup |
| Attendance pending | Attendance |
| Leave pending | Leave |
| Notification failed | Notifications |

## Create an employee

1. Open **Employees**.
2. Click **New employee**.
3. Enter identity and contact details.
4. Enter legal entity, branch, location, department, designation, and manager.
5. Save the employee.
6. Reopen the employee detail.
7. Confirm structure and manager readiness badges.
8. Add salary, bank, statutory, and access details if the employee is payroll or ESS eligible.

## Correct employee structure

1. Open **Employees**.
2. Search the employee.
3. Open the selected employee.
4. Use **Actions** or edit mode.
5. Correct legal entity, branch, location, department, designation, or manager.
6. Save.
7. Confirm **Structure Ready** and **Manager Chain Ready**.

Use **Lifecycle > Movements** instead of direct edit when the change needs approval, owner tracking, or an effective date.

## Verify an employee document

1. Open **Documents**.
2. Open the document backlog or employee document list.
3. Click **Review**.
4. Confirm the file belongs to the correct employee.
5. Check document type, readable details, and expiry date.
6. Click **Verify** if valid.
7. Click **Reject** with a clear reason if invalid.
8. Confirm dashboard count updates.

## Resolve a failed notification

1. Open **Notifications**.
2. Filter by **Failed**.
3. Expand **Details and quick review** or open **Review**.
4. Read the failure message.
5. Confirm channel, provider, recipient, and template.
6. Retry only if the failure is temporary.
7. Save review notes if triage is needed.
8. Use **Notification Delivery** if many failures share the same channel.

## Apply a leave balance correction

1. Open **Leave**.
2. Search employee and policy.
3. Review current balance and transaction history.
4. Select action: credit, debit, correction, carry forward, or expiry.
5. Enter amount and reason.
6. Apply the action.
7. Approve or reject if the action enters an approval state.
8. Recheck balance and payroll readiness if payroll is open.

## Review attendance before payroll

1. Open **Attendance**.
2. Filter the payroll period.
3. Review missing, late, absent, or irregular records.
4. Approve or reject regularization requests.
5. Confirm no critical attendance blockers remain.
6. Return to **Payroll Control** before locking inputs.

## Prepare payroll for calculation

1. Open **Payroll Control**.
2. Resolve blocked items first.
3. Review warnings.
4. Open **Payroll Inputs**.
5. Select the payroll run.
6. Review snapshot readiness.
7. Lock inputs when source data is correct.
8. Open **Payroll Calculations**.

## Review and approve payroll

1. Open **Payroll Calculations**.
2. Confirm gross, deductions, net pay, line count, and issue register.
3. Resolve calculation blockers.
4. Open **Payroll Review**.
5. Review all exceptions.
6. Add notes for accepted exceptions.
7. Submit or approve according to role.
8. Final lock only after approval is complete.

## Publish payroll outputs

1. Confirm payroll review is approved and locked.
2. Open **Payroll Outputs**.
3. Generate outputs.
4. Review artifact register.
5. Publish payslips only when final.
6. Confirm ESS payslip visibility.
7. Open **Payroll Handoff** for finance or provider delivery.

## Investigate an audit question

1. Open **Reports and Audit** or **Audit**.
2. Filter by actor, module, action, date range, or record.
3. Open the relevant event.
4. Confirm what changed and when.
5. Check whether approval or workflow evidence exists.
6. Export evidence only if policy allows.

## Rule of thumb

If the issue affects payroll, fix the source record first, then return to Payroll Control. Do not patch final payroll numbers without understanding the source issue.

