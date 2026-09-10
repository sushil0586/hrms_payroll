# Final HRMS/Payroll QA Review

Generated: 2026-09-09T03:58:11.163Z
Run ID: 2026-09-08

## Executive Summary

- Total personas tested: 4
- Total unique pages discovered: 190
- Total screen/persona visits: 249
- Screens passed: 249
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
| Employee Self Service | 61 | PASS | No automated findings |
| HR Admin | 30 | PASS | No automated findings |
| Leave | 4 | PASS | No automated findings |
| Manager Self Service | 5 | PASS | No automated findings |
| Payroll | 21 | PASS | No automated findings |
| Platform Admin | 8 | PASS | No automated findings |
| Tenant Admin | 11 | PASS | No automated findings |
| Workspace chooser | 1 | PASS | No automated findings |
| audit | 1 | PASS | No automated findings |
| documents | 1 | PASS | No automated findings |
| employees | 14 | PASS | No automated findings |
| generated letters | 1 | PASS | No automated findings |
| lifecycle | 1 | PASS | No automated findings |
| notifications admin | 1 | PASS | No automated findings |
| organization | 24 | PASS | No automated findings |
| reports | 1 | PASS | No automated findings |
| workflows | 1 | PASS | No automated findings |

## Screen Coverage

| Module | Persona | Screen | URL | Tested | Functional | Visual | Status |
|---|---|---|---|---|---|---|---|
| Workspace chooser | platform-admin | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?panel=policy-packs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?panel=events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?tenantId=19a14dc2-4a9b-4295-9a63-303e4334899a&panel=onboarding | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?tenantId=19a14dc2-4a9b-4295-9a63-303e4334899a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?tenantId=f9beab80-7c61-4581-b547-a21a0cd462cb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?tenantId=0dccd3e0-a436-41ee-9e7e-d52a41839efb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Console | http://localhost:3211/platform-admin?tenantId=3b7d2535-6b61-4c8e-8037-c6e9636b5d3a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | hr-admin | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Control center | http://localhost:3211/hr-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Admin Console | http://localhost:3211/tenant-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Enterprise Security Readiness | http://localhost:3211/tenant-admin/security-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://localhost:3211/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| lifecycle | hr-admin | Lifecycle | http://localhost:3211/hr-admin/lifecycle | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Employee document review with faster filtering and cleaner triage. | http://localhost:3211/hr-admin/employee-documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Reports | http://localhost:3211/hr-admin/reports | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://localhost:3211/hr-admin/payroll-statutory | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://localhost:3211/hr-admin/payroll-providers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance operations | http://localhost:3211/hr-admin/attendance-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| notifications admin | hr-admin | Notifications | http://localhost:3211/hr-admin/notifications-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Launch Remediation | http://localhost:3211/hr-admin/launch-remediation | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Control Plane | http://localhost:3211/hr-admin/saas-control-plane | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Operations | http://localhost:3211/hr-admin/saas-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Resilience | http://localhost:3211/hr-admin/saas-resilience | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS SLA Ops | http://localhost:3211/hr-admin/saas-sla-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Policy control | http://localhost:3211/hr-admin/policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| workflows | hr-admin | Workflow control | http://localhost:3211/hr-admin/workflows | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| documents | hr-admin | Documents control | http://localhost:3211/hr-admin/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Payslips | http://localhost:3211/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Statutory Declarations | http://localhost:3211/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Notifications | http://localhost:3211/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Documents | http://localhost:3211/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Notifications | http://localhost:3211/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://localhost:3211/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager inbox | http://localhost:3211/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Create employee | http://localhost:3211/hr-admin/employees/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?status=on_notice | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?status=exited | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?employeeId=0b8b0386-0f04-4f4a-b33c-97f855ec2367 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?employeeId=2a899587-17b8-4ac7-a35c-e1fd1bde765c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?employeeId=845c9176-3d4e-456f-ae21-b11559430cfe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?employeeId=cf2082e1-2250-4177-8750-ce03cd127ea6 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://localhost:3211/hr-admin/employees?employeeId=cd67c3e6-5656-431d-8924-d329710a7d75 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Edit employee: Nisha Rao | http://localhost:3211/hr-admin/employees/0b8b0386-0f04-4f4a-b33c-97f855ec2367/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Manage system access for Nisha Rao. | http://localhost:3211/hr-admin/employees/0b8b0386-0f04-4f4a-b33c-97f855ec2367/access | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Onboarding operations with readiness, ownership, and checklist visibility. | http://localhost:3211/hr-admin/onboardings | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Probation reviews with clearer decisions and safer extension handling. | http://localhost:3211/hr-admin/probation-reviews | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Movement operations for transfers, promotions, and reporting changes. | http://localhost:3211/hr-admin/movements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Exit operations | http://localhost:3211/hr-admin/exits | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Upload employee document | http://localhost:3211/hr-admin/employee-documents/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| audit | hr-admin | Audit center | http://localhost:3211/hr-admin/audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://localhost:3211/hr-admin/payroll-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Inputs | http://localhost:3211/hr-admin/payroll-inputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?status=ready | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?status=warning | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?status=blocked | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?employeeId=0b8b0386-0f04-4f4a-b33c-97f855ec2367 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?employeeId=2a899587-17b8-4ac7-a35c-e1fd1bde765c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?employeeId=845c9176-3d4e-456f-ae21-b11559430cfe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?employeeId=cf2082e1-2250-4177-8750-ce03cd127ea6 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://localhost:3211/hr-admin/payroll-readiness?employeeId=cd67c3e6-5656-431d-8924-d329710a7d75 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Calculations | http://localhost:3211/hr-admin/payroll-calculations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Handoff | http://localhost:3211/hr-admin/payroll-handoff | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://localhost:3211/hr-admin/payroll-rules | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Outputs | http://localhost:3211/hr-admin/payroll-outputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://localhost:3211/hr-admin/payroll-providers?connectionId=e850c681-166a-4eaf-b108-45d976905845 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://localhost:3211/hr-admin/payroll-providers?connectionId=1ea42c89-78a6-4af1-ae32-1f91c22d5bb9 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://localhost:3211/hr-admin/payroll-providers?connectionId=a36be968-5472-4828-878d-adf45c46035e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Shift admin for working-time setup. | http://localhost:3211/hr-admin/shifts | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift assignments | http://localhost:3211/hr-admin/employee-shift-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift roster templates for repeat rollout. | http://localhost:3211/hr-admin/shift-roster-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Holiday calendars | http://localhost:3211/hr-admin/holiday-calendars | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance records review window. | http://localhost:3211/hr-admin/attendance-records | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance regularization queue for HR oversight. | http://localhost:3211/hr-admin/attendance-regularizations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification delivery | http://localhost:3211/hr-admin/notification-delivery | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | http://localhost:3211/hr-admin/notification-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | http://localhost:3211/hr-admin/notification-events | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification diagnostics | http://localhost:3211/hr-admin/notification-diagnostics | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | http://localhost:3211/hr-admin/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification queue | http://localhost:3211/hr-admin/notifications?status=failed | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification templates | http://localhost:3211/hr-admin/notification-templates?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification events | http://localhost:3211/hr-admin/notification-events?active=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://localhost:3211/hr-admin/salary-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Create department | http://localhost:3211/hr-admin/organization/departments/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=legal_entities | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=locations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=branches | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=business_units | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=departments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=cost_centers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=grades | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=designations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?section=employment_types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?status=active | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?status=inactive | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?itemId=6c47cb26-1ef9-412e-8bbf-12b1135e94bb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://localhost:3211/hr-admin/organization/departments/6c47cb26-1ef9-412e-8bbf-12b1135e94bb/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?itemId=3683d28a-192b-4aa1-baae-1a19a0b8dc6c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://localhost:3211/hr-admin/organization/departments/3683d28a-192b-4aa1-baae-1a19a0b8dc6c/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?itemId=288d7b41-2c6e-405e-b608-606156e2170b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://localhost:3211/hr-admin/organization/departments/288d7b41-2c6e-405e-b608-606156e2170b/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?itemId=00aae360-3930-4b89-96a8-1f4e105c6257 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://localhost:3211/hr-admin/organization/departments/00aae360-3930-4b89-96a8-1f4e105c6257/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization setup review for the structural backbone of the HRMS. | http://localhost:3211/hr-admin/organization?itemId=8b08ee14-4c7b-4c20-918e-929c6cbdae8b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Edit department | http://localhost:3211/hr-admin/organization/departments/8b08ee14-4c7b-4c20-918e-929c6cbdae8b/edit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave type admin for leave behavior building blocks. | http://localhost:3211/hr-admin/leave-types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance policies | http://localhost:3211/hr-admin/attendance-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave policy admin for enforceable leave behavior. | http://localhost:3211/hr-admin/leave-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave balances | http://localhost:3211/hr-admin/leave-balances | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Policy assignments | http://localhost:3211/hr-admin/policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow templates | http://localhost:3211/hr-admin/workflow-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Workflow template assignments | http://localhost:3211/hr-admin/workflow-template-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document categories | http://localhost:3211/hr-admin/document-categories | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Document requirements | http://localhost:3211/hr-admin/document-requirements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| generated letters | hr-admin | Generated HR letters | http://localhost:3211/hr-admin/generated-letters | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=commercial | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=tenant_admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=support | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=all&event_type=support_access_session_denied | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=all&event_type=tenant_change_request_applied | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=all&event_type=tenant_change_request_approved | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant Trust Audit | http://localhost:3211/tenant-admin/trust-audit?event_group=all&event_type=tenant_change_request_submitted | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://localhost:3211/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Payslips | http://localhost:3211/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Statutory Declarations | http://localhost:3211/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Documents | http://localhost:3211/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | manager | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Notifications | http://localhost:3211/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://localhost:3211/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://localhost:3211/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager inbox | http://localhost:3211/mss/approvals?queue=leave&leaveId=9bb592e4-fd84-4ca0-a712-3d9b755ee358 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=122f6b10-6a58-4762-afdd-3792abc9231a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=5c9a558e-3455-4cbf-9bbe-ac675410eb3b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=2627305c-c90a-4f0a-bfb6-e1e2ff414334 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=4a64bd3a-7ef0-4612-aa66-eb0cc75bf5cc | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=60dde46d-8605-4a0f-90bb-0667f2a66dcb | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://localhost:3211/ess/notifications?itemId=f142667a-e2d8-4294-ae6e-fca7eea2a7ea | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regId=e7f2d7c6-ee6c-4b99-8f20-b1cc36ab8b1a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=all&regPage=1&leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Self service | http://localhost:3211/ess?regStatus=all&regPage=1&leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://localhost:3211/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | http://localhost:3211/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Documents | http://localhost:3211/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=rejected&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=withdrawn&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=cancelled&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveId=9bb592e4-fd84-4ca0-a712-3d9b755ee358 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?regId=e7f2d7c6-ee6c-4b99-8f20-b1cc36ab8b1a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://localhost:3211/ess/payslips?page_size=10&payslipId=1d9f596e-3652-45d0-b0ff-5f9f1fc7a974 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://localhost:3211/ess/payslips?page=1&page_size=10&payslipId=1d9f596e-3652-45d0-b0ff-5f9f1fc7a974 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=d5c51ca7-be61-42ef-a4c2-c3fa46e3146b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=0d8a088a-2804-4845-8716-b15b9e7e48d4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=0820a165-1b89-4853-9972-517f50951efa | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=bd2d2dd0-6b72-4aee-967e-3d01dd7b11a3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=adcc9da5-7c49-4b20-bb80-5d0027f998f7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://localhost:3211/ess/notifications?itemId=0e055a8e-c350-4a07-b710-217b62bf4345 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Workspace chooser | employee | Choose your workspace | http://localhost:3211/ | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&leaveId=9bb592e4-fd84-4ca0-a712-3d9b755ee358 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=all&leavePage=1&regId=e7f2d7c6-ee6c-4b99-8f20-b1cc36ab8b1a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&leaveId=9bb592e4-fd84-4ca0-a712-3d9b755ee358 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=pending&leavePage=1&regId=e7f2d7c6-ee6c-4b99-8f20-b1cc36ab8b1a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=all&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=pending&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=approved&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Self service | http://localhost:3211/ess?leaveStatus=approved&leavePage=1&regStatus=rejected&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |

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
- Platform-policy item authoring is tracked separately because the current browser surface supports pack header creation/publication/adoption but not item-level CRUD.
- Mathematical payroll correctness was not exhaustively recalculated outside the UI; displayed totals were visually inspected and inventoried.

## Production Readiness

Recommendation: NOT READY - MAJOR FIXES REQUIRED

The app is not fully production-ready until the listed findings and untested high-risk workflows are resolved or manually signed off.

## Artifact Locations

- Application map: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/application-map.json
- Element inventory: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/element-inventory.json
- Defects JSON: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/defects.json
- Screenshots: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/screenshots