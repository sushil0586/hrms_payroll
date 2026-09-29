# Payroll Control

Payroll Control is the first page to open before starting or closing payroll. It tells you whether source data is ready and what must be fixed.

## Purpose

Use Payroll Control to answer:

- Can payroll inputs be opened or locked?
- Which employees are ready?
- Which employees are blocked?
- Which warnings can be accepted?
- What setup or source data needs correction?

## Page layout

| Section | Meaning |
| --- | --- |
| Payroll cycle card | Shows the selected payroll period and current run status. |
| Step tracker | Shows readiness, inputs, calculation, review, outputs, and handoff. |
| Summary cards | Shows employees in scope, ready, warnings, blocked, and pending approvals. |
| Tabs | Splits readiness into summary, issues, employees, setup health, and evidence. |
| Current decision | Tells the user whether payroll can move forward. |
| Top action list | Shows the highest-priority items to fix first. |


![Payroll Control summary](../../assets/screenshots/payroll/payroll-control-summary.png)

## Tabs

| Tab | Use it for |
| --- | --- |
| Summary | Quick decision view for the payroll cycle. |
| Issues | Detailed blockers and warnings. |
| Employees | Employee-level readiness list. |
| Setup Health | Configuration checks for payroll setup. |
| Evidence | Audit evidence used for readiness decisions. |

## How to read this page

Use the page from top to bottom:

1. Confirm the cycle and run status.
2. Read the current decision.
3. Check summary counts.
4. Open the top action list.
5. Fix blockers by source owner.
6. Return here and confirm counts changed.

Do not treat the ready percentage as the only decision. A payroll can be mostly ready and still blocked by one critical setup issue.

## Buttons and actions

| Button | What it does | When to use |
| --- | --- | --- |
| Setup | Opens payroll setup pages. | When calendars, periods, or pay groups need correction. |
| Inputs | Opens payroll input snapshot pages. | When source readiness is clear enough to lock inputs. |
| Review | Opens payroll review pages. | After calculation is complete. |
| Report | Opens reporting evidence. | When finance or audit needs exported proof. |
| Fix blockers | Opens the relevant blocker list. | When blocked count is greater than zero. |
| Check setup health | Opens setup checks. | When setup configuration may be incomplete. |

## Common blockers

| Blocker | Meaning | Fix |
| --- | --- | --- |
| Missing primary bank account | Employee has no active payroll bank account. | Open employee bank account and add/activate account. |
| Missing legal entity | Employee is not mapped to a legal employer. | Update employee organization assignment. |
| Missing branch | Branch is required for payroll/reporting. | Update organization mapping. |
| Missing salary assignment | Employee does not have a salary structure or CTC. | Open Salary Setup and assign salary. |
| Attendance pending | Attendance records are incomplete or regularization is pending. | Open Attendance and close exceptions. |
| Leave pending | Leave data can affect payable days. | Open Leave and close pending items. |

## Who should fix what?

| Issue type | Primary owner | Support evidence to capture |
| --- | --- | --- |
| Employee master fields | HR Admin | Employee code, field name, expected value. |
| Salary assignment | Payroll Admin | Employee, structure, CTC, effective date. |
| Bank details | HR Admin or Payroll Admin | Bank status and primary account state. |
| Attendance or leave | HR Admin and Manager | Pending approval, regularization, or leave request. |
| Statutory setup | Payroll Admin | Legal entity, state, statutory pack, slab version. |
| Provider setup | Payroll Admin or operations | Provider name, mapping pack, certification status. |

## Step-by-step workflow

1. Open **Payroll Control**.
2. Confirm the payroll cycle dates.
3. Read the **Current decision**.
4. If blocked, open the **Top action list**.
5. Fix the highest count blocker first.
6. Return to Payroll Control.
7. Confirm blocked count reduced.
8. Repeat until only acceptable warnings remain.
9. Move to **Payroll Inputs**.

## FAQ

### Why is payroll blocked even if most employees are ready?

Payroll can be blocked by a small number of critical employees or setup rules. Review the top action list instead of only the ready percentage.

### Can I continue with warnings?

Warnings can sometimes continue to review, but they should be inspected before final approval.

### Why did a fixed issue still appear?

Refresh the page and confirm the source record was saved. Some readiness checks depend on the selected payroll period.

### What should I do when there are too many blockers?

Start with the highest count in the top action list. Fixing one source family, such as bank accounts or legal entity mapping, usually clears many employees at once.
