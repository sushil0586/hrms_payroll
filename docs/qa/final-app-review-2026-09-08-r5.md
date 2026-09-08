# Final HRMS/Payroll QA Review

Generated: 2026-09-08T03:26:04.510Z
Run ID: 2026-09-08-r5

## Executive Summary

- Total personas tested: 3
- Total unique pages discovered: 171
- Total screen/persona visits: 240
- Screens passed: 240
- Screens with warnings: 0
- Screens failed: 0
- Critical defects: 0
- High defects: 0
- Medium defects: 0
- Low defects: 0
- UX observations: 0
- Accessibility issues: 0
- Console errors: 0
- Failed API/resource requests: 0

## Module-Wise Results

| Module | Pages Tested | Status | Notes |
|---|---:|---|---|
| Attendance | 4 | PASS | No automated findings |
| Employee Self Service | 59 | PASS | No automated findings |
| HR Admin | 30 | PASS | No automated findings |
| Leave | 4 | PASS | No automated findings |
| Manager Self Service | 5 | PASS | No automated findings |
| Payroll | 22 | PASS | No automated findings |
| Tenant Admin | 7 | PASS | No automated findings |
| Workspace chooser | 1 | PASS | No automated findings |
| audit | 1 | PASS | No automated findings |
| documents | 1 | PASS | No automated findings |
| employees | 15 | PASS | No automated findings |
| generated letters | 1 | PASS | No automated findings |
| lifecycle | 1 | PASS | No automated findings |
| notifications admin | 1 | PASS | No automated findings |
| organization | 17 | PASS | No automated findings |
| reports | 1 | PASS | No automated findings |
| workflows | 1 | PASS | No automated findings |

## Screen Coverage

