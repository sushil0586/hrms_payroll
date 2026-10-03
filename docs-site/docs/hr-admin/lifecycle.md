# Lifecycle

Lifecycle manages employee events that need process control: joining, onboarding tasks, probation, transfers, promotions, reporting changes, resignation, termination, exit, and final settlement readiness.

Use Lifecycle when a change should not be a silent Employee Master edit. Lifecycle gives the change an owner, status, due date, effective date, evidence, and approval path.

## What Lifecycle Covers

| Area | What it controls | Why it matters |
| --- | --- | --- |
| Joiners | Onboarding tasks after an employee record exists. | Ensures access, documents, salary, bank, statutory, leave, and attendance setup are complete. |
| Movements | Transfer, promotion, department change, branch change, designation change, manager change. | Preserves effective date, approval, and audit evidence. |
| Probation | Confirmation, extension, or rejection of probation. | Updates confirmation status and downstream eligibility. |
| Exits | Resignation, termination, last working date, handover, access decision, and F&F readiness. | Controls payroll stop, access removal, documents, assets, and settlement. |
| Assignments | Owner, due date, escalation, and bulk ownership. | Makes HR work trackable instead of relying on memory. |

Lifecycle does not replace Employee Master. It is the workflow layer above Employee Master.

| Need | Use |
| --- | --- |
| Correct typo in employee name | Employees |
| Add missing department after import | Employees |
| Create a joining checklist for new hire | Lifecycle Joiners |
| Transfer employee to a new branch from next month | Lifecycle Movements |
| Promote employee with new designation and grade | Lifecycle Movements plus Salary Setup if compensation changes |
| Change manager with approval and effective date | Lifecycle Movements |
| Confirm probation | Lifecycle Probation |
| Start resignation and final settlement | Lifecycle Exits |
| Track owner, due date, reminder, escalation, or evidence | Lifecycle |

## Use This Page When

- A new employee needs onboarding tasks after Employee Master creation.
- A transfer, promotion, branch change, department change, or reporting change is planned.
- A manager change affects approvals or MSS visibility.
- Probation needs confirmation, extension, or rejection.
- An employee resigns or is terminated.
- Final working date, access removal, assets, documents, or F&F readiness must be tracked.
- Payroll has blockers related to joining, movement, manager, or exit state.
- Launch readiness shows lifecycle blockers.

## Lifecycle Queues

| Queue | Purpose | Typical owner |
| --- | --- | --- |
| Joiners | Tracks onboarding readiness for new employees. | HR Admin |
| Movements | Tracks transfers, promotions, department/branch/manager changes. | HR Admin / Manager |
| Probation | Tracks confirmation, extension, or probation decision. | HR Admin / Manager |
| Exits | Tracks resignation, termination, handover, access, and final settlement. | HR Admin / Payroll Admin |
| Assignments | Tracks owner, due date, and status for lifecycle tasks. | HR Ops lead |

![Lifecycle overview](../assets/screenshots/hr-admin/lifecycle-overview.png)

## Status Model

| Status | Meaning | User action |
| --- | --- | --- |
| Draft | Record created but not ready for review. | Complete missing details. |
| Submitted | Waiting for owner or approver review. | Reviewer validates business data. |
| In review | HR, manager, payroll, or finance is reviewing. | Resolve questions and attach evidence. |
| Approved | Decision accepted and ready for effective-date processing. | Monitor effective date and downstream updates. |
| Rejected | Sent back or denied. | Fix and resubmit if valid. |
| Effective | Change has taken effect. | Confirm Employee Master and related modules updated. |
| Closed | Workflow is complete. | Keep audit evidence. |
| Overdue | Due date has passed. | Reassign, escalate, or complete with evidence. |

## Key Fields

| Field | Meaning | Why it matters |
| --- | --- | --- |
| Employee | Person affected by the lifecycle event. | Links event to employee master, payroll, reports, and audit. |
| Event type | Joiner, movement, probation, exit, or other configured lifecycle type. | Determines required fields and workflow. |
| Effective date | Date from which the change applies. | Payroll, manager routing, leave, attendance, salary, and reporting depend on it. |
| Current structure | Existing branch, department, manager, designation, grade, cost center, or status. | Gives reviewer context. |
| Target structure | New branch, department, manager, designation, grade, cost center, or status. | Defines what should change. |
| Owner | Person responsible for the task. | Prevents unowned lifecycle blockers. |
| Due date | Date by which action must be completed. | Drives overdue tracking and escalation. |
| Approval status | Review decision. | Prevents unauthorized structure changes. |
| Evidence | Notes, attachments, handover status, or audit context. | Required for signoff and later audit. |

