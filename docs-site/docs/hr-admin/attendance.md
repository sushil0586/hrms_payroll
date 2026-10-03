# Attendance Management

Attendance Management is where HR reviews daily attendance, shift coverage, missed punches, regularization requests, and payroll-impacting exceptions before payroll inputs are locked.

Use this guide when you need to answer:

- Why is an employee marked absent, late, or missing punch?
- How should HR review attendance exceptions before payroll?
- How does an employee correct attendance from ESS?
- How does a manager approve or reject attendance regularization from MSS?
- Why is payroll blocked by attendance?

## Who Uses Attendance Management

| User | Responsibility |
| --- | --- |
| HR Admin | Reviews exceptions, shift gaps, regularization requests, and payroll readiness. |
| Employee | Checks own attendance in ESS and submits correction requests. |
| Manager | Approves or rejects team attendance correction requests in MSS. |
| Payroll Admin | Confirms attendance is clean before locking payroll inputs. |
| Auditor | Reviews attendance evidence, decisions, and payroll-impacting changes. |

## Attendance Management Map

Attendance depends on multiple areas of the HRMS. If one area is missing, attendance can look wrong even when the employee actually worked.

| Area | What It Controls | Example |
| --- | --- | --- |
| Employee master | Employee status, joining date, exit date, branch, location, manager. | Employee joined on 15 Sep, so attendance before joining should not be expected. |
| Shift/roster | Expected working hours and weekly offs. | General shift 09:30 to 18:30, Monday to Friday. |
| Holiday calendar | Public holidays and company holidays. | Gandhi Jayanti should not be marked absent. |
| Attendance policy | Grace, late, early, absent, regularization window. | Allow 10 minute late grace and 3 regularizations per month. |
| ESS attendance | Employee view and correction request. | Employee submits missed punch correction for 01 Oct. |
| MSS approvals | Manager decision queue. | Manager approves employee's missed check-out. |
| Payroll Control | Readiness and blockers. | Pending attendance regularization blocks payroll input lock. |

## Recommended Setup Order

Set up attendance in this order for a new tenant or new legal entity:

1. Create organization masters: legal entity, branch, location, department.
2. Create or confirm employee records and reporting manager.
3. Create shifts or work schedules.
4. Create holiday calendar.
5. Create attendance policy.
6. Assign policy/shift/calendar to employees or groups.
7. Ask a pilot employee to submit one regularization from ESS.
8. Ask the manager to approve from MSS.
9. Confirm HR Admin Attendance and Payroll Control both update.

Do not start payroll readiness testing until at least one employee has a valid employee record, shift, policy, calendar, and manager route.

## Main HR Admin Attendance Page

Navigation:

1. Open **HR Admin**.
2. Open **Attendance** from the Time & Leave area.
3. Use filters to narrow the records by date, status, employee, branch, manager, or payroll period.

![Attendance exceptions and operations](../assets/screenshots/hr-admin/attendance-exceptions.png)

### Page Sections

| Section | Purpose | HR Action |
| --- | --- | --- |
| Summary cards | Shows attendance volume, exception counts, pending reviews, and payroll risk. | Start here to understand workload. |
| Filters | Narrows records by period, status, employee, manager, or branch. | Filter payroll period first before payroll close. |
| Attendance records | Shows daily employee attendance rows. | Review exceptions, present/absent status, and source. |
| Exception list | Shows missing punch, late, early, absent, shift gap, and policy exceptions. | Prioritize high payroll impact items. |
| Regularization requests | Shows employee-submitted corrections. | Approve or reject after manager/policy validation. |
| Detail or review panel | Shows record-level context. | Read punch, policy, shift, evidence, and notes before deciding. |
| Pagination | Moves through long record lists. | Use page size that keeps the page readable. |

## Attendance Statuses

| Status | Meaning | Typical Action |
| --- | --- | --- |
| Present | Attendance is complete and no exception is open. | No action. |
| Absent | Employee has no valid attendance for expected work day. | Check leave, holiday, week off, shift, or regularization. |
| Missing punch | Check-in or check-out is missing. | Ask employee to regularize or verify raw punch source. |
| Late | Check-in is after policy grace. | Review policy and whether regularization is allowed. |
| Early exit | Check-out is earlier than expected. | Review reason and manager confirmation. |
| Pending regularization | Employee submitted a correction. | Manager/HR must approve or reject before payroll close. |
| Approved regularization | Correction accepted. | Confirm payroll readiness updated. |
| Rejected regularization | Correction declined. | Ensure rejection reason is clear. |
| Shift missing | Employee has no valid shift for the date. | Fix shift/roster assignment before approving attendance. |
| Holiday conflict | Attendance engine expected work on a holiday or did not recognize a holiday. | Fix holiday calendar mapping. |
| Payroll locked | Attendance period has already been consumed by payroll. | Use payroll correction/rerun process if pay is affected. |

