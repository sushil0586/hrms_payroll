# Admin Handoff Guide

Use this guide when responsibility moves from implementation or platform setup to customer operations.

## Goal

Every owner knows what they are responsible for, which pages they use, what evidence they must keep, and when to escalate.

## Handoff Map

| From | To | Handoff focus |
| --- | --- | --- |
| Platform Admin | Tenant Admin | Tenant record, activation status, admin login, setup template, launch gates |
| Tenant Admin | HR Admin | Users, roles, HR access, support access, security posture |
| HR Admin | Payroll Admin | Organization, employees, leave, attendance, documents, payroll readiness |
| Payroll Admin | Finance Manager | Final payroll, output artifacts, bank advice, statutory evidence |
| Finance Manager | Audit or leadership | Payout proof, compliance proof, provider delivery, exception notes |

## Platform Admin to Tenant Admin

Platform Admin should hand over:

- Tenant code.
- Tenant domain or primary URL.
- Plan and enabled modules.
- Setup template applied.
- Tenant admin user created.
- Launch readiness gate status.
- Open launch blockers.
- Activation status.

Tenant Admin should confirm:

- Can sign in.
- Can open Tenant Admin dashboard.
- Can open Users and Roles.
- Knows how to revoke support access.
- Knows who owns HR Admin and Finance Manager access.

![Tenant Admin dashboard](../assets/screenshots/tenant-admin/dashboard.png)

## Tenant Admin to HR Admin

Tenant Admin should hand over:

- HR Admin user list.
- Payroll Admin user list if separate.
- Finance Manager user list if needed.
- Role definitions.
- Support access status.
- Security readiness status.

HR Admin should confirm:

- Can sign in to HR Admin.
- Can open Dashboard, Employees, Organization, Documents, Leave, Attendance, Notifications, Payroll.
- Knows where to review daily action queue.
- Knows escalation owner for role/access changes.

## HR Admin to Payroll Admin

HR Admin should hand over:

- Organization master completion status.
- Employee master readiness.
- Manager chain readiness.
- Leave and attendance readiness.
- Document verification status.
- Notification delivery status.
- Payroll blockers or warnings.

Payroll Admin should confirm:

- Payroll Control is accessible.
- Payroll setup pages are accessible.
- Salary setup is complete.
- Payroll rules are published.
- Statutory setup is complete.
- Provider setup is known.

## Payroll Admin to Finance Manager

Payroll Admin should hand over:

- Payroll run name and period.
- Approved payroll register.
- Bank advice.
- Payslip publication status.
- Statutory reports.
- Payroll review exceptions.
- Provider job status.
- Audit manifest.

Finance Manager should confirm:

- Finance Manager control center opens.
- Net pay matches payroll output.
- Bank advice is available.
- Statutory evidence is available.
- Provider exceptions are explained.
- Audit evidence is retained.

## Handoff Meeting Agenda

Use this agenda for customer onboarding:

1. Confirm production tenant and URL.
2. Confirm all admins can log in.
3. Review role ownership.
4. Review go-live checklist.
5. Review first payroll run process.
6. Review support access rules.
7. Review notification and email status.
8. Review payroll and finance evidence.
9. Confirm escalation contacts.
10. Record final signoff.

## Handoff Evidence Checklist

| Evidence | Owner |
| --- | --- |
| Tenant activation status | Platform Admin |
| Tenant admin login proof | Tenant Admin |
| User and role list | Tenant Admin |
| Organization master readiness | HR Admin |
| Employee readiness | HR Admin |
| Payroll setup readiness | Payroll Admin |
| First payroll output | Payroll Admin |
| Finance handoff proof | Finance Manager |
| Support access status | Tenant Admin |
| Audit logs | Tenant Admin and Platform Admin |

## Do Not Complete Handoff If

- Tenant admin cannot log in.
- HR Admin role is missing.
- Payroll Admin cannot access payroll pages.
- Finance Manager access is required but missing.
- Notification delivery is failing for critical emails.
- Launch readiness has unresolved production blockers.
- First payroll run has unresolved blockers.

## Related Guides

- [Go-Live Checklist](go-live-checklist.md)
- [First Payroll Run Guide](first-payroll-run.md)
- [Workspaces and Roles](../getting-started/workspaces-and-roles.md)
- [Tenant Admin Weekly Checklist](../checklists/tenant-admin-weekly.md)
- [Finance Manager Payroll Day](../checklists/finance-manager-payroll-day.md)