## Buttons And Actions

| Button or action | What it does | Expected result |
| --- | --- | --- |
| Create movement | Starts a planned employee change. | Movement record opens with employee and target fields. |
| Apply filters | Filters lifecycle or movement records. | Queue shows matching records. |
| Clear filters | Resets filters. | Queue returns to default view. |
| Select page | Selects visible records for bulk action. | Selected count updates. |
| Assign owner | Assigns selected items to an owner. | Owner field updates for selected records. |
| Set status | Changes selected item status when allowed. | Status updates without losing audit context. |
| Review | Opens item detail or review page. | User can inspect and act on the lifecycle item. |
| Back to lifecycle | Returns from detail/movement page to overview. | User returns to queue. |

## Joiner Workflow

Use Joiners after the employee record exists in [Employees](employees.md).

### Example: New Joiner For Bengaluru HR Team

Riya Sharma joins Accerio India Pvt Ltd on 01 Oct 2026.

1. Create employee in **Employees**.
2. Open **Lifecycle > Joiners**.
3. Create or open joiner task for `Riya Sharma`.
4. Assign onboarding owner.
5. Set due date before joining date where possible.
6. Track tasks:
   - Employee profile complete.
   - ESS access created and invite email delivered.
   - Required documents requested.
   - Salary setup assigned.
   - Primary bank account captured.
   - Statutory profile captured.
   - Leave policy and opening balance ready.
   - Attendance shift and holiday calendar ready.
   - Manager assigned and MSS access ready.
7. Close only after evidence is visible.
8. Open Payroll Control and confirm no unexpected joiner blocker remains.

Expected result:

- Employee is ready to work, self-serve, and be included in payroll if applicable.
- Onboarding tasks are auditable.

### Joiner Checklist

| Task | Expected result |
| --- | --- |
| Employee Master | Identity, status, structure, manager ready. |
| Access | ESS/MSS/admin access assigned only where needed. |
| Documents | Required document list visible to employee. |
| Salary | Salary assignment exists if employee is payable. |
| Bank | Active primary bank account exists. |
| Statutory | PAN/PF/ESIC/PT/TDS profile ready where applicable. |
| Leave | Policy assignment and opening balance ready. |
| Attendance | Shift, weekly off, holiday calendar, and attendance policy ready. |
| Payroll | Employee not blocked in Payroll Control. |

## Movement Workflow

Use Movements for changes that are meaningful enough to require owner, effective date, approval, or evidence.

### Movement Types

| Movement type | Use when | Downstream impact |
| --- | --- | --- |
| Transfer | Employee moves branch, location, legal entity, or business unit. | Payroll, statutory, attendance, holiday, cost center, reports. |
| Promotion | Employee gets new designation, grade, level, or compensation path. | Salary Setup, approvals, reports. |
| Department change | Employee moves to another department. | Reports, approvals, cost center, leave/attendance policy scope. |
| Manager change | Reporting manager changes. | MSS visibility, leave/attendance approvals, escalation. |
| Cost center change | Finance allocation changes. | Payroll posting and finance handoff. |

### Example: Transfer From Bengaluru To Mumbai

Business case: An employee moves from Bengaluru HO to Mumbai Branch effective 01 Nov 2026.

1. Confirm Mumbai location and branch exist in [Organization](organization.md).
2. Confirm Mumbai attendance/holiday setup exists.
3. Open **Lifecycle > Movements**.
4. Click **Create movement**.
5. Select the employee.
6. Movement type: `Transfer`.
7. Effective date: `01 Nov 2026`.
8. Current branch/location: Bengaluru HO / Bengaluru.
9. Target branch/location: Mumbai Branch / Mumbai.
10. Update target department, cost center, or manager if needed.
11. Assign owner.
12. Submit for review.
13. Approver validates business reason and downstream impact.
14. Approve movement.
15. On or after effective date, confirm Employee Master shows the new branch/location.
16. Review Payroll Control for branch/statutory/attendance warnings.

Expected result:

- Transfer is traceable.
- Employee structure changes only with approval.
- Payroll and attendance can use the correct location from the effective date.

### Example: Promotion With Salary Impact

Business case: Employee is promoted from HR Executive to Assistant Manager effective 01 Oct 2026.

