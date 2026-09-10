# Final HRMS/Payroll QA Review

Generated: 2026-09-08T15:40:24.349Z
Run ID: stage-browser-functionality-final2-2026-09-08

## Executive Summary

- Total personas tested: 4
- Total unique pages discovered: 183
- Total screen/persona visits: 249
- Screens passed: 248
- Screens with warnings: 0
- Screens failed: 1
- Critical defects: 0
- High defects: 1
- Medium defects: 0
- Low defects: 0
- UX observations: 0
- Accessibility issues: 0
- Console errors: 1
- Failed API/resource requests: 0

## Module-Wise Results

| Module | Pages Tested | Status | Notes |
|---|---:|---|---|
| Attendance | 4 | PASS | No automated findings |
| Employee Self Service | 62 | PASS | No automated findings |
| HR Admin | 30 | FAIL | 1 finding(s) |
| Leave | 4 | PASS | No automated findings |
| Manager Self Service | 5 | PASS | No automated findings |
| Payroll | 21 | PASS | No automated findings |
| Platform Admin | 8 | PASS | No automated findings |
| Tenant Admin | 10 | PASS | No automated findings |
| Workspace chooser | 1 | PASS | No automated findings |
| audit | 1 | PASS | No automated findings |
| documents | 1 | PASS | No automated findings |
| employees | 14 | PASS | No automated findings |
| generated letters | 1 | PASS | No automated findings |
| lifecycle | 1 | PASS | No automated findings |
| notifications admin | 1 | PASS | No automated findings |
| organization | 17 | PASS | No automated findings |
| reports | 1 | PASS | No automated findings |
| workflows | 1 | PASS | No automated findings |

## Screen Coverage