| Module | Persona | Screen | URL | Tested | Functional | Visual | Status |
|---|---|---|---|---|---|---|---|
| Workspace chooser | hr-admin | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Control center | http://127.0.0.1:3000/hr-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Admin Console | http://127.0.0.1:3000/tenant-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Enterprise Security Readiness | http://127.0.0.1:3000/tenant-admin/security-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://127.0.0.1:3000/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| lifecycle | hr-admin | Lifecycle | http://127.0.0.1:3000/hr-admin/lifecycle | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Employee document review with faster filtering and cleaner triage. | http://127.0.0.1:3000/hr-admin/employee-documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Reports | http://127.0.0.1:3000/hr-admin/reports | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3000/hr-admin/payroll-statutory | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3000/hr-admin/payroll-providers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance operations | http://127.0.0.1:3000/hr-admin/attendance-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| notifications admin | hr-admin | Notifications | http://127.0.0.1:3000/hr-admin/notifications-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Launch Remediation | http://127.0.0.1:3000/hr-admin/launch-remediation | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Control Plane | http://127.0.0.1:3000/hr-admin/saas-control-plane | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Operations | http://127.0.0.1:3000/hr-admin/saas-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Resilience | http://127.0.0.1:3000/hr-admin/saas-resilience | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS SLA Ops | http://127.0.0.1:3000/hr-admin/saas-sla-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Policy control | http://127.0.0.1:3000/hr-admin/policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| workflows | hr-admin | Workflow control | http://127.0.0.1:3000/hr-admin/workflows | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| documents | hr-admin | Documents control | http://127.0.0.1:3000/hr-admin/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://127.0.0.1:3000/tenant-admin/trust-audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Payslips | http://127.0.0.1:3000/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Statutory Declarations | http://127.0.0.1:3000/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Notifications | http://127.0.0.1:3000/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Documents | http://127.0.0.1:3000/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Notifications | http://127.0.0.1:3000/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://127.0.0.1:3000/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://127.0.0.1:3000/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Create employee | http://127.0.0.1:3000/hr-admin/employees/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=on_notice | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=exited | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Edit employee: Sushil Bansal | http://127.0.0.1:3000/hr-admin/employees/c37c95bd-c820-4956-b3d9-f395ac6c6e59/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Manage system access for Sushil Bansal. | http://127.0.0.1:3000/hr-admin/employees/c37c95bd-c820-4956-b3d9-f395ac6c6e59/access | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Onboarding operations with readiness, ownership, and checklist visibility. | http://127.0.0.1:3000/hr-admin/onboardings | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Probation reviews with clearer decisions and safer extension handling. | http://127.0.0.1:3000/hr-admin/probation-reviews | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Movement operations for transfers, promotions, and reporting changes. | http://127.0.0.1:3000/hr-admin/movements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Exit operations | http://127.0.0.1:3000/hr-admin/exits | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Upload employee document | http://127.0.0.1:3000/hr-admin/employee-documents/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| audit | hr-admin | Audit center | http://127.0.0.1:3000/hr-admin/audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3000/hr-admin/payroll-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Inputs | http://127.0.0.1:3000/hr-admin/payroll-inputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=ready | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=warning | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=blocked | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Calculations | http://127.0.0.1:3000/hr-admin/payroll-calculations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Handoff | http://127.0.0.1:3000/hr-admin/payroll-handoff | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3000/hr-admin/payroll-rules | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Outputs | http://127.0.0.1:3000/hr-admin/payroll-outputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3000/hr-admin/payroll-providers?connectionId=5ae11e56-1252-4950-88a7-d027a180be7b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3000/hr-admin/payroll-providers?connectionId=1bc186aa-e4cd-490f-a29c-30f8bfc5470d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3000/hr-admin/payroll-providers?connectionId=09f688bc-f00b-4232-b8ba-00698d532399 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Shift admin for working-time setup. | http://127.0.0.1:3000/hr-admin/shifts | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift assignments | http://127.0.0.1:3000/hr-admin/employee-shift-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift roster templates for repeat rollout. | http://127.0.0.1:3000/hr-admin/shift-roster-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Holiday calendars | http://127.0.0.1:3000/hr-admin/holiday-calendars | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance records review window. | http://127.0.0.1:3000/hr-admin/attendance-records | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance regularization queue for HR oversight. | http://127.0.0.1:3000/hr-admin/attendance-regularizations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification delivery | http://127.0.0.1:3000/hr-admin/notification-delivery | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | http://127.0.0.1:3000/hr-admin/notification-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | http://127.0.0.1:3000/hr-admin/notification-events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification diagnostics | http://127.0.0.1:3000/hr-admin/notification-diagnostics | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | http://127.0.0.1:3000/hr-admin/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | http://127.0.0.1:3000/hr-admin/notifications?status=failed | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | http://127.0.0.1:3000/hr-admin/notification-templates?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | http://127.0.0.1:3000/hr-admin/notification-events?active=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3000/hr-admin/salary-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Create department | http://127.0.0.1:3000/hr-admin/organization/departments/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=legal_entities | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=locations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=branches | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=business_units | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=departments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=grades | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=designations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=employment_types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?itemId=55814df3-0544-4e8d-833d-2847648d3f18 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://127.0.0.1:3000/hr-admin/organization/departments/55814df3-0544-4e8d-833d-2847648d3f18/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?itemId=4b27e393-0f47-4c46-9406-edeeb4c813b6 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://127.0.0.1:3000/hr-admin/organization/departments/4b27e393-0f47-4c46-9406-edeeb4c813b6/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave type admin for leave behavior building blocks. | http://127.0.0.1:3000/hr-admin/leave-types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance policies | http://127.0.0.1:3000/hr-admin/attendance-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave policy admin for enforceable leave behavior. | http://127.0.0.1:3000/hr-admin/leave-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave balances | http://127.0.0.1:3000/hr-admin/leave-balances | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Policy assignments | http://127.0.0.1:3000/hr-admin/policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow templates | http://127.0.0.1:3000/hr-admin/workflow-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow template assignments | http://127.0.0.1:3000/hr-admin/workflow-template-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document categories | http://127.0.0.1:3000/hr-admin/document-categories | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document requirements | http://127.0.0.1:3000/hr-admin/document-requirements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| generated letters | hr-admin | Generated HR letters | http://127.0.0.1:3000/hr-admin/generated-letters | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://127.0.0.1:3000/tenant-admin/trust-audit?event_group=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://127.0.0.1:3000/tenant-admin/trust-audit?event_group=commercial | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://127.0.0.1:3000/tenant-admin/trust-audit?event_group=tenant_admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://127.0.0.1:3000/tenant-admin/trust-audit?event_group=support | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://127.0.0.1:3000/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Payslips | http://127.0.0.1:3000/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Statutory Declarations | http://127.0.0.1:3000/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Documents | http://127.0.0.1:3000/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Notifications | http://127.0.0.1:3000/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://127.0.0.1:3000/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://127.0.0.1:3000/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://127.0.0.1:3000/mss/approvals?queue=leave&leaveId=2a1c51ac-905d-4f58-910b-9a56feeedfc4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=a5eee6f5-41a5-4689-9c4f-1c6921db9a9d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=0c86fb59-8ebd-44ad-8224-4587f0d5d59e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=ff2b80bd-e8b7-47c5-887c-d1873701ee13 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=4316256e-e540-44e5-814b-ed7237d53039 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=193f986f-fcfa-4243-8cfa-5d7a2b5f2083 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=dcd0e78e-01f0-40be-85b7-e0bb98105674 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=79cb903c-f8a6-46a2-a47a-1d24a176aa14 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=464656d4-30c7-4427-8710-c6af509629e0 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=d198203e-26a6-4b7f-aa63-0b37a87c3f10 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=c2f417ad-3d0b-49eb-92f5-bea3d5a0abd5 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?regId=1db00f18-c7d8-4f0c-924c-843961eff5cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3000/ess/notifications?page=3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3000/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | http://127.0.0.1:3000/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Documents | http://127.0.0.1:3000/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveId=2a1c51ac-905d-4f58-910b-9a56feeedfc4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?regId=1db00f18-c7d8-4f0c-924c-843961eff5cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=be2b78b8-f4b0-41d5-ae28-295001c5acbe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=3fa27d79-16ef-456d-b65e-68a8f89cc6ca | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=b03310f8-daa9-4197-97fc-2bdd01d34d0d | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=0b3fb7c3-02de-4f14-b236-5495fb701fc7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=934b0ef1-839b-482d-bbda-cd1bacc8596e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3000/ess/notifications?itemId=c2e424ed-065d-4b7e-ab68-44bd3516581e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://127.0.0.1:3000/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&leaveId=2a1c51ac-905d-4f58-910b-9a56feeedfc4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=all&leavePage=1&regId=1db00f18-c7d8-4f0c-924c-843961eff5cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&leaveId=2a1c51ac-905d-4f58-910b-9a56feeedfc4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=pending&leavePage=1&regId=1db00f18-c7d8-4f0c-924c-843961eff5cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://127.0.0.1:3000/ess?leaveStatus=approved&leavePage=1&regId=1db00f18-c7d8-4f0c-924c-843961eff5cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |

