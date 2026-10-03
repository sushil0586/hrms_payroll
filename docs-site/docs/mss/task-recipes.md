# MSS Task Recipes

Use these recipes when you know the manager task but not the screen.

## On This Page

- [Recipe Index](#recipe-index)
- [Approve A Leave Request](#approve-a-leave-request)
- [Ask HR Before Deciding](#ask-hr-before-deciding)
- [Reject A Leave Request](#reject-a-leave-request)
- [Approve Attendance Regularization](#approve-attendance-regularization)
- [Reject Attendance Regularization](#reject-attendance-regularization)
- [Clear Payroll Cutoff Items](#clear-payroll-cutoff-items)
- [Review Manager Notifications](#review-manager-notifications)
- [Handle Permission Or Read-Only States](#handle-permission-or-read-only-states)
- [Escalation Guidance](#escalation-guidance)
- [Good manager comments](#good-manager-comments)

## Recipe Index

| Need | Start here |
| --- | --- |
| Approve leave | [Approve A Leave Request](#approve-a-leave-request) |
| Reject leave | [Reject A Leave Request](#reject-a-leave-request) |
| Ask HR before deciding | [Ask HR Before Deciding](#ask-hr-before-deciding) |
| Approve attendance correction | [Approve Attendance Regularization](#approve-attendance-regularization) |
| Reject attendance correction | [Reject Attendance Regularization](#reject-attendance-regularization) |
| Clear payroll cutoff items | [Clear Payroll Cutoff Items](#clear-payroll-cutoff-items) |
| Review manager alerts | [Review Manager Notifications](#review-manager-notifications) |
| Handle read-only/missing permission | [Handle Permission Or Read-Only States](#handle-permission-or-read-only-states) |

## Approve A Leave Request

1. Open **MSS > Approvals**.
2. Select the **Leave** queue.
3. Scan the pending list and use **Select** if you want to compare the request on the page.
4. Click **Review** to open the focused decision dialog.
5. Check employee, leave dates, leave type, units, reason, and policy context.
6. Add a useful decision note.
7. Approve if coverage and policy are acceptable.
8. Confirm the item leaves the pending queue.

Expected result: the request is approved, the queue refreshes, and the employee can see the approved state from ESS.

## Ask HR Before Deciding

Use this path when a request is unclear.

1. Open **MSS > Approvals**.
2. Select the correct queue.
3. Click **Review** on the request.
4. Capture the employee, dates, request type, and reason.
5. Do not approve or reject yet.
6. Contact HR with the exact policy question.
7. Return to the request and record a decision after HR confirms.

## Reject A Leave Request

1. Open **MSS > Approvals**.
2. Select the **Leave** queue.
3. Click **Review** on the leave request.
4. Review dates, reason, and team coverage.
5. Enter a clear rejection comment.
6. Reject the request.
7. Confirm the employee will see the decision and reason.

Expected result: the request is rejected, the queue refreshes, and the employee has a reason they can act on.

## Approve Attendance Regularization

1. Open **MSS > Approvals**.
2. Select the **Attendance** queue.
3. Click **Review** on the regularization request.
4. Check requested date, current status, requested status, in/out time, reason, and supporting context.
5. Add a useful decision note.
6. Approve only if the request is valid.
7. Confirm the queue count updates.

Expected result: the regularization is approved and can clear attendance/payroll readiness if no other blocker exists.

## Reject Attendance Regularization

1. Open **MSS > Approvals**.
2. Select the **Attendance** queue.
3. Click **Review** on the regularization request.
4. Check attendance date, requested time, current status, reason, and any duplicate correction risk.
5. Enter a clear rejection comment, such as `Please resubmit with the correct check-out time.`
6. Reject the request.
7. Confirm the employee can see the rejection reason.

Expected result: the regularization is rejected and the employee knows what to correct before resubmitting.

## Clear Payroll Cutoff Items

1. Open **MSS > Dashboard**.
2. Open approval queues with pending counts.
3. Prioritize requests dated inside the payroll period.
4. Use **Review** to decide clear requests from the modal.
5. Escalate unclear requests to HR before payroll cutoff.
6. Confirm pending count has reduced.

## Review Manager Notifications

1. Open **MSS > Notifications**.
2. Filter unread or action-needed messages.
3. Open the notification review modal.
4. Follow the source workflow if the notification points to an approval or team item.
5. Mark read after the action is complete.

Expected result: the notification is understood, routed through the correct source workflow, and no approval is taken only from the alert text.

## Handle Permission Or Read-Only States

Use this when MSS shows a queue but does not allow action.

1. Read the notice shown on the queue or decision panel.
2. Confirm whether the request is already resolved or whether your role lacks permission.
3. If it is already resolved, do not try to decide it again.
4. If permission is missing, contact HR and ask for the exact approval permission required.
5. If the decision failed due to backend validation, keep the error message and escalate with the request details.

Expected result: managers do not make duplicate decisions, and HR receives the exact role/access issue instead of a vague “button not working” report.

## Escalation Guidance

Escalate to HR when:

- The policy outcome is unclear.
- The employee’s request conflicts with payroll cutoff.
- Supporting details are missing.
- A rejected request needs correction after submission.

## Good manager comments

Use comments that are short, specific, and useful:

- "Please resubmit with correct in-time and out-time."
- "Leave cannot be approved because team coverage is already below minimum on this date."
- "Please attach the required supporting detail and resubmit."

Avoid vague comments like "Not approved" or "Wrong request."
