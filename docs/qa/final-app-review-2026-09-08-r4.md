# Final HRMS/Payroll QA Review

Generated: 2026-09-08T03:18:41.810Z
Run ID: 2026-09-08-r4

## Executive Summary

- Total personas tested: 3
- Total unique pages discovered: 171
- Total screen/persona visits: 240
- Screens passed: 202
- Screens with warnings: 38
- Screens failed: 0
- Critical defects: 0
- High defects: 0
- Medium defects: 0
- Low defects: 0
- UX observations: 0
- Accessibility issues: 37
- Console errors: 0
- Failed API/resource requests: 1

## Module-Wise Results

| Module | Pages Tested | Status | Notes |
|---|---:|---|---|
| Attendance | 4 | PASS | No automated findings |
| Employee Self Service | 59 | PASS | No automated findings |
| HR Admin | 30 | PASS | No automated findings |
| Leave | 4 | PASS | No automated findings |
| Manager Self Service | 5 | PASS | No automated findings |
| Payroll | 22 | WARNING | 11 finding(s) |
| Tenant Admin | 7 | PASS | No automated findings |
| Workspace chooser | 1 | PASS | No automated findings |
| audit | 1 | PASS | No automated findings |
| documents | 1 | PASS | No automated findings |
| employees | 15 | WARNING | 12 finding(s) |
| generated letters | 1 | PASS | No automated findings |
| lifecycle | 1 | PASS | No automated findings |
| notifications admin | 1 | PASS | No automated findings |
| organization | 17 | WARNING | 14 finding(s) |
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
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| lifecycle | hr-admin | Lifecycle | http://127.0.0.1:3000/hr-admin/lifecycle | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Employee document review with faster filtering and cleaner triage. | http://127.0.0.1:3000/hr-admin/employee-documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Reports | http://127.0.0.1:3000/hr-admin/reports | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3000/hr-admin/payroll-statutory | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3000/hr-admin/payroll-providers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance operations | http://127.0.0.1:3000/hr-admin/attendance-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| notifications admin | hr-admin | Notifications | http://127.0.0.1:3000/hr-admin/notifications-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Launch Remediation | http://127.0.0.1:3000/hr-admin/launch-remediation | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Control Plane | http://127.0.0.1:3000/hr-admin/saas-control-plane | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Operations | http://127.0.0.1:3000/hr-admin/saas-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Resilience | http://127.0.0.1:3000/hr-admin/saas-resilience | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS SLA Ops | http://127.0.0.1:3000/hr-admin/saas-sla-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
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
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=all | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=active | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=on_notice | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?status=exited | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| employees | hr-admin | Employees | http://127.0.0.1:3000/hr-admin/employees?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
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
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=all | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=ready | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=warning | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?status=blocked | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
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
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=legal_entities | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=locations | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=branches | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=business_units | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=departments | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=grades | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=designations | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?section=employment_types | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=all | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=active | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?itemId=55814df3-0544-4e8d-833d-2847648d3f18 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
| organization | hr-admin | Edit department | http://127.0.0.1:3000/hr-admin/organization/departments/55814df3-0544-4e8d-833d-2847648d3f18/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://127.0.0.1:3000/hr-admin/organization?itemId=4b27e393-0f47-4c46-9406-edeeb4c813b6 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
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
| Employee Self Service | hr-admin | Self service | http://127.0.0.1:3000/ess?leaveStatus=rejected&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | WARNING |
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

| Severity | Module | Screen | Issue | Screenshot | Recommendation |
|---|---|---|---|---|---|
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/007-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/011-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/021-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/044-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/045-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/046-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/047-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/048-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/049-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/050-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/051-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/052-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/053-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | employees | Employees | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/054-hr-admin-employees.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/065-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/066-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/067-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/068-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/069-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/070-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/071-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/072-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/073-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | Payroll | Payroll Readiness | Input without accessible label: 1 visible input(s) rely on missing or weak labeling. | hr-admin/074-hr-admin-payroll-readiness.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/098-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/099-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/100-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/101-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/102-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/103-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/104-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/105-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/106-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/107-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/108-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/109-hr-admin-organization.png | Associate each input with a label element or aria-label. |
| ACCESSIBILITY | organization | Organization setup review for the structural backbone of the HRMS. | Input without accessible label: 2 visible input(s) rely on missing or weak labeling. | hr-admin/111-hr-admin-organization.png | Associate each input with a label element or aria-label. |

## Detailed Defects