## Defect Report

No automated defects were detected in the crawler pass.

## Detailed Defects

## UI/UX Review

- The audit captured full-page screenshots for every crawled screen in the artifact folder.
- Alignment, spacing, overflow, suspicious rendered values, and accessible names were checked automatically.
- Buttons and controls were inventoried without click execution in the crawler; targeted Playwright suites cover selected safe interactions.
- Mutation-heavy buttons such as approve, reject, generate, calculate, finalize, delete, terminate, revoke, and submit were inventoried but not clicked unless part of an existing safe demo flow.

## Untested Items

- Destructive actions were not executed: delete, terminate, revoke, payroll finalization, bank/payment approval, and production-like configuration changes.
- Real external provider integrations, real SSO/MFA/SCIM IdP execution, email/SMS delivery, and production object-storage downloads require environment-specific credentials and were not executed in this local seeded run.
- Support-session workspaces require a support-agent user and active tenant-approved session grant; they were inventoried only when reachable from the current seeded personas.
- Mathematical payroll correctness was not exhaustively recalculated outside the UI; displayed totals were visually inspected and inventoried.

## Production Readiness

Recommendation: NOT READY - MAJOR FIXES REQUIRED

The crawler did not detect blocking UI defects, failed resources, console errors, or accessibility label issues in the discovered screens, but this local non-destructive pass does not fully certify destructive payroll/financial workflows, real identity-provider integrations, external payroll providers, storage/download infrastructure, or production notification delivery. Those items need targeted execution or formal sign-off before launch.

