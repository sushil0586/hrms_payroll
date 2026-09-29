# Practical Scenario Coverage

This page checks whether the documentation covers both successful workflows and the common failure paths a new user is likely to face.

Use this page as a release checklist whenever a new page, workflow, or module is added.

## How to read this matrix

| Column | Meaning |
| --- | --- |
| Scenario | Real-world user situation. |
| Positive path | Where the user learns the normal successful workflow. |
| Negative path | Where the user learns what to do when something goes wrong. |
| Owner | Person or workspace that usually resolves it. |

## Login, access, and roles

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| User logs in and lands in the right workspace | [Workspaces and Roles](getting-started/workspaces-and-roles.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin / HR Admin |
| User lands on Workspace Access | [Tenant Users](tenant-admin/users.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin |
| User cannot see a menu or button | [Roles](tenant-admin/roles.md) | [Troubleshooting](troubleshooting/index.md) | Tenant Admin |
| User needs ESS or MSS access | [Workspaces and Roles](getting-started/workspaces-and-roles.md) | [Access Issues](troubleshooting/access.md) | HR Admin / Tenant Admin |
| Admin role is too broad | [Roles](tenant-admin/roles.md) | [Tenant Admin Weekly Checklist](checklists/tenant-admin-weekly.md) | Tenant Admin |

## Tenant onboarding and launch

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| New signup lead becomes a tenant | [Platform Leads](platform-admin/leads.md) | [Platform Audit Logs](platform-admin/audit-logs.md) | Platform Admin |
| Tenant is created manually | [Platform Tenants](platform-admin/tenants.md) | [Platform Tenants FAQ](platform-admin/tenants.md#faq) | Platform Admin |
| Tenant admin access is provisioned | [Admin Access](platform-admin/admin-access.md) | [Access Issues](troubleshooting/access.md) | Platform Admin / Tenant Admin |
| Setup template is applied | [Setup Templates](platform-admin/setup-templates.md) | [Setup Templates FAQ](platform-admin/setup-templates.md#faq) | Platform Admin |
| Tenant is ready for activation | [Launch Readiness](platform-admin/launch-readiness.md) | [Go-Live Checklist](launch/go-live-checklist.md) | Platform Admin |
| Handoff from platform to customer is needed | [Admin Handoff Guide](launch/admin-handoff.md) | [Launch Readiness](platform-admin/launch-readiness.md) | Platform Admin / Tenant Admin |

## Tenant account administration

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Invite or create account users | [Tenant Users](tenant-admin/users.md) | [Access Issues](troubleshooting/access.md) | Tenant Admin |
| Create or review a role | [Tenant Roles](tenant-admin/roles.md) | [Tenant Roles FAQ](tenant-admin/roles.md#faq) | Tenant Admin |
| Plan or limit blocks usage | [Plan and Billing](tenant-admin/plan.md) | [Plan limit workflow](tenant-admin/plan.md#limit-review-workflow) | Tenant Admin / Commercial |
| Support needs temporary access | [Support Access](tenant-admin/support-access.md) | [Trust Audit](tenant-admin/trust-audit.md) | Tenant Admin |
| Security readiness has blockers | [Security Readiness](tenant-admin/security.md) | [Tenant Admin Weekly Checklist](checklists/tenant-admin-weekly.md) | Tenant Admin |
| Account setting changes are needed | [Tenant Settings](tenant-admin/settings.md) | [Trust Audit](tenant-admin/trust-audit.md) | Tenant Admin |

## HR setup and employee master

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Create organization masters | [Organization](hr-admin/organization.md) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin |
| Add or correct an employee | [Employees](hr-admin/employees.md) | [Employee to Payroll](workflows/employee-to-payroll.md) | HR Admin |
| Employee has missing department, branch, legal entity, or manager | [Employees](hr-admin/employees.md) | [Payroll Issues](troubleshooting/payroll.md) | HR Admin |
| Employee lifecycle event is needed | [Lifecycle](hr-admin/lifecycle.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin |
| Movement, exit, or probation item is pending | [Lifecycle](hr-admin/lifecycle.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin / Manager |
| Bulk import is needed | [Imports](hr-admin/imports.md) | [Organization](hr-admin/organization.md) | HR Admin |

## Documents

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Employee uploads required document | [ESS Documents](ess/documents.md) | [Document Issues](troubleshooting/documents.md) | Employee |
| HR reviews documents | [HR Documents](hr-admin/documents.md) | [Documents to Verification](workflows/documents-to-verification.md) | HR Admin |
| Document is rejected | [ESS Documents](ess/documents.md#common-rejection-reasons) | [Document Issues](troubleshooting/documents.md) | Employee / HR Admin |
| Expiring document needs renewal | [HR Documents](hr-admin/documents.md) | [Document Issues](troubleshooting/documents.md) | HR Admin / Employee |
| Document evidence is needed | [Documents to Verification](workflows/documents-to-verification.md) | [Reports and Audit](hr-admin/reports-audit.md) | HR Admin |

## Attendance, leave, and policies

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Employee requests leave | [ESS Overview](ess/index.md) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | Employee / Manager |
| Manager approves leave | [MSS Approvals](mss/approvals.md) | [MSS Escalation Guidance](mss/task-recipes.md#escalation-guidance) | Manager |
| Attendance regularization is needed | [Attendance](hr-admin/attendance.md) | [Leave and Attendance to Payroll](workflows/leave-attendance-to-payroll.md) | Employee / Manager / HR Admin |
| Pending approvals affect payroll | [MSS Approvals](mss/approvals.md) | [Payroll Issues](troubleshooting/payroll.md) | Manager / HR Admin |
| Leave or attendance policy must change | [Policies](hr-admin/policies.md) | [Policies FAQ](hr-admin/policies.md#faq) | HR Admin |
| Payroll close is near and time data is not ready | [Time and Leave](hr-admin/time-leave.md) | [HR Admin Daily Checklist](checklists/hr-admin-daily.md) | HR Admin |

## Payroll setup

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Create payroll calendar, period, and pay group | [Payroll Setup](hr-admin/payroll/payroll-setup.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Configure salary structure and components | [Salary Setup](hr-admin/payroll/salary-setup.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Create or review payroll rules | [Payroll Rules](hr-admin/payroll/payroll-rules.md) | [Payroll Rules trace guidance](hr-admin/payroll/payroll-rules.md) | Payroll Admin |
| Configure statutory payroll | [Statutory Payroll](hr-admin/payroll/statutory-payroll.md) | [Compliance Evidence](finance-manager/compliance-evidence.md) | Payroll Admin / Finance |
| Configure payroll provider | [Payroll Providers](hr-admin/payroll/payroll-providers.md) | [Provider failure guidance](hr-admin/payroll/payroll-providers.md) | Payroll Admin |
| Record adjustments or settlements | [Adjustments and Settlements](hr-admin/payroll/adjustments-settlements.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |

## Payroll run and finance handoff

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Payroll readiness is clear | [Payroll Control](hr-admin/payroll/payroll-control.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin / HR Admin |
| Payroll blockers exist | [Payroll Control](hr-admin/payroll/payroll-control.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin / HR Admin |
| Inputs must be locked | [Payroll Inputs](hr-admin/payroll/payroll-inputs.md) | [Payroll Close to Finance Handoff](workflows/payroll-close-to-finance-handoff.md) | Payroll Admin |
| Calculation produces issues | [Payroll Calculations](hr-admin/payroll/payroll-calculations.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Exceptions need review | [Payroll Review](hr-admin/payroll/payroll-review.md) | [Payroll Close to Finance Handoff](workflows/payroll-close-to-finance-handoff.md) | Payroll Admin / Approver |
| Payslips and registers are generated | [Payroll Outputs](hr-admin/payroll/payroll-outputs.md) | [Payroll Issues](troubleshooting/payroll.md) | Payroll Admin |
| Finance receives payroll handoff | [Payroll Handoff](hr-admin/payroll/payroll-handoff.md) | [Finance Manager Payroll Day](checklists/finance-manager-payroll-day.md) | Payroll Admin / Finance Manager |
| Bank advice or statutory evidence does not reconcile | [Finance Manager](finance-manager/index.md) | [Payment Handoff](finance-manager/payment-handoff.md) | Finance Manager |

## ESS, MSS, and employee experience

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Employee downloads payslip | [ESS Payslips](ess/payslips.md) | [Payroll Issues](troubleshooting/payroll.md#payslip-not-visible-in-ess) | Employee / HR Admin |
| Employee submits tax declaration | [Tax Declarations](ess/statutory-declarations.md) | [Tax declaration FAQ](ess/statutory-declarations.md#faq) | Employee / HR Admin |
| Employee reviews notifications | [ESS Notifications](ess/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | Employee / HR Admin |
| Manager reviews team approvals | [MSS Approvals](mss/approvals.md) | [MSS escalation guidance](mss/task-recipes.md#escalation-guidance) | Manager / HR Admin |
| Manager notification is old or failed | [MSS Notifications](mss/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | Manager / HR Admin |

## Notifications and delivery

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| Notification template/event is configured | [HR Notifications](hr-admin/notifications.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin |
| Email or in-app notification fails | [Notification Failure to Recovery](workflows/notification-failure-to-recovery.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin / Support |
| Retry is safe | [HR Notifications](hr-admin/notifications.md) | [Notification Failure to Recovery](workflows/notification-failure-to-recovery.md) | HR Admin |
| Retry cap is reached | [Glossary and Status Guide](glossary.md) | [Notification Issues](troubleshooting/notifications.md) | HR Admin / Support |
| Delivery evidence is needed | [HR Notifications](hr-admin/notifications.md) | [Reports and Audit](hr-admin/reports-audit.md) | HR Admin |

## Reports, audit, and evidence

| Scenario | Positive path | Negative path | Owner |
| --- | --- | --- | --- |
| User needs operational report | [Reports](hr-admin/reports-audit.md) | [Reports evidence checklist](hr-admin/reports-audit.md) | HR Admin |
| User needs audit trail | [Audit](hr-admin/audit.md) | [Trust Audit](tenant-admin/trust-audit.md) | HR Admin / Tenant Admin |
| Finance needs close evidence | [Finance Audit Evidence](finance-manager/audit-evidence.md) | [Finance Payroll Day Checklist](checklists/finance-manager-payroll-day.md) | Finance Manager |
| Platform action needs evidence | [Platform Audit Logs](platform-admin/audit-logs.md) | [Launch Readiness](platform-admin/launch-readiness.md) | Platform Admin |

## Coverage decision

The current user guide covers the main practical paths a new user needs:

- Positive workflows: setup, action, approval, payroll close, handoff, download, export, publish, and review.
- Negative workflows: blocked, warning, rejected, failed, retry capped, missing access, missing evidence, mismatch, stale provider job, and locked state.
- Cross-workspace handoffs: Platform to Tenant, Tenant to HR, HR to Payroll, Payroll to Finance, and Finance to Audit.
- Self-service questions: ESS/MSS access, payslips, documents, tax declarations, approvals, and notifications.

If a new scenario is not in this matrix, add it before considering the documentation complete for that release.

