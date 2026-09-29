# HR Dashboard

The HR Dashboard is the daily command center for HR, payroll, compliance, documents, notifications, and launch readiness.

## Purpose

Use this page at the start of the day and before payroll close to decide what needs attention first.

## Use this page when

- You want one view of employee, payroll, document, attendance, notification, and launch blockers.
- You need to know which queue needs action today.
- You want to open the correct operating page without searching the side menu.
- You need to confirm that a resolved item reduced the dashboard count.

## Page sections

| Section | Meaning |
| --- | --- |
| Header actions | Fast links to payroll blockers, employees, and reports. |
| Status cards | Tenant status, active employees, configuration setup, and action queue. |
| Action queue | Work items requiring HR or payroll action. |
| Tenant readiness | Readiness by payroll, documents, launch guardrails, and notifications. |
| Launch audit | Readiness gates and assignments for production safety. |
| Guardrails | Production-safe settings and environment checks. |


![HR Dashboard overview](../assets/screenshots/hr-admin/dashboard-overview.png)

## Action queue buttons

| Button | Opens | Use it when |
| --- | --- | --- |
| Open readiness | Payroll Control or payroll readiness. | Payroll source data needs review. |
| Review lifecycle | Lifecycle queues. | Joiner, movement, probation, or exit items need action. |
| Review documents | Documents backlog. | Pending or rejected employee documents exist. |
| Open attendance | Attendance exceptions. | Regularization or attendance records need review. |
| Open delivery | Notification delivery or failed queue. | Notifications failed or are stuck. |
| Resolve launch | Launch remediation. | Production readiness gates are blocked. |

## Daily workflow

1. Open **Dashboard**.
2. Read the tenant status and action queue count.
3. Start with blocked items before warnings.
4. Open the action button for the highest-risk row.
5. Complete the workflow on the target page.
6. Return to Dashboard.
7. Confirm the count reduced.
8. Continue until only acceptable warnings remain.

## Good practice

- Do not rely only on the top status number. Open the action queue to see the specific problem.
- Resolve employee master, bank, attendance, and leave issues before payroll calculation.
- Keep notifications healthy because failed messages can hide employee or manager actions.
- Use Dashboard as a navigation hub, not as the place to perform every detailed correction.

## Common questions

### Why does the dashboard still show a blocker after I fixed data?

Refresh the page and confirm the source record was saved. Some checks depend on selected payroll period, role access, or background refresh.

### Should warnings block payroll?

Warnings do not always block payroll, but they should be reviewed before final approval.