## Daily HR Review Workflow

Use this workflow every day or at least twice per week.

1. Open **HR Admin > Attendance**.
2. Filter to the current week or today.
3. Review critical statuses first: missing punch, absent, shift missing, pending regularization.
4. Open each high-impact record.
5. Check employee status, shift, holiday, leave, and manager route.
6. Approve valid regularizations.
7. Reject invalid requests with a clear reason.
8. Escalate unclear policy or shift issues to HR operations.
9. Reopen Payroll Control only if the period is near payroll close.

Expected result:

- Daily attendance exceptions reduce.
- Employees see clear request status.
- Managers do not receive a large approval backlog during payroll week.
- Payroll Control has fewer attendance blockers.

## Payroll Period Review Workflow

Use this workflow before payroll input lock.

1. Open **Payroll > Payroll Control**.
2. Confirm the payroll period, for example `01 Sep 2026 - 30 Sep 2026`.
3. Note attendance blockers and pending approvals.
4. Open **HR Admin > Attendance**.
5. Filter to the exact payroll period.
6. Review missing punches, absent days, late marks, early exits, shift gaps, and pending regularizations.
7. Close manager approvals from MSS or coordinate with managers.
8. Return to **Payroll Control**.
9. Refresh readiness.
10. Lock payroll inputs only after attendance blockers are cleared or formally accepted.

Expected result:

- Payroll does not use incomplete attendance.
- Payable days are stable.
- Payroll can be calculated without late attendance corrections changing the result.

## Example: Review Daily Attendance for Bengaluru Branch

Scenario:

- Tenant: `Accerio India`
- Branch: `Bengaluru HO`
- Payroll period: `01 Sep 2026 - 30 Sep 2026`
- HR wants to review pending attendance issues before payroll.

Steps:

1. Open **HR Admin > Attendance**.
2. Set date range to `01 Sep 2026 - 30 Sep 2026`.
3. Set branch to `Bengaluru HO`.
4. Set status to `Exception` or `Needs review`.
5. Click **Apply filters**.
6. Open the first missing punch or pending regularization.
7. Check shift, raw punches, reason, and manager.
8. Approve, reject, or assign follow-up.

Expected result:

- HR sees only relevant branch records.
- Closed items no longer appear as pending.
- Payroll Control attendance count reduces after refresh.

## Example: Employee Missed Check-Out

Scenario:

- Employee: `Riya Sharma`
- Date: `01 Oct 2026`
- Shift: `09:30 - 18:30`
- Actual issue: Employee checked in but forgot to check out after a client meeting.

Employee action:

1. Open **ESS > Attendance**.
2. Select `01 Oct 2026`.
3. Click the correction or regularization action.
4. Enter corrected check-out time: `18:45`.
5. Add reason: `Forgot to punch out after client meeting`.
6. Attach evidence if policy requires it.
7. Submit request.

Manager action:

1. Open **MSS > Approvals**.
2. Select **Attendance**.
3. Open Riya Sharma's request.
4. Check date, corrected time, and reason.
5. Approve if the request is valid.

HR action:

1. Open **HR Admin > Attendance**.
2. Confirm request status changed to approved.
3. Confirm the record no longer blocks payroll.

Expected result:

- The missing punch becomes corrected attendance.
- Payroll readiness uses the approved correction.
- Audit has employee reason and manager decision.

## Example: Late Coming Exception

Scenario:

- Employee: `Amit Verma`
- Shift starts: `09:30`
- Actual check-in: `09:48`
- Policy grace: `10 minutes`
- Result: Late exception.

HR review:

1. Open **HR Admin > Attendance**.
2. Filter status to `Late`.
3. Open Amit Verma's late record.
4. Check policy grace and shift assignment.
5. If the late mark is correct, no correction is needed.
6. If the employee submits a valid regularization, review evidence and route.

Recommended decision:

