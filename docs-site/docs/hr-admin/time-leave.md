# HR Admin Time and Leave

Time and Leave pages manage attendance, leave policies, assignments, balances, and approvals.

## On This Page

- [Time And Leave Quick Navigation](#time-and-leave-quick-navigation)
- [Operating workflow](#operating-workflow)
- [Attendance](#attendance)
- [Leave](#leave)
- [Policies](#policies)
- [Time and leave support questions](#time-and-leave-support-questions)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [Signoff checklist](#signoff-checklist)

## Time And Leave Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Run daily time and leave operations | [Operating workflow](#operating-workflow) | [Practical examples](#practical-examples) |
| Review attendance exceptions | [Attendance](#attendance) | [Time and leave support questions](#time-and-leave-support-questions) |
| Manage leave balances and requests | [Leave](#leave) | [Policies](#policies) |
| Understand policy-driven behavior | [Policies](#policies) | [Negative scenarios](#negative-scenarios) |
| Prepare signoff | [Signoff checklist](#signoff-checklist) | [Troubleshooting](#troubleshooting) |

## Operating workflow

1. Configure calendars, policies, and assignments before employees start using ESS.
2. Let employees submit leave or attendance corrections from ESS.
3. Let managers approve or reject from MSS where routing is available.
4. Use HR Admin for monitoring, correction, policy setup, imports, and payroll cutoff checks.
5. Confirm Payroll Control after resolving payroll-period leave or attendance blockers.

Expected result: daily employee requests stay lightweight, while HR keeps the governed source of truth clean.

## Attendance

### Purpose

Use **Attendance** to review attendance records and regularization requests.

### What you can do

- Review attendance exceptions.
- Approve or reject regularization requests.
- Check attendance records for payroll readiness.
- Manage shifts and roster templates when available.

### Checks before payroll

- Attendance records are complete for the payroll period.
- Regularization requests are approved or rejected.
- Shift assignments are valid.
- No critical attendance blocker remains open.

### Daily operating rhythm

Review attendance exceptions daily or weekly instead of waiting for payroll close. Prioritize pending regularizations, shift gaps, and missing punches because these are the items most likely to change payable days.

## Leave

### Purpose

Use **Leave** to manage employee leave balances and leave balance transactions.

### What you can do

- Search leave balances by employee, code, policy, or leave type.
- Filter by employee, policy, and transaction status.
- Apply balance actions such as credit, debit, correction, carry forward, or expiry.
- Import balance actions in bulk.
- Review pending transactions.

### Important buttons

| Button | Meaning |
| --- | --- |
| Apply action | Applies a single leave balance change. |
| Preview import | Validates CSV rows before creating transactions. |
| Commit ready rows | Creates only rows that passed validation. |
| Approve / Reject | Completes a pending balance transaction. |

### Good practice

Do not use manual leave balance actions to hide policy configuration issues. Fix the policy or assignment when the same correction repeats.

### Payroll-ready leave state

Before payroll inputs are locked:

- Payroll-period leave requests are approved or rejected.
- Leave without pay is reflected correctly.
- Balance corrections have notes and approval.
- Carry-forward or expiry changes are completed only for the intended policy period.

## Policies

### Purpose

Use **Policies** to manage leave rules, attendance rules, and employee assignments.

### What you can do

- Create leave types.
- Create leave policies.
- Assign policies to employees or groups.
- Create attendance policies.
- Assign shifts or calendars.
- Review conflicts before rollout.

### Checks before rollout

- Effective dates are correct.
- Assignments do not overlap unexpectedly.
- Policy names are clear for HR and payroll users.
- Preview results before applying changes broadly.

## Time and leave support questions

| Question | Start here |
| --- | --- |
| Why did payable days change? | Attendance exceptions, leave requests, joining/exit dates. |
| Why is payroll blocked? | Payroll Control action list, then Attendance or Leave. |
| Why are balances wrong for many employees? | Policies and policy assignments. |
| Why can an employee not request leave? | Leave policy assignment, employee status, ESS access. |
| Why is attendance showing absent on a holiday? | Holiday calendar, shift assignment, attendance policy. |

## Practical examples

### Set up earned leave before onboarding

1. Create the leave type, for example `Earned Leave`.
2. Create the policy with accrual frequency, annual entitlement, carry-forward, and encashment rules.
3. Assign the policy to the employee group or employee.
4. Confirm the effective date starts before the employee's joining date or intended eligibility date.
5. Open ESS as a test employee and confirm the leave type is available.
6. Apply one test leave request and verify manager approval routing.

Expected result: employee can request earned leave, manager can decide, and balances update according to policy.

### Correct a leave balance

1. Open Leave balances.
2. Search the employee.
3. Choose correction, credit, debit, carry forward, or expiry.
4. Add reason and supporting reference.
5. Submit and approve according to policy.
6. Confirm the balance and transaction history.

Expected result: correction is visible in transaction history with reason and approver evidence.

### Clear attendance before payroll

1. Open Attendance exceptions.
2. Filter pending regularizations.
3. Review employee, date, shift, requested status, and reason.
4. Approve or reject each request.
5. Return to Payroll Control and confirm attendance blocker count reduced.

Expected result: payroll inputs do not lock while attendance decisions are pending.

## Negative scenarios

| Issue | User impact | Correct action |
| --- | --- | --- |
| Employee has no leave policy. | ESS leave submission fails. | Assign policy before asking employee to apply. |
| Policy effective date is wrong. | Leave type appears unavailable or balance is zero. | Correct effective date and recheck assignment. |
| Manager is missing. | Leave or attendance approval cannot route. | Fix Employee Master manager mapping. |
| Holiday calendar is wrong. | Leave units or attendance days calculate incorrectly. | Fix calendar before payroll lock. |
| Manual correction repeats monthly. | Policy setup is probably wrong. | Fix policy instead of repeated balance edits. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Employee cannot apply leave | No policy, no balance, inactive employee, or missing ESS access. | Check policy assignment, employee status, and access. |
| Leave units look wrong | Weekend/holiday/calendar/half-day rule mismatch. | Review calendar and leave policy. |
| Manager cannot approve | Manager lacks MSS access or mapping is wrong. | Fix manager profile/access. |
| Balance import rows fail | Employee/policy code mismatch or invalid transaction status. | Correct CSV and preview again. |
| Payroll still blocked | Pending leave/attendance request remains. | Open Payroll Control action list and resolve source item. |

## Signoff checklist

| Check | Expected result |
| --- | --- |
| Leave types are created. | Names and codes are clear. |
| Policies are assigned. | Target employees can see correct leave types. |
| Manager routing works. | MSS receives approval items. |
| Attendance policies are configured. | Regularization can be reviewed. |
| Payroll-period requests are closed. | No pending leave/attendance approvals before payroll lock. |
| Balance changes have evidence. | Manual changes show reason and approval. |
