# HR Dashboard

The HR Dashboard is the daily command center for HR, payroll, compliance, documents, notifications, and launch readiness.

## On This Page

- [Dashboard Quick Navigation](#dashboard-quick-navigation)
- [Purpose](#purpose)
- [Use this page when](#use-this-page-when)
- [Page sections](#page-sections)
- [Action queue buttons](#action-queue-buttons)
- [Daily workflow](#daily-workflow)
- [Practical examples](#practical-examples)
- [Negative scenarios](#negative-scenarios)
- [Troubleshooting](#troubleshooting)
- [Signoff checklist](#signoff-checklist)

## Dashboard Quick Navigation

| I need to... | Start here | Then check |
| --- | --- | --- |
| Start daily HR operations | [Daily workflow](#daily-workflow) | [Action queue buttons](#action-queue-buttons) |
| Understand cards, counts, and sections | [Page sections](#page-sections) | [Purpose](#purpose) |
| Open the right queue from dashboard | [Action queue buttons](#action-queue-buttons) | [Practical examples](#practical-examples) |
| Diagnose misleading counts or broken links | [Negative scenarios](#negative-scenarios) | [Troubleshooting](#troubleshooting) |

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

## Practical examples

### Payroll readiness warning appears

1. Open the **Action queue**.
2. Click **Open readiness**.
3. Review the payroll blocker or warning category.
4. Fix the source issue, such as missing bank account, missing legal entity, or pending leave approval.
5. Return to Dashboard.
6. Confirm the payroll readiness count reduced or the warning has a clear explanation.

Expected result: HR can trace the dashboard count to a specific source page and prove whether it is resolved.

### Notification delivery is blocked

1. Find the **Notifications** row in the action queue.
2. Click **Open delivery**.
3. Review failed, pending, and retry-capped channel records.
4. Open the filtered queue.
5. Retry only after the channel issue is fixed.
6. Return to Dashboard and confirm the notification readiness state.

Expected result: failed messages are not hidden behind a green dashboard summary.

### Launch blocker is overdue

1. Click **Resolve launch**.
2. Open the blocked readiness item.
3. Review owner, due date, current value, and evidence requirement.
4. Assign or update owner if needed.
5. Add evidence after resolution.
6. Return to Dashboard and confirm blocker count changed.

Expected result: launch blockers have owner, due date, status, and evidence.

## Negative scenarios

| Issue | Meaning | Action |
| --- | --- | --- |
| Dashboard shows ready but child page has blockers. | Readiness source may be stale or scoped to a different period. | Refresh and compare period/workspace context. |
| Count does not reduce after fix. | Source record may not be saved, or another item still qualifies. | Reopen source page and check filters. |
| Button opens an unexpected page. | Navigation route may be wrong. | Treat as UI defect and verify route mapping. |
| Warning is ignored until payroll day. | Payroll close can be delayed. | Review warnings during daily checks. |

## Troubleshooting

| Problem | Likely reason | Fix |
| --- | --- | --- |
| Blocked status seems wrong | Source page still has one blocker. | Open action queue detail and resolve exact item. |
| Active employee count looks wrong | Employee status or filters changed. | Verify Employee Master active/inactive/on-notice counts. |
| Configuration setup is incomplete | Organization, policy, workflow, or payroll setup is missing. | Open the linked setup page and complete prerequisites. |
| Launch guardrail is blocked | Production-safe setting or evidence is missing. | Open Launch Readiness and resolve item. |

## Signoff checklist

| Check | Expected result |
| --- | --- |
| Action queue buttons route correctly. | Each button opens the intended page. |
| Counts match source pages. | Dashboard number can be reconciled with child page records. |
| Blocked items have owners. | No blocker is left without action. |
| Warnings are explained. | Payroll/launch can continue only with documented acceptance. |
| Dashboard refresh reflects completed work. | Resolved items are no longer shown as open. |

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
