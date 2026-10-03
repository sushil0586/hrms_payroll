# ESS Attendance

Use ESS Attendance to review daily attendance, understand exceptions, and request corrections when attendance is missing or incorrect.

## Purpose

Employees use this page to confirm that attendance records are accurate before payroll cutoff.

## Use this page when

- Your check-in, check-out, or working hours look incorrect.
- You missed a punch and need to request regularization.
- You need to explain late coming, early leaving, or absence.
- You want to track whether a correction request is pending, approved, or rejected.

## Main sections

| Section | Meaning |
| --- | --- |
| Today | Shows the current day status, shift, check-in, and check-out. |
| Monthly summary | Shows present, absent, late, and worked-hour totals for the active month. |
| Correction queue | Shows open correction count and gives a focused **New correction** action. |
| Regularizations | Shows correction request history with status tabs, search, and pagination. |
| Regularization detail | Opens in a modal so the employee can inspect manager decision, timeline, and correction detail without leaving the page. |
| Regularize attendance | Opens the correction form in a modal. The main page does not carry the full form inline. |
| Request summary | Shows the selected date, current status, requested status, shift, and lock state before submission. |

The page should stay single-purpose: review attendance first, then open a focused modal only when the employee needs to correct a record.

## Example: request missed punch correction

1. Open **ESS > Attendance**.
2. Select **Regularize attendance** or **New correction**.
3. Choose the attendance record for the affected date.
4. Keep the requested status as **Present** if the day status is correct.
5. Enter the corrected check-in or check-out time if the punch time is wrong.
6. Add a clear reason, such as `Forgot to punch out after client meeting`.
7. Review the request summary on the right side of the modal.
8. Select **Submit regularization**.

Expected result:

- The correction request is created.
- The status becomes pending approval if approval is required.
- Your manager can approve or reject it from MSS.
- Once approved, the corrected attendance can flow into payroll readiness.

## Example: review late-coming exception

1. Open **ESS > Attendance**.
2. Find the exception date.
3. Open the detail or correction action.
4. Read the policy reason shown, such as late check-in or missing shift.
5. Submit a correction only if the record is wrong.

Expected result:

- If the record is correct, no action is required.
- If a correction is submitted, it appears in request history.

## Modal behavior

Attendance actions should stay lightweight:

- **Regularize attendance** opens a modal with attendance record, requested status, check-in, check-out, and reason.
- **View details** opens a modal with manager decision, timeline, and correction detail.
- **Close** or the `Esc` key returns the employee to the attendance list.
- The background page remains readable but inactive while a modal is open.

This keeps ESS Attendance easy for employees: the page is for review, and the modal is for one focused correction.

## Validation behavior

| Scenario | Expected behavior |
| --- | --- |
| No reason is entered | Submit stays disabled and the modal shows `Reason required.` |
| Requested check-out is earlier than requested check-in | Submit stays disabled and the modal shows `Check time order.` |
| Attendance record is locked | Submit is blocked with a message asking the employee to contact HR before payroll close. |
| No attendance record exists | The record dropdown shows `No attendance records available`; HR must verify attendance capture or import. |
| Live API is unavailable | The page shows a workspace load issue instead of silently falling back to fake data. |

## Browser certification coverage

The ESS Attendance launch certification covers:

- Page structure: Today, Monthly summary, Correction queue, Regularizations, pagination, and no horizontal overflow.
- Detail drilldown: a regularization opens in a modal and closes with `Esc`.
- Regularization modal: reason requirement, invalid time-order blocking, locked-record guard, and request summary.
- Positive submission path: an unlocked attendance record can submit a correction through the browser against a live local backend.

## Common errors

| Message or issue | Why it happens | What to do |
| --- | --- | --- |
| No shift is assigned. | HR has not assigned a shift or roster for the employee. | Contact HR with the date and employee code. |
| Regularization window closed. | The allowed correction window has passed. | Contact HR to check whether an exception can be reopened. |
| Attendance is locked. | Payroll or attendance cutoff has locked the period. | Contact HR/payroll before payroll close. |
| Manager approval pending. | The request is waiting for manager action. | Follow up with your manager. |
| Request rejected. | Manager or HR rejected the correction. | Read the rejection reason and submit corrected evidence if allowed. |

## Payroll impact

Attendance issues can affect payroll readiness. Missing punches, unapproved regularizations, or absence exceptions may block or warn payroll before calculation.

## Related pages

- [ESS Overview](index.md)
- [ESS Task Recipes](task-recipes.md)
- [MSS Approvals](../mss/approvals.md)
- [HR Admin Attendance](../hr-admin/attendance.md)