| Module | Persona | Screen | URL | Tested | Functional | Visual | Status |
|---|---|---|---|---|---|---|---|
| Workspace chooser | platform-admin | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?panel=policy-packs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?panel=events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=c975df06-5771-450e-b7e6-cd1192eb375c&panel=onboarding | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=c975df06-5771-450e-b7e6-cd1192eb375c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=4603c197-b375-4ae2-a44b-d65f51ac1c33 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=81a7736c-b2e5-4946-98bf-7e501c36925d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=3b5b0e4f-ee25-4aa9-86a5-50bb667c9956 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | hr-admin | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Control center | https://hrms.accerio.in/hr-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Admin Console | https://hrms.accerio.in/tenant-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Enterprise Security Readiness | https://hrms.accerio.in/tenant-admin/security-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | https://hrms.accerio.in/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| lifecycle | hr-admin | Lifecycle | https://hrms.accerio.in/hr-admin/lifecycle | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Employee document review with faster filtering and cleaner triage. | https://hrms.accerio.in/hr-admin/employee-documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Reports | https://hrms.accerio.in/hr-admin/reports | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | https://hrms.accerio.in/hr-admin/payroll-statutory | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | https://hrms.accerio.in/hr-admin/payroll-providers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance operations | https://hrms.accerio.in/hr-admin/attendance-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| notifications admin | hr-admin | Notifications | https://hrms.accerio.in/hr-admin/notifications-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Launch Remediation | https://hrms.accerio.in/hr-admin/launch-remediation | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Control Plane | https://hrms.accerio.in/hr-admin/saas-control-plane | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Operations | https://hrms.accerio.in/hr-admin/saas-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Resilience | https://hrms.accerio.in/hr-admin/saas-resilience | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS SLA Ops | https://hrms.accerio.in/hr-admin/saas-sla-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Policy control | https://hrms.accerio.in/hr-admin/policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| workflows | hr-admin | Workflow control | https://hrms.accerio.in/hr-admin/workflows | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| documents | hr-admin | Documents control | https://hrms.accerio.in/hr-admin/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Payslips | https://hrms.accerio.in/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Statutory Declarations | https://hrms.accerio.in/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Notifications | https://hrms.accerio.in/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Documents | https://hrms.accerio.in/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?panel=policy-packs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?panel=events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=c975df06-5771-450e-b7e6-cd1192eb375c&panel=onboarding | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=c975df06-5771-450e-b7e6-cd1192eb375c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=4603c197-b375-4ae2-a44b-d65f51ac1c33 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=81a7736c-b2e5-4946-98bf-7e501c36925d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | hr-admin | Platform Admin Console | https://hrms.accerio.in/platform-admin?tenantId=3b5b0e4f-ee25-4aa9-86a5-50bb667c9956 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Notifications | https://hrms.accerio.in/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | https://hrms.accerio.in/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | https://hrms.accerio.in/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Create employee | https://hrms.accerio.in/hr-admin/employees/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?status=on_notice | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?status=exited | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?employeeId=8025e5a1-5d2e-4b6b-a534-ca767175880e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?employeeId=8aa91261-78de-45a3-bce9-af6985117825 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?employeeId=cbd597b4-6831-408e-89eb-51495aaf1b45 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?employeeId=8979e2ed-ecea-44c4-93a3-41eb40be074b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | https://hrms.accerio.in/hr-admin/employees?employeeId=b113b80f-3a7e-4741-b40a-04693f454857 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Edit employee: Nisha Rao | https://hrms.accerio.in/hr-admin/employees/8025e5a1-5d2e-4b6b-a534-ca767175880e/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Manage system access for Nisha Rao. | https://hrms.accerio.in/hr-admin/employees/8025e5a1-5d2e-4b6b-a534-ca767175880e/access | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Onboarding operations with readiness, ownership, and checklist visibility. | https://hrms.accerio.in/hr-admin/onboardings | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Probation reviews with clearer decisions and safer extension handling. | https://hrms.accerio.in/hr-admin/probation-reviews | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Movement operations for transfers, promotions, and reporting changes. | https://hrms.accerio.in/hr-admin/movements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Exit operations | https://hrms.accerio.in/hr-admin/exits | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Upload employee document | https://hrms.accerio.in/hr-admin/employee-documents/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| audit | hr-admin | Audit center | https://hrms.accerio.in/hr-admin/audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | https://hrms.accerio.in/hr-admin/payroll-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Inputs | https://hrms.accerio.in/hr-admin/payroll-inputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?status=ready | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?status=warning | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?status=blocked | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?employeeId=8025e5a1-5d2e-4b6b-a534-ca767175880e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?employeeId=8aa91261-78de-45a3-bce9-af6985117825 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?employeeId=cbd597b4-6831-408e-89eb-51495aaf1b45 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?employeeId=8979e2ed-ecea-44c4-93a3-41eb40be074b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | https://hrms.accerio.in/hr-admin/payroll-readiness?employeeId=b113b80f-3a7e-4741-b40a-04693f454857 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Calculations | https://hrms.accerio.in/hr-admin/payroll-calculations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Handoff | https://hrms.accerio.in/hr-admin/payroll-handoff | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | https://hrms.accerio.in/hr-admin/payroll-rules | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Outputs | https://hrms.accerio.in/hr-admin/payroll-outputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | https://hrms.accerio.in/hr-admin/payroll-providers?connectionId=642e0e17-bcaf-4033-8569-bc8f63e38727 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | https://hrms.accerio.in/hr-admin/payroll-providers?connectionId=a6634340-e188-446f-9701-ed19044da380 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | https://hrms.accerio.in/hr-admin/payroll-providers?connectionId=5061323f-17b6-49dc-8cc2-23334cabce71 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Shift admin for working-time setup. | https://hrms.accerio.in/hr-admin/shifts | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift assignments | https://hrms.accerio.in/hr-admin/employee-shift-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift roster templates for repeat rollout. | https://hrms.accerio.in/hr-admin/shift-roster-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Holiday calendars | https://hrms.accerio.in/hr-admin/holiday-calendars | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance records review window. | https://hrms.accerio.in/hr-admin/attendance-records | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance regularization queue for HR oversight. | https://hrms.accerio.in/hr-admin/attendance-regularizations | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| HR Admin | hr-admin | Notification delivery | https://hrms.accerio.in/hr-admin/notification-delivery | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | https://hrms.accerio.in/hr-admin/notification-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | https://hrms.accerio.in/hr-admin/notification-events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification diagnostics | https://hrms.accerio.in/hr-admin/notification-diagnostics | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | https://hrms.accerio.in/hr-admin/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | https://hrms.accerio.in/hr-admin/notifications?status=failed | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | https://hrms.accerio.in/hr-admin/notification-templates?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | https://hrms.accerio.in/hr-admin/notification-events?active=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | https://hrms.accerio.in/hr-admin/salary-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Create department | https://hrms.accerio.in/hr-admin/organization/departments/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=legal_entities | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=locations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=branches | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=business_units | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=departments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=grades | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=designations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?section=employment_types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?itemId=ec3211ac-6faa-43d4-9228-2d49d435102e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | https://hrms.accerio.in/hr-admin/organization/departments/ec3211ac-6faa-43d4-9228-2d49d435102e/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | https://hrms.accerio.in/hr-admin/organization?itemId=14d19e73-5fca-48ba-9ff7-aa2457a665fa | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | https://hrms.accerio.in/hr-admin/organization/departments/14d19e73-5fca-48ba-9ff7-aa2457a665fa/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave type admin for leave behavior building blocks. | https://hrms.accerio.in/hr-admin/leave-types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance policies | https://hrms.accerio.in/hr-admin/attendance-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave policy admin for enforceable leave behavior. | https://hrms.accerio.in/hr-admin/leave-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave balances | https://hrms.accerio.in/hr-admin/leave-balances | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Policy assignments | https://hrms.accerio.in/hr-admin/policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow templates | https://hrms.accerio.in/hr-admin/workflow-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow template assignments | https://hrms.accerio.in/hr-admin/workflow-template-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document categories | https://hrms.accerio.in/hr-admin/document-categories | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document requirements | https://hrms.accerio.in/hr-admin/document-requirements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| generated letters | hr-admin | Generated HR letters | https://hrms.accerio.in/hr-admin/generated-letters | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=commercial | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=tenant_admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=support | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=all&event_type=support_access_session_denied | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=all&event_type=tenant_change_request_submitted | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | https://hrms.accerio.in/tenant-admin/trust-audit?event_group=all&event_type=usage_snapshot_recorded | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | https://hrms.accerio.in/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Payslips | https://hrms.accerio.in/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Statutory Declarations | https://hrms.accerio.in/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Documents | https://hrms.accerio.in/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Notifications | https://hrms.accerio.in/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | https://hrms.accerio.in/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | https://hrms.accerio.in/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | https://hrms.accerio.in/mss/approvals?queue=leave&leaveId=95a97f24-6eb6-440a-955b-e1878bcf70cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=6150b1de-04ab-4bc8-91fc-34aeb9eda748 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=ea752577-fc09-4fc9-bd9d-2e118b121c3c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=47f76181-fc95-4ac4-b88c-5909270cfe2f | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=1acd023b-fa11-46ac-a7ef-bd5481d1f7bf | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=0f9e7a52-4e89-4865-b2c1-99c45c7d2177 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=85c4d137-acd7-4874-8457-2e99cbbbca46 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=a880c714-789f-486f-8acf-3bc003660c76 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | https://hrms.accerio.in/ess/notifications?itemId=c93d722f-2164-44b9-827b-c31c4b32ce57 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?regId=361bd4c0-f18a-4536-8fcf-b1c99460f5b8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | https://hrms.accerio.in/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | https://hrms.accerio.in/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Documents | https://hrms.accerio.in/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveId=95a97f24-6eb6-440a-955b-e1878bcf70cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?regId=361bd4c0-f18a-4536-8fcf-b1c99460f5b8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | https://hrms.accerio.in/ess/payslips?page_size=10&payslipId=cca89acc-0378-4496-bee0-356c1ded44a0 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | https://hrms.accerio.in/ess/payslips?page=1&page_size=10&payslipId=cca89acc-0378-4496-bee0-356c1ded44a0 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=b4b81a33-d5b1-4550-8bb2-22853527ef77 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=567b4118-58e4-43a9-8bb2-2b822836ca00 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=6673bf35-bf1b-4a9a-b70b-8182a56a2a95 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=447e91fa-ca3d-4ea8-8ced-8e755ca82521 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=1c08ad15-e7f8-4abb-b2fd-2d0f12c70c97 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=bf960d03-5d5d-4b44-baac-6a2589483f0c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | https://hrms.accerio.in/ess/notifications?itemId=30d3df7d-fe9e-4fb9-9cc4-e245af2be0e2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | https://hrms.accerio.in/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&leaveId=95a97f24-6eb6-440a-955b-e1878bcf70cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=all&leavePage=1&regId=361bd4c0-f18a-4536-8fcf-b1c99460f5b8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&leaveId=95a97f24-6eb6-440a-955b-e1878bcf70cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=pending&leavePage=1&regId=361bd4c0-f18a-4536-8fcf-b1c99460f5b8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | https://hrms.accerio.in/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |

