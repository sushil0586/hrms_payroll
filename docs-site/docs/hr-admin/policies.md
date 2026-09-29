# Policies

Policies manages leave rules, attendance rules, eligibility, accrual, carry-forward, approval behavior, and employee assignments.

## Purpose

Use Policies to define how leave and attendance should work before assigning those rules to employees.

## Use this page when

- A new leave type is required.
- Leave accrual, carry-forward, or expiry rules change.
- Attendance or shift policy needs setup.
- A group of employees needs a policy assignment.
- Payroll readiness shows policy-related source issues.

## Policy areas

| Area | Purpose |
| --- | --- |
| Leave types | Names and categories of leave. |
| Leave policies | Accrual, eligibility, carry-forward, expiry, approval rules. |
| Attendance policies | Attendance rules, regularization rules, grace rules. |
| Shifts and calendars | Work schedules and holiday coverage. |
| Assignments | Which employees or groups receive the policy. |

![Policy control overview](../assets/screenshots/hr-admin/policies-overview.png)

## Policy setup order

Use this sequence when setting up a tenant or introducing a new rule:

1. Create leave types.
2. Create leave policies with accrual, carry-forward, expiry, and approval behavior.
3. Create attendance policies with regularization, grace, shift, and exception rules.
4. Create shifts, holiday calendars, and roster templates where needed.
5. Assign policies to employee groups.
6. Test with a small group before broad rollout.
7. Review Payroll Control for policy-related readiness issues.

## Policy impact areas

| Policy area | Can affect |
| --- | --- |
| Leave types | Employee requests, balances, payroll leave categories. |
| Leave accrual | Available balance and carry-forward. |
| Leave approval | Pending items before payroll lock. |
| Leave without pay rules | Payable days and salary deduction. |
| Attendance grace rules | Late/early exceptions and penalties. |
| Regularization rules | Which attendance corrections employees can request. |
| Shifts and calendars | Expected work days, week offs, holidays, attendance exceptions. |
| Assignments | Which employees receive the rules. |

## Checks before rollout

- Effective dates are correct.
- The assignment group is correct.
- No conflicting policy assignment exists.
- Accrual, carry-forward, and expiry behavior is reviewed.
- Payroll impact is understood.

## Safe policy change rules

| Change | Recommended approach |
| --- | --- |
| New policy for future joiners | Create new policy or assignment with future effective date. |
| Mid-year accrual change | Version or future-date the change; review historical balances. |
| Attendance grace change | Confirm impact on pending exceptions before rollout. |
| Holiday calendar correction | Check affected attendance records and payroll period. |
| Assignment correction for one employee | Fix assignment and recheck employee readiness. |
| Same issue for many employees | Fix policy setup, not individual balances. |

Avoid editing live policy behavior without understanding historical and payroll impact.

## Assignment checks

Before assigning a policy:

| Check | Expected result |
| --- | --- |
| Employee scope | Correct legal entity, branch, department, employee type, or group. |
| Effective date | Starts on the intended date. |
| Overlap | No conflicting active assignment unless policy supports priority. |
| Payroll period | Change does not unintentionally affect locked payroll. |
| Test employee | A sample employee shows expected behavior. |

## Good practice

Make a new version or future-dated policy change when a policy changes mid-year. Avoid editing live policy behavior without knowing historical impact.

## FAQ

### Should policies be changed during payroll close?

Avoid policy changes during payroll close unless they fix a blocker. If changed, recheck attendance, leave, and Payroll Control before locking inputs.

### Why do repeated manual leave corrections happen?

Usually because accrual, expiry, carry-forward, or assignment rules are wrong. Fix the policy instead of repeating manual corrections.

### Can different employee groups have different policies?

Yes. Use assignments by legal entity, branch, department, employee type, grade, or other supported grouping.

### What should I test after changing a policy?

Test one or two employees from the affected group, check leave balance/attendance behavior, then review Payroll Control for warnings.