1. Confirm designation and grade exist in Organization.
2. Open **Lifecycle > Movements**.
3. Create movement.
4. Movement type: `Promotion`.
5. Effective date: `01 Oct 2026`.
6. Target designation: `Assistant Manager`.
7. Target grade: new grade if applicable.
8. Assign owner and submit.
9. Approver approves promotion.
10. Open **Salary Setup** if CTC or structure changes.
11. Add salary revision with same effective date if required.
12. Confirm Payroll Control has no salary/effective-date mismatch.

Expected result:

- Designation/grade change has audit trail.
- Salary revision is handled in salary module, not hidden inside the movement.

### Example: Manager Change

Business case: Employee will report to Karan Mehta from 15 Oct 2026.

1. Confirm Karan Mehta is active in Employees.
2. Confirm Karan has MSS access if approvals are required.
3. Open **Lifecycle > Movements**.
4. Create manager-change movement.
5. Set effective date `15 Oct 2026`.
6. Select current manager and target manager.
7. Submit and approve.
8. Confirm employee manager updates after effective date.
9. Ask target manager to open MSS and verify direct report visibility.

Expected result:

- Approvals route to the correct manager from the effective date.
- No manager chain loop is introduced.

## Probation Workflow

Use Probation when the employee's confirmation status must be reviewed.

### Example: Confirm Employee After Probation

1. Open **Lifecycle > Probation**.
2. Filter employees due for review.
3. Open employee probation item.
4. Review manager feedback.
5. Decision: confirm, extend, or reject according to policy.
6. If confirming, enter confirmation date.
7. Save decision.
8. Confirm Employee Master shows confirmation date.
9. Review downstream eligibility if confirmation affects leave, benefits, salary, or documents.

Expected result:

- Probation decision is recorded.
- Employee status and confirmation date are auditable.

### Probation Decisions

| Decision | Use when | Follow-up |
| --- | --- | --- |
| Confirm | Employee successfully completes probation. | Update confirmation date and any eligibility rules. |
| Extend | More review period is needed. | Set new probation end date and owner. |
| Reject / separate | Employee will not continue. | Start exit workflow and payroll/F&F review. |

## Exit Workflow

Use Exits for resignation, termination, retirement, or end of contract. Do not only edit employee status to exited unless no workflow or payroll impact exists.

### Example: Resignation And Final Settlement Readiness

Business case: Employee resigns on 10 Oct 2026 with last working day 31 Oct 2026.

1. Open **Lifecycle > Exits**.
2. Create exit record.
3. Select employee.
4. Exit type: resignation.
5. Resignation date: `10 Oct 2026`.
6. Last working day: `31 Oct 2026`.
7. Assign owner.
8. Track tasks:
   - Manager approval or acceptance.
   - Handover complete.
   - Assets returned.
   - Documents/evidence complete.
   - Access removal date decided.
   - Leave encashment or recovery reviewed.
   - Notice recovery or payout reviewed.
   - Salary stop date and payable days reviewed.
   - F&F adjustment prepared.
9. Open Payroll Control and payroll adjustments/settlements before payroll finalization.
10. Close exit only after final evidence is complete.

Expected result:

- Employee status, access, payable days, and final settlement are handled deliberately.
- Payroll has clear F&F inputs.

### Exit Checklist

| Area | Expected result |
| --- | --- |
| Employee status | On notice until last working day, exited after exit completion. |
| Final working date | Correct and approved. |
| Access | Disable date follows company policy. |
| Leave | Encashment or recovery calculated if applicable. |
| Attendance | Last payable day and attendance corrections complete. |
| Payroll | Salary stop date and F&F adjustments ready. |
| Documents | Exit letters, handover, or required evidence attached if applicable. |
| Assets | Returned, recovered, or approved exception recorded. |

## Bulk Owner And Status Actions

Bulk actions are useful for queues but risky if filters are wrong.

Before using a bulk action:

1. Apply filters first.
2. Confirm the row count.
3. Select visible records only if all need the same action.
4. Assign owner or status.
5. Reopen a sample record.
6. Confirm owner/status changed correctly.

Do not bulk close records that still require evidence or approval.

## Payroll Impact

Lifecycle changes are payroll-sensitive when they affect:

- Employee status.
- Joining date.
- Exit date.
- Last working day.
- Legal entity.
- Branch.
- Location.
- Department.
- Cost center.
- Pay group.
- Manager approval.
- Salary effective date.
- Leave encashment or loss of pay.
- Attendance payable days.

Before payroll close, review:

| Item | What to verify |
| --- | --- |
| Joiners | Payroll-required joiner tasks are complete. |
| Transfers | Approved and effective changes are reflected in Employee Master. |
| Promotions | Salary revision is entered where pay changes. |
| Manager changes | Approval routing and MSS visibility are ready. |
| Probation | Confirmation or extension does not affect benefits unexpectedly. |
| Exits | Last working date, status, access, leave encashment, and F&F are ready. |

## Positive End-To-End Scenario

### Scenario

HR processes a transfer and payroll remains clean.

### Steps

1. Organization masters exist for target branch and location.
2. HR creates transfer movement with effective date.
3. Owner is assigned.
4. Approver reviews and approves.
5. Effective date arrives.
6. Employee Master reflects target branch/location.
7. Attendance and holiday setup for target branch is valid.
8. Payroll Control shows no unresolved branch or attendance blocker.

### Result

Transfer is auditable, employee data is correct, and payroll can proceed.

## Negative Scenarios And Fixes

| Scenario | What user sees | Root cause | Fix |
| --- | --- | --- | --- |
| Transfer does not update Employee Master | Movement approved but employee still in old branch. | Effective date not reached or effective processing incomplete. | Check effective date, status, and reopen movement review. |
| Payroll blocker after transfer | Payroll shows branch/location/statutory warning. | Target branch setup missing attendance/statutory/payroll context. | Fix Organization, Attendance, or statutory setup. |
| Manager approvals route to old manager | Leave/attendance request goes to previous manager. | Manager change not effective or manager lacks MSS access. | Confirm movement status/effective date and manager access. |
| Probation item overdue | Dashboard shows overdue lifecycle item. | No owner or due date passed. | Assign owner and complete decision. |
| Exit employee still has access | Exited user can still log in. | Access removal was not completed. | Disable membership or remove role according to policy. |
| F&F missing from payroll | Exited employee not included in settlement. | Exit date/F&F adjustment not prepared before payroll close. | Review exit workflow and create settlement/adjustment. |
| Bulk status changed wrong records | Many items moved unexpectedly. | Filters or selected page were wrong. | Review audit, restore statuses manually, and tighten bulk action process. |

## Troubleshooting

| Problem | First check | Then check |
| --- | --- | --- |
| Movement is not visible | Filters and date range | Employee, owner, movement type |
| Movement cannot be approved | Required fields | Approver role and workflow status |
| Employee data did not change | Movement status and effective date | Whether downstream processing ran |
| Manager cannot see new direct report | Employee manager field | Manager MSS access and reporting loop |
| Exit still blocks payroll | Last working date and status | F&F, leave encashment, attendance corrections |
| Joiner still blocks payroll | Joiner tasks | Salary, bank, statutory, leave, attendance, access |

## Quality Checklist

- Lifecycle items have owner and due date.
- Effective dates are correct.
- Target structure exists before movement approval.
- Payroll-impacting changes are reviewed before payroll close.
- Manager changes include MSS access check.
- Promotions with pay change include Salary Setup action.
- Exits include access decision and F&F readiness.
- Overdue items are not ignored.
- Closed items have enough evidence for audit.

## FAQ

### Why should I not directly edit a transfer in Employees?

A direct edit changes Employee Master but may skip approval, ownership, effective date, and audit evidence. Use Movements when the transfer is operationally meaningful.

### Can an approved movement still block payroll?

Yes. If the movement affects legal entity, branch, location, pay group, cost center, manager approval, attendance, or statutory context and has not become effective correctly, payroll readiness can still show blockers or warnings.

### Should exits remove access immediately?

Follow company policy. Some exits require access until last working day; others require immediate restriction. Always record the access decision in exit evidence.

### When should promotion update salary?

Promotion updates designation/grade through Lifecycle. Salary changes should be entered in Salary Setup with the correct effective date.

### What should HR do with overdue lifecycle items?

Filter overdue items, assign or reassign owner, and resolve payroll or launch-impacting items first. Do not close overdue items without evidence.

## Related Guides

- [Employees](employees.md)
- [Organization](organization.md)
- [Salary Setup](payroll/salary-setup.md)
- [Adjustments and Settlements](payroll/adjustments-settlements.md)
- [Payroll Control](payroll/payroll-control.md)
- [Attendance](attendance.md)
- [Leave](leave.md)
- [Access Issues](../troubleshooting/access.md)
- [Payroll Issues](../troubleshooting/payroll.md)