| Situation | Decision |
| --- | --- |
| Employee was actually late and no policy exception applies. | Keep exception. |
| Check-in device sync was delayed and raw punch shows on-time. | Correct attendance source. |
| Employee was on approved official duty. | Approve regularization with reason. |
| Shift assigned was wrong. | Fix shift assignment before deciding. |

## Example: Missing Shift Creates Wrong Absence

Scenario:

- Employee: `Neha Kapoor`
- Branch: `Mumbai Office`
- Date: `12 Sep 2026`
- Attendance shows: `Absent`
- Actual issue: No shift was assigned for the date.

HR action:

1. Open **HR Admin > Attendance**.
2. Open the absence record.
3. Check whether a shift exists for the employee/date.
4. If shift is missing, do not approve a manual attendance correction first.
5. Open the shift/roster or policy assignment area.
6. Assign the correct shift effective from the right date.
7. Return to Attendance and refresh/reprocess if available.

Expected result:

- Employee is evaluated against the correct shift.
- Payroll does not incorrectly reduce payable days.

Rule:

Fix setup causes before fixing individual records. If many employees show absence because of missing shift, the problem is setup, not employee behavior.

## Example: Holiday Calendar Conflict

Scenario:

- Holiday: `Gandhi Jayanti - 02 Oct 2026`
- Location: `Bengaluru`
- Employees are marked absent.

HR action:

1. Open holiday calendar setup or policy area.
2. Confirm the holiday exists for `02 Oct 2026`.
3. Confirm the holiday calendar is assigned to the correct location/branch.
4. Return to Attendance.
5. Recheck affected employees.

Expected result:

- Holiday is recognized.
- Absence exceptions disappear or become non-working-day records.

## Regularization Request Fields

When reviewing a regularization, check these fields.

| Field | Meaning | Good Example |
| --- | --- | --- |
| Employee | Person requesting correction. | `Riya Sharma (EMP-1029)` |
| Date | Attendance date being corrected. | `01 Oct 2026` |
| Correction type | Missed punch, time correction, absence correction, official duty. | `Missed check-out` |
| Requested check-in | Corrected in-time. | `09:28` |
| Requested check-out | Corrected out-time. | `18:45` |
| Reason | Why correction is needed. | `Client meeting ended after office hours; forgot check-out.` |
| Evidence | Optional or required proof. | Meeting invite, manager note, travel proof. |
| Policy result | Whether correction is allowed. | Within 7 day window, manager approval required. |
| Payroll period | Whether date belongs to active payroll cycle. | Sep 2026 payroll. |

Reject vague reasons such as:

- `Please approve`
- `Forgot`
- `Attendance issue`
- `System problem`

Ask the employee or manager for clearer context before approving if the correction can affect pay.

## Buttons and Actions

| Action | What It Does | Use When |
| --- | --- | --- |
| Apply filters | Filters records or exceptions. | You need a focused list. |
| Clear filters | Resets selected filters. | You need to start review again. |
| Review | Opens record/request detail. | You need context before deciding. |
| Approve | Accepts a regularization request. | Reason and evidence are valid. |
| Reject | Declines a regularization request. | Request is invalid, unclear, duplicate, or outside policy. |
| Export | Downloads evidence or attendance report. | Audit, payroll review, or offline reconciliation is needed. |
| Open payroll | Opens payroll readiness/control. | Attendance count affects payroll. |
| Open employee | Opens employee detail. | Structure, manager, branch, or status looks wrong. |

## Decision Quality Checklist

Before approving an attendance correction:

- Employee is active on the attendance date.
- Date is inside the allowed regularization window.
- Shift is assigned for the date.
- Holiday/week-off mapping is correct.
- Reason explains what happened.
- Evidence is attached if policy requires it.
- Request is not a duplicate.
- Manager approval route is valid.
- Payroll inputs are not already locked for the period.

If any item fails, fix setup first or reject with a clear reason.

## Manager Approval From MSS

Managers decide employee-submitted attendance regularizations from **MSS > Approvals**.

![MSS approvals](../assets/screenshots/mss/approvals.png)

Manager workflow:

1. Open **MSS > Approvals**.
2. Select the **Attendance** queue.
3. Open the pending request.
4. Check date, time, reason, employee, and evidence.
5. Approve if the correction is valid.
6. Reject with a clear note if invalid.

Manager should escalate to HR when:

- Employee disputes the attendance source.
- Shift or weekly off looks wrong.
- Request is after payroll cutoff.
- Employee is on notice, exit, or joining boundary.
- Policy result is unclear.

## ESS Attendance Request Flow

Employees submit corrections from **ESS > Attendance**.

Employee workflow:

1. Open **ESS > Attendance**.
2. Find the incorrect date.
3. Open correction/regularization action.
4. Enter corrected time or correction reason.
5. Attach proof if required.
6. Submit.
7. Track status in request history.

Expected statuses:

| Status | Meaning |
| --- | --- |
| Draft | Request is not submitted yet. |
| Pending | Waiting for manager or HR decision. |
| Approved | Correction accepted. |
| Rejected | Correction declined with reason. |
| Cancelled | Employee or workflow cancelled request. |
| Locked | Payroll or cutoff prevents change. |

## Attendance Policy Setup Guidance

Attendance policy should be defined clearly before broad rollout.

Typical Indian office attendance policy:

| Field | Example Value | Why It Matters |
| --- | --- | --- |
| Policy name | `India Office Attendance Standard` | Clear name for HR and audit. |
| Shift basis | `Assigned shift` | Employee attendance is checked against assigned shift. |
| Grace late minutes | `10` | Avoids late marks for small delays. |
| Grace early exit minutes | `10` | Avoids early exit for small variance. |
| Half-day threshold | `4 hours` | Determines half-day absence/payable day impact. |
| Full-day threshold | `8 hours` | Determines full-day attendance. |
| Regularization window | `7 days` | Prevents old corrections after payroll. |
| Monthly regularization limit | `3` | Controls misuse. |
| Approval route | `Manager approval` | Ensures manager validates attendance correction. |
| Evidence required | `Required for official duty or backdated correction` | Supports audit. |
| Payroll impact | `Block if pending in payroll period` | Prevents unstable payable days. |

Do not use one attendance policy for all employees if field workers, shift workers, remote employees, and office employees follow different rules.

## Shift and Calendar Rules

Attendance quality depends on shift and calendar assignments.

| Setup Item | Required Check |
| --- | --- |
| Shift start/end | Matches actual working hours. |
| Break rules | Does not incorrectly reduce working hours. |
| Weekly off | Saturday/Sunday or tenant-specific weekly off is mapped. |
| Holiday calendar | Assigned to correct legal entity, branch, or location. |
| Effective dates | Policy is active on attendance date. |
| Employee assignment | Employee belongs to the correct shift group. |

Example:

If Bengaluru office follows Monday-Friday and Mumbai office follows alternate Saturdays, create separate shift/calendar assignments. Do not force both through one generic calendar if payroll depends on payable days.

## Payroll Impact

Attendance can affect:

- Payable days.
- Leave without pay.
- Half-day deductions.
- Overtime or extra work day payment.
- Late/early penalties if tenant policy allows.
- Payroll blockers when regularizations are pending.
- Audit evidence for payable day disputes.

Before locking payroll inputs, confirm:

- No pending regularizations exist inside payroll period.
- Missing punches are corrected or accepted as absence.
- Shift missing issues are resolved.
- Holiday/week-off conflicts are resolved.
- Any accepted exception has notes.

## Payroll Locked Case

Scenario:

- Payroll inputs for September are already locked.
- Employee submits regularization for `25 Sep 2026`.
- Approval would increase payable days.

Recommended handling:

1. Do not silently approve and assume payroll will change.
2. Check payroll run status.
3. If payroll is only prepared but not finalized, ask Payroll Admin whether rerun is allowed.
4. If payroll is finalized, process the correction in next payroll as adjustment/arrears if policy allows.
5. Keep notes in the attendance request.

Expected result:

- Payroll remains auditable.
- Employee correction is not lost.
- Finance understands why pay changed in next cycle if adjustment is needed.

## Month-End Attendance Checklist

Use this before payroll input lock.

| Check | Expected Result |
| --- | --- |
| Date range | Matches payroll period exactly. |
| Missing punches | Approved, rejected, or accepted as absence. |
| Pending regularizations | Zero payroll-impacting pending items. |
| Shift coverage | No missing shift for active payroll employees. |
| Holiday/week-off | Correct for branch/location. |
| Leave conflicts | Approved leave and attendance do not conflict. |
| Joining/exits | Expected attendance starts/ends on correct dates. |
| Manager approvals | Completed for payroll-period requests. |
| Payroll Control | Attendance blocker count reduced or explained. |

