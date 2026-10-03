# Approvals

Use Approvals to decide team leave requests, attendance regularization requests, and review completed decisions without mixing the workflows.

![MSS approvals](../assets/screenshots/mss/approvals.png)

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