### QA-001: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/007-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-002: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/011-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-003: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/021-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-004: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?status=all
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?status=all. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/044-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-005: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?status=active
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?status=active. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/045-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-006: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?status=on_notice
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?status=on_notice. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/046-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-007: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?status=inactive
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?status=inactive. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/047-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-008: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?status=exited
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?status=exited. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/048-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-009: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/049-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-010: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/050-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-011: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/051-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-012: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/052-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-013: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/053-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-014: Input without accessible label

- Module: employees
- Screen: Employees
- URL: http://127.0.0.1:3000/hr-admin/employees?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/employees?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/054-hr-admin-employees.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-015: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?status=all
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?status=all. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/065-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-016: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?status=ready
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?status=ready. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/066-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-017: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?status=warning
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?status=warning. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/067-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-018: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?status=blocked
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?status=blocked. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/068-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-019: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c37c95bd-c820-4956-b3d9-f395ac6c6e59. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/069-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-020: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=02384187-1610-4e1e-8ab9-ebaca795f739. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/070-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-021: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=442cb10b-f9c2-4a12-bde3-bf88444fcd53. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/071-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-022: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=ade2e369-addc-4b3f-b455-d438ed8dad18. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/072-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-023: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=e33860c7-ea3e-4701-b3d7-c9b35887cca2. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/073-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-024: Input without accessible label

- Module: Payroll
- Screen: Payroll Readiness
- URL: http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 1 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/payroll-readiness?employeeId=c10231cb-8892-45e8-aa16-ed8d4faa514d. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/074-hr-admin-payroll-readiness.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-025: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=legal_entities
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=legal_entities. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/098-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-026: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=locations
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=locations. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/099-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-027: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=branches
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=branches. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/100-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-028: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=business_units
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=business_units. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/101-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-029: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=departments
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=departments. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/102-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-030: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=grades
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=grades. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/103-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-031: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=designations
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=designations. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/104-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-032: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?section=employment_types
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?section=employment_types. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/105-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-033: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?status=all
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?status=all. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/106-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-034: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?status=active
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?status=active. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/107-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-035: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?status=inactive
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?status=inactive. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/108-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-036: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?itemId=55814df3-0544-4e8d-833d-2847648d3f18
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?itemId=55814df3-0544-4e8d-833d-2847648d3f18. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/109-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

### QA-037: Input without accessible label

- Module: organization
- Screen: Organization setup review for the structural backbone of the HRMS.
- URL: http://127.0.0.1:3000/hr-admin/organization?itemId=4b27e393-0f47-4c46-9406-edeeb4c813b6
- Severity: ACCESSIBILITY
- Category: Accessibility
- Description: 2 visible input(s) rely on missing or weak labeling.
- Steps to Reproduce: Login as hr-admin. / Open http://127.0.0.1:3000/hr-admin/organization?itemId=4b27e393-0f47-4c46-9406-edeeb4c813b6. / Inspect visible inputs.
- Expected Result: Every input should have a persistent accessible label.
- Actual Result: One or more inputs do not expose a label.
- Screenshot: hr-admin/111-hr-admin-organization.png
- Console Error: None captured
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Associate each input with a label element or aria-label.

## UI/UX Review

- The audit captured full-page screenshots for every crawled screen in the artifact folder.
- Alignment, spacing, overflow, suspicious rendered values, and accessible names were checked automatically.
- Buttons were hovered/focused and only non-destructive safe controls were clicked.
- Mutation-heavy buttons such as approve, reject, generate, calculate, finalize, delete, terminate, revoke, and submit were inventoried but not clicked unless part of an existing safe demo flow.

## Untested Items

- Destructive actions were not executed: delete, terminate, revoke, payroll finalization, bank/payment approval, and production-like configuration changes.
- Real external provider integrations, real SSO/MFA/SCIM IdP execution, email/SMS delivery, and production object-storage downloads require environment-specific credentials and were not executed in this local seeded run.
- Support-session workspaces require a support-agent user and active tenant-approved session grant; they were inventoried only when reachable from the current seeded personas.
- Mathematical payroll correctness was not exhaustively recalculated outside the UI; displayed totals were visually inspected and inventoried.

## Production Readiness

Recommendation: READY WITH MINOR FIXES

The app is not fully production-ready until the listed findings and untested mutation workflows are resolved or manually signed off.

## Artifact Locations

- Application map: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r4/application-map.json
- Element inventory: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r4/element-inventory.json
- Defects JSON: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r4/defects.json
- Screenshots: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08-r4/screenshots