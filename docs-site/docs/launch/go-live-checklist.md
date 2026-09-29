# Go-Live Checklist

Use this checklist before a tenant is activated for production use.

## Goal

Confirm the tenant can safely run HR, payroll, employee self-service, manager approvals, finance handoff, support, and audit operations.

![Platform launch readiness](../assets/screenshots/platform-admin/launch-readiness.png)

## 1. Tenant Setup

Platform Admin confirms:

| Check | Expected result |
| --- | --- |
| Tenant record | Created with correct tenant code and customer name |
| Primary domain | Correct and not a test-only value for production |
| Plan | Correct plan or module access assigned |
| Setup template | Applied or intentionally skipped with notes |
| Sandbox flag | Correct for production intent |
| Tenant status | Ready for handoff or activation |

Do not continue if tenant code, domain, or setup template is wrong.

## 2. Tenant Admin Access

Tenant Admin confirms:

| Check | Expected result |
| --- | --- |
| Primary tenant admin | Active and able to sign in |
| Backup tenant admin | Active if customer policy requires it |
| Roles page | Accessible to tenant admin |
| Users page | Accessible to tenant admin |
| Sign out and login | Tested successfully |

If the tenant admin cannot sign in, do not continue to HR setup.

## 3. Users and Roles

Review **Tenant Admin > Users** and **Tenant Admin > Roles**.

![Tenant Admin roles](../assets/screenshots/tenant-admin/roles.png)

Confirm:

- HR Admin users are active.
- Payroll Admin users are active if separate from HR Admin.
- Finance Manager users are active if finance handoff is used.
- ESS and MSS access approach is agreed.
- Admin access is limited to real owners.
- Custom roles are tested before wide assignment.

## 4. Organization Masters

HR Admin confirms:

| Master | Expected result |
| --- | --- |
| Legal entities | Created and active |
| Locations | Created and mapped |
| Branches | Created and active |
| Business units | Created if used |
| Departments | Created if used |
| Designations and grades | Created if used for salary, policy, or reporting |
| Manager hierarchy | Valid for approvals |

![Organization guided setup](../assets/screenshots/hr-admin/organization-guided-setup.png)

Do not continue if employee records need legal entity, branch, location, or manager values that do not exist.

## 5. Employee Master Readiness

HR Admin confirms:

- Employee data imported or created.
- Active employees have required identity details.
- Structure readiness is clean.
- Manager chain readiness is clean.
- ESS/MSS access is provisioned where needed.
- Payroll employees have salary, bank, and statutory data.

Open **Employees** and review readiness badges.

## 6. Payroll Setup

Payroll Admin confirms:

| Area | Expected result |
| --- | --- |
| Calendars and periods | Current payroll period exists |
| Pay groups | Employees are assigned correctly |
| Salary components | Active and reviewed |
| Salary structures | Active and assigned |
| Payroll rules | Published and traceable |
| Statutory setup | Complete for the tenant |
| Providers | Configured or intentionally not used |

![Payroll setup calendars](../assets/screenshots/payroll/payroll-setup-calendars.png)

## 7. Email and Notification Delivery

HR Admin confirms:

- Invite or reset email can be delivered.
- In-app notification works.
- Failed queue is reviewed.
- Retry capped items are explained.
- Notification channel health is acceptable.

![Notification delivery health](../assets/screenshots/hr-admin/notification-delivery-health.png)

Do not continue if critical emails such as invite, reset, payroll approval, or compliance reminders are failing.

## 8. ESS and MSS Access

Test with real or pilot users:

| Role | Test |
| --- | --- |
| Employee | Login to ESS, view dashboard, documents, notifications, and payslips if available |
| Manager | Login to MSS, review approvals and notifications |
| HR Admin | Login to HR Admin and open dashboard, employees, documents, attendance, leave, payroll |
| Finance Manager | Login to Finance Manager if finance handoff is enabled |

Do not rely only on admin users. Test at least one employee and one manager path.

## 9. Security and Support Access

Tenant Admin confirms:

- Support access is disabled unless actively needed.
- Security readiness does not show blocked items.
- Admin roles are reviewed.
- Trust audit is available.
- Account settings are correct.

![Tenant security readiness](../assets/screenshots/tenant-admin/security-readiness.png)

## 10. Launch Readiness and Audit Evidence

Platform Admin confirms launch gates:

- Customer record created.
- Setup template applied or waived.
- Tenant admin login created.
- Go-live handoff complete.
- Tenant activation approved.

Keep audit evidence before activation.

## Final Sign-Off

| Area | Owner | Status |
| --- | --- | --- |
| Tenant setup | Platform Admin | Ready |
| Account users and roles | Tenant Admin | Ready |
| Organization masters | HR Admin | Ready |
| Employee master | HR Admin | Ready |
| Payroll setup | Payroll Admin | Ready |
| Notifications | HR Admin or operations | Ready |
| ESS/MSS access | HR Admin and managers | Ready |
| Security and support access | Tenant Admin | Ready |
| Finance handoff | Finance Manager | Ready |
| Audit evidence | Platform Admin and Tenant Admin | Ready |

## Related Guides

- [Platform Launch Readiness](../platform-admin/launch-readiness.md)
- [Admin Handoff Guide](admin-handoff.md)
- [First Payroll Run Guide](first-payroll-run.md)
- [Access Issues](../troubleshooting/access.md)
- [Notification Issues](../troubleshooting/notifications.md)

