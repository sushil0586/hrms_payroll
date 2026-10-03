# Payroll Control

Payroll Control is the first page to open before starting or closing payroll. It tells you whether source data is ready and what must be fixed.

## On This Page

- [Payroll Control Quick Navigation](#payroll-control-quick-navigation)
- [Purpose](#purpose)
- [Page layout](#page-layout)
- [Who should use this page?](#who-should-use-this-page)
- [Tabs](#tabs)
- [How to read this page](#how-to-read-this-page)
- [Decision Rules](#decision-rules)
- [Buttons and actions](#buttons-and-actions)
- [Field and Count Guide](#field-and-count-guide)
- [Common blockers](#common-blockers)
- [Who should fix what?](#who-should-fix-what)
- [Step-by-step workflow](#step-by-step-workflow)
- [Pre-Input Lock Checklist](#pre-input-lock-checklist)
- [Evidence To Keep](#evidence-to-keep)
- [FAQ](#faq)

## Payroll Control Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Decide if payroll can move forward | [How to read this page](#how-to-read-this-page) | [Decision Rules](#decision-rules) |
| Understand readiness, blocked, warning, or approval counts | [Field and Count Guide](#field-and-count-guide) | [Common blockers](#common-blockers) |
| Fix the highest priority blockers | [Top action list](#page-layout) | [Who should fix what?](#who-should-fix-what) |
| Prepare for input lock | [Pre-Input Lock Checklist](#pre-input-lock-checklist) | [Evidence To Keep](#evidence-to-keep) |
| Know which payroll phase comes next | [Step-by-step workflow](#step-by-step-workflow) | [Related guides](#related-guides) |
| Explain why payroll is blocked | [Common blockers](#common-blockers) | [FAQ](#faq) |

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

## Who should use this page?

| User | Responsibility on this page |
| --- | --- |
| HR Admin | Fix employee master, organization, leave, attendance, documents, access, and manager blockers. |
| Payroll Admin | Decide whether the run can move from readiness to inputs, calculation, review, outputs, and handoff. |
| Finance Manager | Review final payroll evidence, bank advice readiness, and handoff status after payroll approval. |
| Tenant Admin | Fix role/access blockers when employees, managers, or payroll operators cannot enter the right workspace. |

Payroll Control is not only a dashboard. It is the monthly payroll decision page. Every blocked or warning count should either be fixed, assigned, or accepted with a clear reason before payroll continues.

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

## Decision Rules

| State | Meaning | Recommended action |
| --- | --- | --- |
| Ready | No critical blocker is open for the selected payroll period. | Move to Payroll Inputs after final HR review. |
| Warning | Payroll can continue only after review. | Check source issue, decide whether to fix now or accept risk. |
| Blocked | Payroll should not continue. | Fix blocker before input lock or calculation. |
| Pending approval | A manager, HR user, or payroll approver still needs to act. | Open the source approval queue and close it before input lock. |
| Locked | Inputs have been frozen. | Later source edits will not automatically affect the run. Use controlled rerun or adjustment. |

### When can warnings be accepted?

Accept warnings only when they do not change pay, compliance, employee access, or finance handoff.

Good examples:

- A non-payroll document is expiring next month.
- A manager mapping warning affects a non-payroll approval outside this pay period.
- A notification warning is already assigned and does not block payslip publication.

Do not accept warnings if they affect payable days, salary, bank account, statutory deductions, employee scope, or payslip delivery.

## Buttons and actions

| Button | What it does | When to use |
| --- | --- | --- |
| Setup | Opens payroll setup pages. | When calendars, periods, or pay groups need correction. |
| Inputs | Opens payroll input snapshot pages. | When source readiness is clear enough to lock inputs. |
| Review | Opens payroll review pages. | After calculation is complete. |
| Report | Opens reporting evidence. | When finance or audit needs exported proof. |
| Fix blockers | Opens the relevant blocker list. | When blocked count is greater than zero. |
| Check setup health | Opens setup checks. | When setup configuration may be incomplete. |

## Field and Count Guide

| Field or count | Meaning | What a user should verify |
| --- | --- | --- |
| Payroll cycle | The payroll period being assessed. | Confirm month, year, date range, legal entity, and pay group. |
| Run status | Whether the run is draft, blocked, locked, reviewed, approved, published, or handed off. | Do not edit source data blindly when the run is already locked. |
| Employees in scope | Employees included by pay group, period, and eligibility. | Compare with active employee and joiner/exit list. |
| Ready | Employees with no critical blocker for the period. | This count should rise as blockers are fixed. |
| Warnings | Issues that need review but may not block payroll. | Decide fix now versus accepted risk. |
| Blocked | Employees or setup items that should stop payroll. | Fix before moving to input lock. |
| Pending approvals | Leave, attendance, lifecycle, or payroll approvals not completed. | Route to manager/HR/payroll approver before lock. |
| Setup Health | Configuration checks for calendar, period, pay group, salary, rules, statutory, and provider setup. | Fix setup blockers before employee-level corrections. |
| Evidence | Audit and report evidence for decisions. | Keep recent evidence for payroll signoff. |

## Common blockers

| Blocker | Meaning | Fix |
| --- | --- | --- |
| Missing primary bank account | Employee has no active payroll bank account. | Open employee bank account and add/activate account. |
| Missing legal entity | Employee is not mapped to a legal employer. | Update employee organization assignment. |
| Missing branch | Branch is required for payroll/reporting. | Update organization mapping. |
| Missing salary assignment | Employee does not have a salary structure or CTC. | Open Salary Setup and assign salary. |
| Attendance pending | Attendance records are incomplete or regularization is pending. | Open Attendance and close exceptions. |
| Leave pending | Leave data can affect payable days. | Open Leave and close pending items. |
| Missing pay group | Employee is not assigned to a pay group for the period. | Open Payroll Setup > Assignments. |
| Missing statutory profile | Employee or legal entity does not have required statutory context. | Open Statutory setup or Employee statutory fields. |
| Pending document proof | Payroll-critical proof is missing or rejected. | Open Documents and verify required proof. |
| Manager approval stuck | Approval is waiting with a manager who cannot act. | Fix manager mapping, MSS role, or workflow fallback. |

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

## Example: September Payroll Readiness For Accerio India

### Scenario

Accerio India is preparing September 2026 payroll. Payroll Control shows:

- 298 employees in scope.
- 169 ready.
- 35 warnings.
- 94 blocked.
- 15 pending approvals.

The page says **Fix blockers before payroll inputs**.

### Steps

1. Open **HR Admin > Payroll > Payroll Control**.
2. Confirm the payroll cycle is **01 Sep 2026 - 30 Sep 2026**.
3. Open **Top action list**.
4. Start with the highest blocker count.
5. If top blocker is **Missing primary bank account**, open employee records or bank import.
6. Fix bank details for employees with missing primary account.
7. Return to Payroll Control and refresh readiness.
8. Next, fix **Missing legal entity** and **Missing branch** by opening Employee Master or Organization.
9. Open **Pending approvals** and route leave or attendance items to managers.
10. Recheck warnings and decide whether any can be accepted.
11. Move to Payroll Inputs only after blocked count is zero or the business has formally accepted an allowed warning.

### Expected result

- Blocked count decreases after source fixes.
- Pending approvals are cleared before input lock.
- The current decision changes from blocked to ready or warning-ready.
- Evidence exists for any accepted warning.

## Example: Fix Missing Primary Bank Account

### Scenario

Payroll Control shows **Missing primary bank account: 12 employees**.

### Steps

1. Click **Fix blockers** or open **Issues**.
2. Filter issue type to **Missing primary bank account**.
3. Open one affected employee.
4. Confirm whether bank details are absent, inactive, unverified, or not marked primary.
5. Add or correct the bank account.
6. Mark the valid payroll account as primary.
7. Save.
8. Repeat using bulk import if many employees are affected.
9. Return to Payroll Control and refresh.

### Expected result

- Employee no longer appears in the bank blocker list.
- Payroll Control blocked count reduces.
- Audit shows who corrected bank data.

## Example: Resolve Pending Leave Approval Before Payroll

### Scenario

Payroll Control shows pending approvals because an employee applied leave during the payroll period.

### Steps

1. Open **Pending approvals** from Payroll Control.
2. Identify whether the pending item is leave, attendance, lifecycle, or payroll review.
3. Open the source page.
4. If leave approval is with a manager, ask manager to approve or reject from MSS.
5. If manager cannot act, check manager mapping and MSS access.
6. After approval, return to Payroll Control.
7. Refresh readiness.

### Expected result

- Pending approval count reduces.
- Payroll inputs will use final approved leave status.
- Payable days are not changed after input lock without a rerun.

## Example: Accept a Non-Critical Warning

### Scenario

Payroll Control shows a warning: `Employee document expiring in 45 days`. The document does not affect September salary, statutory deduction, or bank payout.

### Steps

1. Open the warning detail.
2. Confirm whether it affects salary, payable days, bank, statutory, or payslip publication.
3. If not payroll-critical, assign owner and due date.
4. Add note: `Document renewal due after September payroll; HR owner assigned.`
5. Continue payroll readiness.

### Expected result

- Warning remains traceable.
- Payroll can proceed without hiding the risk.
- HR still has an owner for follow-up.

## Negative Scenario: Ready Percentage Looks High But Payroll Is Blocked

### Symptom

Payroll is 83% ready but the page still says blocked.

### Reason

One or more critical blockers exist. Payroll readiness is not a simple percentage threshold. A single employee missing bank account, legal entity, salary assignment, or statutory setup can block payroll if the employee is in scope.

### Correct action

Open **Top action list**, fix blockers by source family, and ignore the percentage until blocked count reaches zero or an authorized risk decision exists.

## Negative Scenario: Source Data Changes After Input Lock

### Symptom

HR fixes employee salary, bank, leave, or attendance after Payroll Inputs are locked, but Payroll Control or calculation still shows old values.

### Reason

Locked payroll inputs are an immutable snapshot. Later source changes do not automatically update a locked run.

### Correct action

Use the payroll rerun, unlock, or adjustment process defined for the tenant. Do not manually patch final outputs without evidence.

## Negative Scenario: Employee Missing From Payroll Scope

### Common causes

- Employee is not active for the payroll period.
- Employee has no pay group assignment.
- Date of joining is after the period.
- Exit date is before the period.
- Employee belongs to a different legal entity or branch filter.
- Employee salary assignment starts after the payroll period.

### Correct action

Check Employee Master, Payroll Setup > Assignments, Salary Setup, and Lifecycle effective dates. Then return to Payroll Control and verify scope.

## Pre-Input Lock Checklist

Before moving to Payroll Inputs, confirm:

| Check | Expected result |
| --- | --- |
| Payroll cycle | Correct month, year, legal entity, and pay group. |
| Blocked count | Zero, or no payroll-critical blocker remains. |
| Pending approvals | Zero for leave, attendance, lifecycle, and payroll-impacting approvals. |
| Employee scope | Active, joiner, exit, and on-notice employees are expected. |
| Bank coverage | Every payable employee has a valid primary bank account or accepted exception. |
| Salary coverage | Every payable employee has salary structure, CTC, and effective date. |
| Organization coverage | Legal entity, branch, department, location, and cost center are mapped. |
| Statutory coverage | PAN, PF/UAN, ESI, PT, TDS, and declaration context are correct where applicable. |
| Leave and attendance | Pending items are cleared or accepted with evidence. |
| Documents | Payroll-critical proof is accepted or exception is documented. |
| Evidence | Reports and audit evidence are recent for the period. |

## Evidence To Keep

| Evidence | Why |
| --- | --- |
| Payroll Control summary | Shows readiness decision at the time of input lock. |
| Issues list | Shows blockers cleared or accepted. |
| Employee readiness export | Shows employee-level status. |
| Leave and attendance report | Supports payable days. |
| Audit trail for corrections | Shows who changed salary, bank, organization, or approvals. |
| Warning acceptance notes | Explains why payroll continued. |

## FAQ

### Why is payroll blocked even if most employees are ready?

Payroll can be blocked by a small number of critical employees or setup rules. Review the top action list instead of only the ready percentage.

### Can I continue with warnings?

Warnings can sometimes continue to review, but they should be inspected before final approval.

### Why did a fixed issue still appear?

Refresh the page and confirm the source record was saved. Some readiness checks depend on the selected payroll period.

### What should I do when there are too many blockers?

Start with the highest count in the top action list. Fixing one source family, such as bank accounts or legal entity mapping, usually clears many employees at once.

### Should I fix blockers from Payroll Control or the source page?

Fix the source page. Payroll Control tells you what is wrong, but the owning pages are Employees, Organization, Salary Setup, Leave, Attendance, Documents, Statutory, and Payroll Setup.

### Can payroll continue when one employee is blocked?

Only if the employee is removed from scope by a valid business rule or there is an authorized exception. Do not bypass a blocker silently.

### What is the difference between Payroll Control and Payroll Inputs?

Payroll Control checks whether source data is ready. Payroll Inputs freezes source data into a payroll snapshot. Once inputs are locked, later source changes need a controlled rerun or adjustment.

## Related guides

- [Payroll Overview](index.md)
- [Payroll Setup](payroll-setup.md)
- [Salary Setup](salary-setup.md)
- [Payroll Inputs](payroll-inputs.md)
- [Payroll Review](payroll-review.md)
- [Employee to Payroll](../../workflows/employee-to-payroll.md)
- [Leave and Attendance to Payroll](../../workflows/leave-attendance-to-payroll.md)
- [Payroll Issues](../../troubleshooting/payroll.md)