Next execution plan: `docs/qa/targeted-production-readiness-test-plan.md`

## Targeted Readiness Progress

Suite A implemented: `web/tests/e2e/production-payroll-close-flows.spec.ts`

Validated in demo mode:

- source readiness through locked inputs, rules, calculation, review/final lock, outputs, finance handoff, and ESS payslip evidence
- eight payroll-close screenshots captured in Playwright `test-results`

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-payroll-close-flows.spec.ts --workers=1
pnpm --dir web typecheck
```

Suite B implemented: `web/tests/e2e/production-payroll-negative-controls.spec.ts`

Validated in demo mode:

- blocked source-data rows and blocked input snapshots
- unsafe collecting-input payroll run posture
- calculation validation issue register for source-data and statutory setup warnings
- employee published-only payslip boundary and tenant-scoped download messaging
- HR output download, signed URL, signed-grant, revocation, expiry, and access-audit controls

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-payroll-negative-controls.spec.ts --workers=1
pnpm --dir web exec playwright test tests/e2e/production-payroll-close-flows.spec.ts tests/e2e/production-payroll-negative-controls.spec.ts --workers=1
```

Suite C implemented: `web/tests/e2e/production-provider-callback-flows.spec.ts`

Validated in demo mode:

- provider callback ledger with webhook security, signature adapter, replay-window, rate-limit, and idempotency evidence
- callback evidence drilldown with webhook identity and credential-source controls
- retry command controls, retry decision evidence, queue heartbeat, and stale-lease recovery
- delivery evidence chain and locked provider audit-pack governance
- seven provider-callback screenshots captured in Playwright `test-results`

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-provider-callback-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "payroll_provider_callback_endpoint or payroll_provider_callback_signature_adapter or provider_delivery_retry_and_dead_letter_contract"
```

Environment note:

- backend callback/retry tests pass through the repo root `.venv`; `backend/.venv` is missing `cryptography`

Suite D implemented: `web/tests/e2e/production-storage-governance-flows.spec.ts`

Validated in demo mode:

- HR payroll output storage metadata, object version, strategy, retention, grant counts, and access audit export
- employee payslip published-only and employee-scoped storage evidence
- provider storage/IAM policy readiness with runtime credentials, private endpoint, KMS, lifecycle, malware scan, durability, verified controls, and blocked raw-secret policy evidence
- browser surfaces checked for raw credential-shaped key leaks

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-storage-governance-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "configured_signed_url_storage_strategy or uninstalled_object_storage_adapter or s3_object_storage_contract_profile or raw_object_storage_credentials or missing_storage_policy_ref or storage_policy_encryption or unresolved_object_storage_credential_ref or store_read_and_sign_with_s3_sdk_runtime or storage_policy_registry_readiness or storage_control_verifiers or storage_control_verification_blocks"
```

Suite E implemented: `web/tests/e2e/production-tenant-role-isolation.spec.ts`

Validated in demo mode:

- role-scoped workspace chooser entry points
- employee payslip surface remains employee-scoped and does not expose HR/provider artifacts
- privileged HR, tenant-admin, support, and employee payroll proxy routes fail closed without a valid browser session
- tenant admin and support workspaces expose scoped role, member, support-grant, and session controls

Backend validation:

- employee denied HR/payroll/tenant-admin/SaaS/support administrative APIs
- tenant-admin session gets tenant workspace access without HR admin workspace access
- employee cannot mutate tenant-admin memberships, change requests, or support grants
- employee cannot use manager approval endpoints outside manager scope
- support session gates deny ungranted payroll scope, unsupported domains, wrong agent, stale grants, and ungranted console scopes

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-tenant-role-isolation.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "auth_login_session_logout_round_trip or tenant_admin_session_exposes_tenant_workspace_access or employee_cannot_access_hr_admin_dashboard or employee_cannot_access_hr_admin_launch_remediations or employee_cannot_access_tenant_admin_console or employee_cannot_mutate_tenant_admin_memberships or employee_cannot_create_tenant_admin_change_request or employee_cannot_create_support_access_grant or support_session_domain_snapshot_denies_ungranted_payroll_scope or support_session_domain_snapshot_respects_configured_domains or support_session_console_denies_ungranted_scope or support_session_console_denies_wrong_agent or support_session_console_expires_stale_active_grant or employee_cannot_review_tenant_admin_trust_audit or employee_cannot_review_enterprise_security_readiness or employee_cannot_download_commercial_support_audit_pack or employee_cannot_access_saas_operational_health or employee_cannot_access_saas_resilience_readiness or employee_cannot_access_saas_sla_operations or employee_cannot_access_hr_admin_payroll_readiness or employee_cannot_access_hr_admin_payroll_setup or employee_cannot_access_hr_admin_salary_setup or employee_cannot_access_hr_admin_payroll_statutory_setup or employee_cannot_access_hr_admin_payroll_input_snapshot_setup or employee_cannot_access_hr_admin_payroll_rules_setup or employee_cannot_use_manager_approval_actions"
```

Suite F implemented: `web/tests/e2e/production-notification-flows.spec.ts`

Validated in demo mode:

- HR notification queue retry-ready filter, batch selection, retry policy text, inline review, and full review link
- HR notification review for payslip publication with provider log, provider reference, retry action, payload, and backend response evidence
- notification diagnostics drilldown into failed, retry-ready, and retry-capped queues, plus channel/template/event health
- notification delivery channel health and configurable routing controls for backend, sender identity, provider JSON, and retry policy JSON
- ESS payroll notification source link into payslips with read receipt, access event, download strategy, retention, and notification evidence

Backend validation:

- employee and manager notification scopes
- employee read-state update
- `process_notifications` delivery logs for email and console-backed channels
- HR retry, bulk retry, retry-state filtering, retry-limit blocking, and employee-upload review notification creation

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-notification-flows.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "employee_notification_center_lists_and_updates_read_state or manager_notification_center_shows_manager_scope_only or process_notifications_command_delivers_email_and_console_channels or hr_admin_can_retry_notification_delivery or hr_admin_can_bulk_retry_notification_delivery or hr_admin_notification_list_can_filter_by_retry_state or hr_admin_retry_respects_notification_retry_limit or hr_admin_bulk_retry_returns_error_when_all_selected_notifications_hit_retry_limit or employee_upload_creates_hr_document_review_notification"
```

Suite G implemented: `web/tests/e2e/production-responsive-visual-gate.spec.ts`

Validated in demo mode:

- launch-critical screens across HR admin, payroll, providers, notifications, tenant admin, support, ESS, and MSS
- viewport bands: `1920x1080`, `1440x900`, `1366x768`, `1280x720`, `820x1180`, and `390x844`
- page readiness, modern shell/header presence, no document-level horizontal overflow, no off-viewport interactive controls outside intentional scroll containers, and no obvious overlapping interactive controls
- full-page screenshot evidence for every route/viewport pair