## Defect Report

| Severity | Module | Screen | Issue | Screenshot | Recommendation |
|---|---|---|---|---|---|
| HIGH | HR Admin | Attendance regularization queue for HR oversight. | Uncaught page error: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings. | hr-admin/093-hr-admin-attendance-regularizations.png | Trace the exception stack and add a regression test for this route. |

## Detailed Defects

### QA-001: Uncaught page error

- Module: HR Admin
- Screen: Attendance regularization queue for HR oversight.
- URL: https://hrms.accerio.in/hr-admin/attendance-regularizations
- Severity: HIGH
- Category: Browser Console
- Description: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Steps to Reproduce: Login as hr-admin. / Open https://hrms.accerio.in/hr-admin/attendance-regularizations.
- Expected Result: No uncaught JavaScript errors should occur.
- Actual Result: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Screenshot: hr-admin/093-hr-admin-attendance-regularizations.png
- Console Error: Minified React error #418; visit https://react.dev/errors/418?args[]=text&args[]= for the full message or use the non-minified dev environment for full errors and additional helpful warnings.
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Trace the exception stack and add a regression test for this route.

## UI/UX Review

- The audit captured full-page screenshots for every crawled screen in the artifact folder.
- Alignment, spacing, overflow, suspicious rendered values, and accessible names were checked automatically.
- Buttons and controls were inventoried without click execution in the crawler; targeted Playwright suites cover selected safe interactions.
- Mutation-heavy buttons such as approve, reject, generate, calculate, finalize, delete, terminate, revoke, and submit were inventoried but not clicked unless part of an existing safe demo flow.

## Untested Items

- Destructive actions were not executed: delete, terminate, revoke, payroll finalization, bank/payment approval, and production-like configuration changes.
- Real external provider integrations, real SSO/MFA/SCIM IdP execution, email/SMS delivery, and production object-storage downloads require environment-specific credentials and were not executed in this local seeded run.
- Support-session workspaces require a support-agent user and active tenant-approved session grant; they were inventoried only when reachable from the current seeded personas.
- Platform-policy item authoring is tracked separately because the current browser surface supports pack header creation/publication/adoption but not item-level CRUD.
- Mathematical payroll correctness was not exhaustively recalculated outside the UI; displayed totals were visually inspected and inventoried.

## Production Readiness

Recommendation: NOT READY - MAJOR FIXES REQUIRED

The app is not fully production-ready until the listed findings and untested high-risk workflows are resolved or manually signed off.

## Artifact Locations

- Application map: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-stage-browser-functionality-final2-2026-09-08/application-map.json
- Element inventory: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-stage-browser-functionality-final2-2026-09-08/element-inventory.json
- Defects JSON: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-stage-browser-functionality-final2-2026-09-08/defects.json
- Screenshots: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-stage-browser-functionality-final2-2026-09-08/screenshots