## Troubleshooting

| Issue | Likely Reason | Fix |
| --- | --- | --- |
| Employee is absent but says they worked. | Missing punch, device sync delay, shift gap, or holiday mismatch. | Check raw punch, shift, holiday, and regularization request. |
| Employee cannot submit regularization. | Regularization window closed, attendance locked, or policy not assigned. | Check attendance policy and payroll cutoff. |
| Manager cannot see request. | Manager mapping or approval route missing. | Fix employee manager and workflow route. |
| Request approved but Payroll Control still blocked. | Readiness not refreshed, another exception exists, or payroll uses locked snapshot. | Refresh readiness and check all attendance items for the period. |
| Late marks are too many. | Grace policy too strict or shift assignment wrong. | Review attendance policy and sample employees. |
| Employees show absent on holiday. | Holiday calendar missing or not assigned to branch/location. | Correct holiday calendar assignment. |
| Employees show shift missing. | No roster or shift assignment active on date. | Assign shift with correct effective date. |
| Attendance correction changed after payroll lock. | Source changed after input snapshot. | Use rerun, correction, or payroll adjustment workflow. |
| Export count differs from screen count. | Filters, pagination, or date range mismatch. | Reapply filters and confirm page count/date range. |

## Negative Scenario: No Shift Assigned

Problem:

An employee opens ESS Attendance and sees absence for all days, but they were working.

Root cause:

No active shift assignment exists for the employee.

Correct fix:

1. HR checks employee branch/location and employment status.
2. HR assigns correct shift/calendar from the correct effective date.
3. HR rechecks Attendance.
4. Employee submits regularization only for genuine missing punches.

Do not manually approve all attendance rows first. That hides the setup problem and creates repeated monthly work.

## Negative Scenario: Regularization After Cutoff

Problem:

Employee submits a correction after payroll cutoff.

Expected behavior:

- System should block, warn, or route the request as exception depending on tenant policy.
- HR/payroll must decide whether to rerun payroll or process adjustment next month.

Correct handling:

1. Check payroll run status.
2. Check whether the correction changes payable days.
3. If payroll is open, decide before input lock.
4. If payroll is locked/final, record adjustment note.
5. Inform employee and manager.

## Negative Scenario: Duplicate Correction

Problem:

Employee submits two regularizations for the same date.

Correct handling:

1. Open both requests.
2. Check latest valid request.
3. Reject duplicate with reason: `Duplicate request. Approved request already exists for this date.`
4. Keep only one accepted correction.

## End-to-End Example: Missed Punch to Payroll Ready

Scenario:

- Employee: `Riya Sharma`
- Manager: `Karan Mehta`
- Branch: `Bengaluru HO`
- Shift: `09:30 - 18:30`
- Date: `01 Oct 2026`
- Issue: Missing check-out

### Step 1: Employee submits correction

Riya opens **ESS > Attendance**, selects `01 Oct 2026`, enters check-out `18:45`, adds reason, and submits.

### Step 2: Manager approves

Karan opens **MSS > Approvals**, selects Attendance, reads the reason, and approves.

### Step 3: HR confirms exception closure

HR opens **HR Admin > Attendance**, filters `01 Oct 2026`, and confirms the missing punch is resolved.

### Step 4: Payroll checks readiness

Payroll Admin opens **Payroll Control** and confirms attendance blocker count is reduced.

### Successful result

- Employee sees approved attendance correction.
- Manager decision is recorded.
- HR has evidence.
- Payroll can lock inputs without this exception.

## Good Practices

- Review attendance regularly instead of only during payroll week.
- Fix shift/calendar setup before manual corrections.
- Keep rejection reasons clear and employee-friendly.
- Use payroll period filter before payroll close.
- Do not approve requests only because the employee asks; validate policy and evidence.
- Track repeated exceptions by employee, manager, branch, and shift.
- Avoid changing attendance rules during payroll close unless it fixes a blocker.

## Related Pages

- [ESS Attendance](../ess/attendance.md)
- [MSS Approvals](../mss/approvals.md)
- [Leave and Attendance to Payroll](../workflows/leave-attendance-to-payroll.md)
- [Leave Management](leave.md)
- [Policies](policies.md)
- [Payroll Control](payroll/payroll-control.md)
- [Payroll Inputs](payroll/payroll-inputs.md)