UI fix:

- mobile payroll-provider launch rehearsal actions now stack/stretch inside split panel headers, preventing the `Run rehearsal` action from extending past a `390px` viewport

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-responsive-visual-gate.spec.ts --workers=1
```

Suite H implemented: `web/tests/e2e/production-live-mutation-readiness.spec.ts`

Validated locally:

- mutation proxy routes fail closed without backend URL or browser session for HR notification retry, bulk retry, notification update, delivery-channel config update, provider launch rehearsal, tenant change request, employee notification read state, and employee payslip read receipt
- guarded proxy responses do not expose secret-shaped values, salary snapshots, provider debit account refs, or sensitive checksum-like fixture values
- mutation-capable screens expose action controls without silently mutating demo data
- Playwright web-server config now allows staging runs to pass through `HRMS_API_BASE_URL`, `HRMS_API_BEARER_TOKEN`, and `HRMS_ENABLE_DEMO_DATA`

Backend validation:

- tenant-admin change request and support access lifecycles
- employee statutory declaration create/update/submit and proof upload
- payroll input snapshot create/lock and immutable post-lock guard
- payroll adjustment create/submit/approve/apply
- provider launch rehearsal history and mapping-pack lifecycle/simulation
- employee notification read state, HR notification retry/bulk retry, and employee upload notification creation

Live staging contract:

- set `PLAYWRIGHT_LIVE_MUTATIONS=true`
- set `HRMS_API_BASE_URL`
- seed disposable records and set `PLAYWRIGHT_LIVE_RETRY_NOTIFICATION_ID`, `PLAYWRIGHT_LIVE_EMPLOYEE_NOTIFICATION_ID`, and `PLAYWRIGHT_LIVE_PAYSLIP_ID`

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-live-mutation-readiness.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "tenant_admin_can_submit_and_approve_change_request_with_audit or tenant_admin_can_control_support_access_grant_lifecycle or employee_can_create_update_and_submit_own_statutory_declaration or employee_statutory_declaration_proof_upload_creates_document_and_links_item or hr_admin_can_create_and_lock_payroll_input_snapshots or hr_admin_payroll_adjustment_create_approve_and_apply or hr_admin_can_record_payroll_provider_launch_rehearsal_history or hr_admin_payroll_provider_schema_mapping_pack_lifecycle or hr_admin_payroll_provider_schema_mapping_pack_simulates_nested_row_expansion or employee_notification_center_lists_and_updates_read_state or hr_admin_can_retry_notification_delivery or hr_admin_can_bulk_retry_notification_delivery or employee_upload_creates_hr_document_review_notification"
```

Suite I implemented: `web/tests/e2e/production-launch-release-gate.spec.ts`

Validated locally:

- HR launch cockpit with SaaS launch audit profile, gate counts, remediation actions, and audit export entry point
- SaaS operations, resilience, SLA, and commercial control-plane release posture
- tenant-admin trust/security audit surfaces and support-domain diagnostic scope
- provider launch rehearsal tied to handoff, route packages, storage/IAM policy, and provider audit-pack evidence
- launch and commercial audit export proxy routes fail closed without authenticated backend session and do not leak sensitive payloads

Backend validation:

- HRMS SaaS launch audit command/download with checksums and persisted remediation assignments
- launch remediation lifecycle and SLA reminder/escalation command
- commercial entitlement, usage snapshot, and missing-entitlement blocker evidence
- provider launch rehearsal command for blocked and ready three-lane bank/accounting/statutory states

Validation:

```bash
pnpm --dir web exec playwright test tests/e2e/production-launch-release-gate.spec.ts --workers=1
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "hr_admin_dashboard_returns_saas_launch_audit or rehearse_hrms_saas_launch_command_exports_actionable_audit_pack or hr_admin_can_download_hrms_saas_launch_audit_pack or hr_admin_can_manage_launch_remediation_assignment_lifecycle or hrms_launch_remediation_sla_processor_sends_reminders_and_escalations or hr_admin_saas_control_plane_returns_entitlements_and_usage or commercial_profile_override_adds_launch_blocker_for_missing_required_entitlement or snapshot_saas_commercial_usage_command_records_meter_history or hr_admin_can_record_payroll_provider_launch_rehearsal_history or payroll_provider_launch_rehearsal_proves_three_lane_production_readiness or rehearse_payroll_provider_launch_command_exports_blocked_audit_pack or rehearse_payroll_provider_launch_command_passes_ready_three_lane_tenant"
```

Suite J implemented: `scripts/run-production-launch-signoff.py`

Validated locally:

- repeatable `pnpm qa:launch-signoff` runner for one tenant
- Django check and migration dry-run
- HRMS launch audit, payroll provider launch rehearsal, and commercial usage snapshot management commands
- focused backend launch/rehearsal test subset
- web typecheck, lint, and Playwright production Suites A-I
- markdown/JSON launch decision reports with command logs, management command outputs, environment posture, and production exceptions

Validation:

```bash
python3 scripts/run-production-launch-signoff.py --skip-browser --artifact-dir web/qa-artifacts/production-launch-signoff-validation
pnpm qa:launch-signoff
```

Result:

- fast runner validation: `LOCAL CONTRACT PASS`
- full runner validation: `LOCAL CONTRACT PASS`
- full runner report: `web/qa-artifacts/production-launch-signoff-20260908T054812Z/launch-signoff-report.md`
- Playwright production Suites A-I inside the full runner: `34 passed`

Suite K implemented: staging launch preflight

Validated locally:

- `--preflight-only` mode writes env posture and launch exception reports without running the full suite
- `pnpm qa:launch-signoff:staging-preflight` is available for quick staging readiness checks
- `pnpm qa:launch-signoff:staging` is available for the full staging gate once live handles are configured
- sanitized staging env key template added at `docs/qa/staging-launch-signoff.env.example`
- current local staging preflight correctly reports `STAGING PREFLIGHT BLOCKED` because `HRMS_API_BASE_URL` and `PLAYWRIGHT_LIVE_SEED_PASSWORD` are not configured in this workspace

Validation:

```bash
python3 -B scripts/run-production-launch-signoff.py --mode staging --preflight-only --artifact-dir web/qa-artifacts/staging-launch-signoff-preflight-validation --allow-command-failures
python3 -B scripts/run-production-launch-signoff.py --skip-browser --artifact-dir web/qa-artifacts/production-launch-signoff-validation
```

Suite L implemented: staging disposable seed handles

Validated locally:

- repeatable seed and cleanup scripts for disposable staging launch records
- generated live mutation handles for notification retry, employee notification read state, and ESS payslip read receipt
- staging sign-off runner manifest ingestion for generated live mutation handles
- cleanup constrained to records tagged with `PW_TEST_STAGING_LAUNCH`
- backend proof that the generated handles are usable through HR and ESS APIs

Validation:

```bash
.venv/bin/python -m pytest backend/tests/test_phase0_api_smoke.py -k "seed_staging_launch_data"
pnpm qa:staging-seed:cleanup
pnpm qa:staging-seed
PLAYWRIGHT_LIVE_SEED_PASSWORD=Password@123 HRMS_API_BASE_URL=http://127.0.0.1:8000/api/v1 python3 -B scripts/run-production-launch-signoff.py --mode staging --preflight-only --artifact-dir web/qa-artifacts/staging-launch-signoff-manifest-validation
```

## Artifact Locations

- Application map: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r5/application-map.json
- Element inventory: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r5/element-inventory.json
- Defects JSON: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r5/defects.json
- Screenshots: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r5/screenshots
