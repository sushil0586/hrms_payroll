# HR Admin Launch Readiness

Launch Readiness helps HR Admin users clear operational blockers before production use, first payroll, or customer go-live.

## Purpose

Use this page to route launch blockers, assign owners, record risk decisions, and keep evidence current.

![Launch remediation](../assets/screenshots/hr-admin/launch-remediation.png)

## Use this page when

- The dashboard shows launch blockers.
- A go-live gate is blocked or overdue.
- A launch issue needs an owner or escalation.
- You need to download audit evidence for launch signoff.
- Platform Admin or Tenant Admin asks whether HR operations are launch-ready.

## Page sections

| Section | Meaning |
| --- | --- |
| Summary metrics | Open assignments, blockers, warnings, overdue items, ignored decisions, escalations. |
| Filters | Search by gate, owner, module, status, severity, or due state. |
| Remediation cards | Each card explains the blocker, owner role, status, due date, and action. |
| Action button | Opens the source page that must be fixed. |
| Manage action | Assign owner, update due date, acknowledge, escalate, close, or ignore with reason. |
| Download audit | Exports launch audit evidence where allowed. |

## Common blockers

| Blocker | Source page |
| --- | --- |
| Missing employee role or manager role | Employees or Tenant Admin access |
| Organization master incomplete | Organization |
| Employee master warnings | Employees |
| Attendance or leave policy missing | Policies, Attendance, Leave |
| Payroll setup incomplete | Payroll Setup, Salary Setup, Payroll Rules, Statutory |
| Notification delivery unhealthy | Notifications or Notification Delivery |
| Public app URL or API base URL issue | Ops Health or platform operations |

## Workflow

1. Open **HR Admin > Launch Readiness**.
2. Filter to **Open** and **Blocker**.
3. Open the highest-risk item first.
4. Use the action button to reach the source page.
5. Fix the source issue.
6. Return to Launch Readiness.
7. Assign or close the remediation item.
8. Download audit evidence if signoff is required.

## Do not close a blocker if

- The source page still shows missing setup.
- No owner accepted the risk.
- The blocker affects payroll, employee access, notification delivery, or production safety.
- The item is ignored without a clear reason.

## Related guides

- [Go-Live Checklist](../launch/go-live-checklist.md)
- [Admin Handoff Guide](../launch/admin-handoff.md)
- [HR Dashboard](dashboard.md)
- [Ops Health](ops-health.md)

