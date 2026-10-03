# Approvals

Use Approvals to decide team leave requests, attendance regularization requests, and review completed decisions without mixing the workflows.

![MSS approvals](../assets/screenshots/mss/approvals.png)

## On This Page

- [Approval Quick Navigation](#approval-quick-navigation)
- [Page Purpose](#page-purpose)
- [Main Sections](#main-sections)
- [Screen Labels To Recognize](#screen-labels-to-recognize)
- [Controls](#controls)
- [How To Choose The Right View](#how-to-choose-the-right-view)
- [Decision Quality Checklist](#decision-quality-checklist)
- [Focused Review Dialog](#focused-review-dialog)
- [Request statuses](#request-statuses)
- [Leave approval checks](#leave-approval-checks)
- [Attendance regularization checks](#attendance-regularization-checks)
- [Positive and negative scenarios](#positive-and-negative-scenarios)
- [When to escalate](#when-to-escalate)
- [FAQ](#faq)

## Approval Quick Navigation

| I need to | Start here | Verify before finishing |
| --- | --- | --- |
| Decide leave request | Leave tab > request row > **Review** | Employee, dates, leave type, units, reason, policy context, coverage, and manager note. |
| Decide leave cancellation | Leave tab > cancellation request > **Review** | Original leave context, cancellation reason, reapproval route, and payroll/cutoff impact. |
| Decide attendance correction | Attendance tab > request row > **Review** | Current status, requested status, attendance date, punch times, reason, and duplicate risk. |
| Inspect a row without deciding | **Select** | Selected detail panel updates without opening the decision dialog. |
| Review direct-linked item | Link with `leaveId` or `regId` | Page shows “Opened from direct link” when the item is outside the current page. |
| Check completed decisions | History tab | Read-only history is separate from pending queues; do not decide from history. |
| Handle missing permission | Queue access notice | Ask HR to assign leave approval or attendance review permission. |

## Page Purpose

The approvals page is split into focused views so managers can work on one responsibility at a time.

- **Leave** is for leave and leave cancellation decisions.
- **Attendance** is for attendance regularization decisions.
- **History** is read-only and reserved for completed manager decisions.

## Main Sections

| Section | What it shows | How to use it |
| --- | --- | --- |
| Approval views | Leave, attendance, and history tabs. | Choose one manager task before reviewing rows. |
| Focus summary | Explains the selected approval view and next step. | Confirm you are in the right workflow before acting. |
| Request list | Pending requests for the selected queue. | Select a row or open the focused review dialog. |
| Request detail | Employee, dates, request type, reason, and status. | Verify the business context without crowding the queue. |
| Review modal | Full approval context, decision note, approve, and reject controls. | Record a clear decision only after checking the detail. |

## Screen Labels To Recognize

| Screen label | What it means |
| --- | --- |
| Approval views | Leave, attendance, and history navigation. |
| Pending leave requests | Leave approval queue. |
| Selected leave request | Detail panel for the chosen leave request. |
| Pending attendance fixes | Attendance regularization approval queue. |
| Selected attendance request | Detail panel for the chosen correction request. |
| Completed decisions | Read-only history of manager decisions. |
| Review | Opens the full decision dialog. |

## Controls

| Control | Purpose |
| --- | --- |
| Leave tab | Show leave requests. |
| Attendance tab | Show attendance regularization requests. |
| History tab | Show completed manager decisions when history data is available. |
| Select | Keep the request selected on the page for quick comparison. |
| Review | Open the focused approval dialog. |
| Approve | Approve the request from the review dialog. |
| Reject | Reject the request from the review dialog with a reason. |
| Decision note | Capture manager context for the decision. |
| Pagination | Move through long request queues. |

## How To Choose The Right View

| Situation | Open this view | Why |
| --- | --- | --- |
| Employee applied for leave. | Leave | Dates, leave type, units, and balance context matter. |
| Employee requested attendance correction. | Attendance | Current status, requested status, and time correction matter. |
| Employee asks what happened to an old request. | History | Completed decisions should be checked without touching pending queues. |
| Notification says a manager decision is needed. | Leave or Attendance | Open the source workflow from the notification. |

## Decision Quality Checklist

- Check the employee and request period.
- Confirm the reason is understandable.
- Check team coverage for leave.
- For attendance corrections, confirm the requested time is plausible.
- Add a rejection comment that the employee can act on.

## Focused Review Dialog

The queue page is intentionally scan-first. Use **Review** when a manager is ready to decide.

The review dialog shows:

- Employee and employee code.
- Leave period or attendance date.
- Requested leave units or requested attendance correction.
- Department, designation, current status, and applied date.
- Employee reason or cancellation reason.
- Decision note, approve, and reject controls.

Example: if Riya Sharma requests casual leave for 03 Oct 2026, open **Review**, confirm the date and reason, add "Coverage checked with team roster", then approve. If the reason is unclear, reject with a note such as "Please resubmit with medical certificate."

## Request statuses

| Status | Meaning | Manager action |
| --- | --- | --- |
| Pending | Waiting for manager decision. | Review and approve/reject. |
| Approved | Manager accepted the request. | No action unless HR asks for correction. |
| Rejected | Manager declined the request. | Ensure the reason is clear. |
| Cancelled | Employee or workflow cancelled it. | No action. |
| Escalated | HR or another reviewer is involved. | Wait or follow the escalation note. |

## Leave approval checks

Before approving leave, confirm:

- Dates and leave type are correct.
- Employee has enough balance or policy allows the request.
- Team coverage is acceptable.
- Request does not conflict with a critical business day.
- Reason is sufficient if policy requires it.

## Attendance regularization checks

Before approving attendance correction, confirm:

- Requested date is correct.
- In/out times are plausible.
- Reason explains the exception.
- It does not duplicate an already-approved correction.
- Payroll cutoff is considered for old requests.

## Positive and negative scenarios

| Scenario | Expected result |
| --- | --- |
| Manager has leave approval permission | Leave queue is visible and **Review** can approve/reject pending leave requests. |
| Manager lacks leave approval permission | Leave queue shows a permission notice instead of actionable controls. |
| Manager has attendance review permission | Attendance queue is visible and **Review** can approve/reject pending regularizations. |
| Manager lacks attendance review permission | Attendance queue shows a permission notice instead of actionable controls. |
| Request is already approved/rejected/cancelled | Decision panel becomes read-only and says only pending items can be actioned. |
| Direct link opens a request outside current page | Selected detail loads with an “Opened from direct link” notice. |
| API decision fails | Dialog shows `Action failed` with the backend message; queue should not silently change. |
| Decision succeeds | Dialog shows action saved and the MSS queue refreshes. |

## When to escalate

Escalate to HR when:

- Policy result is unclear.
- Request affects payroll after cutoff.
- Employee disputes a previous decision.
- Balance, attendance, or employee data looks wrong.
- You cannot verify supporting context.

## FAQ

### Can I change a decision after approving?

Usually HR must help correct an already-approved request, especially if payroll has consumed it. Contact HR with the request details.

### Why did an approved request still affect payroll incorrectly?

Payroll may have already locked inputs, or another employee record issue may exist. Escalate to HR/payroll with employee, date, and request type.
