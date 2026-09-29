# Attendance

Attendance manages attendance records, exceptions, regularization requests, shifts, and payroll readiness inputs.

## Purpose

Use Attendance to make sure payable days and attendance exceptions are reviewed before payroll close.

## Use this page when

- Employees have missing punches or attendance exceptions.
- Managers need to review regularization requests.
- Payroll readiness shows attendance blockers.
- Shift or attendance policy setup needs validation.
- Attendance records need audit evidence.

## Page sections

| Section | Meaning |
| --- | --- |
| Attendance records | Daily employee attendance status. |
| Exceptions | Missing, late, absent, or irregular attendance items. |
| Regularization requests | Employee-submitted correction requests. |
| Review windows | Period windows used before payroll close. |
| Shift coverage | Shift assignment and calendar coverage checks. |

![Attendance exceptions and operations](../assets/screenshots/hr-admin/attendance-exceptions.png)

## Attendance statuses

| Status | Meaning | Typical action |
| --- | --- | --- |
| Present | Attendance exists and no exception is open. | No action. |
| Absent | Employee is marked absent. | Check leave, holiday, week off, or regularization. |
| Missing punch | In or out punch is missing. | Ask employee/manager for correction or reject. |
| Late / early | Attendance rule detected timing exception. | Review policy and manager decision. |
| Pending regularization | Employee submitted a correction request. | Approve or reject before payroll close. |
| Approved regularization | Correction accepted. | Confirm payable-day impact. |
| Rejected regularization | Correction not accepted. | Ensure reason is clear. |
| Shift missing | No valid shift assignment exists. | Fix shift/roster assignment. |

## Daily operating workflow

1. Open Attendance.
2. Filter to the current period or today.
3. Review exceptions by severity.
4. Open regularization requests first.
5. Approve only when the reason and evidence are valid.
6. Reject with a clear reason when correction is not accepted.
7. Check shift gaps and holiday/week-off conflicts.
8. Export evidence if an audit or payroll review needs it.

Daily review prevents a large cleanup just before payroll lock.

## Buttons and actions

| Button | What it does |
| --- | --- |
| Apply filters | Filters attendance records or exceptions. |
| Clear filters | Resets filters. |
| Review | Opens attendance item detail. |
| Approve | Approves a regularization request. |
| Reject | Rejects a request with reason. |
| Export | Downloads attendance evidence or report. |

## Approval decision guide

| Situation | Suggested decision |
| --- | --- |
| Employee forgot punch and manager confirms presence | Approve regularization. |
| Employee was on approved leave | Check leave mapping instead of manually forcing attendance. |
| Employee asks to remove valid late mark without policy exception | Reject with reason. |
| Shift assignment is missing | Fix shift setup before deciding attendance. |
| Holiday or week off was not recognized | Fix calendar/shift mapping. |
| Joining or exit date explains missing attendance | Confirm employee status and payroll scope. |

## Payroll readiness checklist

- Payroll period attendance records exist.
- Missing punches are reviewed.
- Regularization requests are approved or rejected.
- Weekly off, holiday, leave, and attendance conflicts are resolved.
- Shift coverage exists where required.

## Payroll impact

Attendance can affect:

- Payable days.
- Leave without pay.
- Overtime or extra work day calculation.
- Late/early penalties if policy allows.
- Payroll blockers when regularizations are pending.
- Reports used by HR, finance, or audit.

Do not lock payroll inputs while critical attendance regularizations are still pending.

## Good practice

Close attendance exceptions before locking payroll inputs. If attendance changes after inputs are locked, the selected payroll run may continue using the old snapshot.

## FAQ

### Should HR approve every regularization?

No. Approve only when the correction is valid and supported by manager or policy evidence.

### Why is payroll blocked by attendance when employees are active?

Active employees can still have missing punches, shift gaps, pending regularizations, or attendance/leave conflicts in the payroll period.

### What if attendance is corrected after payroll inputs are locked?

The current locked run may not pick up the correction. Follow the payroll rerun or adjustment process if pay is affected.

### Should shift problems be fixed in Attendance or Policies?

Fix one-off employee assignment issues in the relevant shift assignment area. Fix repeated rule or calendar behavior in Policies.
