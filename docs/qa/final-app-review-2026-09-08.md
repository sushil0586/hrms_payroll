# Final HRMS/Payroll QA Review

Generated: 2026-10-16T05:35:40.677Z
Run ID: 2026-09-08

## Executive Summary

- Total personas tested: 4
- Total unique pages discovered: 272
- Total screen/persona visits: 300
- Screens passed: 291
- Screens with warnings: 0
- Screens failed: 9
- Critical defects: 0
- High defects: 0
- Medium defects: 23
- Low defects: 0
- UX observations: 0
- Accessibility issues: 0
- Console errors: 16
- Failed API/resource requests: 7

## Module-Wise Results

| Module | Pages Tested | Status | Notes |
|---|---:|---|---|
| Attendance | 5 | PASS | No automated findings |
| Employee Self Service | 44 | PASS | No automated findings |
| HR Admin | 27 | PASS | No automated findings |
| Leave | 5 | PASS | No automated findings |
| Manager Self Service | 43 | PASS | No automated findings |
| Payroll | 43 | PASS | No automated findings |
| Platform Admin | 57 | WARNING | 23 finding(s) |
| Tenant Admin | 3 | PASS | No automated findings |
| audit | 1 | PASS | No automated findings |
| documents | 1 | PASS | No automated findings |
| employees | 17 | PASS | No automated findings |
| lifecycle | 1 | PASS | No automated findings |
| notifications admin | 1 | PASS | No automated findings |
| organization | 1 | PASS | No automated findings |
| reports | 22 | PASS | No automated findings |
| workflows | 1 | PASS | No automated findings |

## Screen Coverage

| Module | Persona | Screen | URL | Tested | Functional | Visual | Status |
|---|---|---|---|---|---|---|---|
| Platform Admin | platform-admin | Platform Admin Dashboard | http://127.0.0.1:3100/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Dashboard | http://127.0.0.1:3100/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Permission Catalog | http://127.0.0.1:3100/platform-admin/permissions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Dashboard | http://127.0.0.1:3100/platform-admin?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Dashboard | http://127.0.0.1:3100/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Platform Admin Dashboard | http://127.0.0.1:3100/platform-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Readiness | http://127.0.0.1:3100/platform-admin/onboarding?tenantId=3c248c80-2da8-4c72-a1ac-8c9eb80d4a77 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=136331ed-fd66-4484-a099-50fd59707a09 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Admin Access | http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| Platform Admin | platform-admin | Setup Templates | http://127.0.0.1:3100/platform-admin/policy-packs?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Audit Logs | http://127.0.0.1:3100/platform-admin/audit-logs?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Tenants | http://127.0.0.1:3100/platform-admin/tenants?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Leads | http://127.0.0.1:3100/platform-admin/leads?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Platform Admin | platform-admin | Launch Blueprint | http://127.0.0.1:3100/platform-admin/launch?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f | Yes | Inventory and safe interactions | Screenshot captured | FAIL |
| HR Admin | hr-admin | HR Control Center | http://127.0.0.1:3100/hr-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | HR Control Center | http://127.0.0.1:3100/hr-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Account Control Center | http://127.0.0.1:3100/tenant-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Account Control Center | http://127.0.0.1:3100/tenant-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | My workspace | http://127.0.0.1:3100/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Launch Blockers | http://127.0.0.1:3100/hr-admin/launch-remediation | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| lifecycle | hr-admin | Lifecycle | http://127.0.0.1:3100/hr-admin/lifecycle | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Employee document review | http://127.0.0.1:3100/hr-admin/employee-documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Time to Payroll Control | http://127.0.0.1:3100/hr-admin/time-to-payroll | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance operations | http://127.0.0.1:3100/hr-admin/attendance-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Leave Requests | http://127.0.0.1:3100/hr-admin/leave-requests | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Policy control | http://127.0.0.1:3100/hr-admin/policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Adjustments | http://127.0.0.1:3100/hr-admin/payroll-adjustments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| audit | hr-admin | Audit center | http://127.0.0.1:3100/hr-admin/audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Reports | http://127.0.0.1:3100/hr-admin/reports | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | HR Core Reports | http://127.0.0.1:3100/hr-admin/reports/hr-core | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Attendance Reports | http://127.0.0.1:3100/hr-admin/reports/attendance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Reports | http://127.0.0.1:3100/hr-admin/reports/payroll | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Compliance Reports | http://127.0.0.1:3100/hr-admin/reports/compliance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Export Audit History | http://127.0.0.1:3100/hr-admin/reports/export-audits | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| organization | hr-admin | Organization masters | http://127.0.0.1:3100/hr-admin/organization | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| workflows | hr-admin | Workflow control | http://127.0.0.1:3100/hr-admin/workflows | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| notifications admin | hr-admin | Notifications | http://127.0.0.1:3100/hr-admin/notifications-admin | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Import history | http://127.0.0.1:3100/hr-admin/import-history?page=1&page_size=25 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Operations | http://127.0.0.1:3100/hr-admin/saas-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | hr-admin | Manager approvals | http://127.0.0.1:3100/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Regularizations | http://127.0.0.1:3100/hr-admin/attendance-regularizations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Notification delivery | http://127.0.0.1:3100/hr-admin/notification-delivery | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| documents | hr-admin | Documents control | http://127.0.0.1:3100/hr-admin/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Tenant User Management | http://127.0.0.1:3100/tenant-admin/users | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Tenant Admin | hr-admin | Roles & Permissions | http://127.0.0.1:3100/tenant-admin/roles | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Leave | http://127.0.0.1:3100/ess/leave | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Payslips | http://127.0.0.1:3100/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Attendance | http://127.0.0.1:3100/ess/attendance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Statutory Declarations | http://127.0.0.1:3100/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Notifications | http://127.0.0.1:3100/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Documents | http://127.0.0.1:3100/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Leave | http://127.0.0.1:3100/ess/leave?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | hr-admin | Attendance | http://127.0.0.1:3100/ess/attendance?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Control Plane | http://127.0.0.1:3100/hr-admin/saas-control-plane | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS Resilience | http://127.0.0.1:3100/hr-admin/saas-resilience | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | SaaS SLA Ops | http://127.0.0.1:3100/hr-admin/saas-sla-operations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?create=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?readiness=access_review&page_size=25 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?readiness=structure_review&page_size=25 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?status=all&page=1&page_size=8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?status=active&page=1&page_size=8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?status=on_notice&page=1&page_size=8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?status=inactive&page=1&page_size=8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?status=exited&page=1&page_size=8 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=18218b0b-4364-4d69-9889-2ce6ad1d393f | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=f0e5932c-0d72-437c-bfaa-580207e36264 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=17bec37c-b004-47de-86ee-145da7ad60ad | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=e4105b57-7308-47d6-baa3-4fbf16eec78b | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=be947066-5a86-4641-a1ce-7613c9c7582c | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=efc7e51d-f0f7-4963-8b54-d0e685e5fbc3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=689e27ff-166b-4d89-877f-ef0c818472d1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| employees | hr-admin | Employees | http://127.0.0.1:3100/hr-admin/employees?employeeId=ce546f83-7aa7-4667-a2f8-03f76af27ccd | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Onboarding operations | http://127.0.0.1:3100/hr-admin/onboardings | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Probation reviews | http://127.0.0.1:3100/hr-admin/probation-reviews | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Movement operations | http://127.0.0.1:3100/hr-admin/movements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Exit operations | http://127.0.0.1:3100/hr-admin/exits | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Upload employee document | http://127.0.0.1:3100/hr-admin/employee-documents/new | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Inputs | http://127.0.0.1:3100/hr-admin/payroll-inputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Attendance records | http://127.0.0.1:3100/hr-admin/attendance-records | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Roster templates | http://127.0.0.1:3100/hr-admin/shift-roster-templates | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Adjustments | http://127.0.0.1:3100/hr-admin/payroll-adjustments?tab=actions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Roster Rollout Audit Report | http://127.0.0.1:3100/hr-admin/reports/roster-rollout-audit | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Leave-Attendance Collision Report | http://127.0.0.1:3100/hr-admin/reports/leave-attendance-collisions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Attendance Derivation Exceptions Report | http://127.0.0.1:3100/hr-admin/reports/attendance-derivation-exceptions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Input Exceptions Report | http://127.0.0.1:3100/hr-admin/reports/payroll-input-exceptions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Adjustments Report | http://127.0.0.1:3100/hr-admin/reports/payroll-adjustments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Shift assignments | http://127.0.0.1:3100/hr-admin/employee-shift-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave balances | http://127.0.0.1:3100/hr-admin/leave-balances | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave policies | http://127.0.0.1:3100/hr-admin/leave-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave assignments | http://127.0.0.1:3100/hr-admin/leave-policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Shifts | http://127.0.0.1:3100/hr-admin/shifts | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Holiday calendars | http://127.0.0.1:3100/hr-admin/holiday-calendars | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance policies | http://127.0.0.1:3100/hr-admin/attendance-policies | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Policy assignments | http://127.0.0.1:3100/hr-admin/policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Leave | hr-admin | Leave types | http://127.0.0.1:3100/hr-admin/leave-types | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Attendance | hr-admin | Attendance assignments | http://127.0.0.1:3100/hr-admin/attendance-policy-assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Review | http://127.0.0.1:3100/hr-admin/payroll-review | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Close Readiness Report | http://127.0.0.1:3100/hr-admin/reports/payroll-close-readiness | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Calculations | http://127.0.0.1:3100/hr-admin/payroll-calculations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Outputs | http://127.0.0.1:3100/hr-admin/payroll-outputs | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Handoff | http://127.0.0.1:3100/hr-admin/payroll-handoff | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness?tab=issues | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness?tab=employees&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness?tab=setup | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness?tab=evidence | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Readiness | http://127.0.0.1:3100/hr-admin/payroll-readiness?tab=issues&status=blocked&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup?tab=actions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup?tab=overview | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup?tab=calendars | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup?tab=pay-groups | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Setup | http://127.0.0.1:3100/hr-admin/payroll-setup?tab=assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup?tab=actions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup?tab=overview | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup?tab=components | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup?tab=structures | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| HR Admin | hr-admin | Salary Setup | http://127.0.0.1:3100/hr-admin/salary-setup?tab=assignments | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules?tab=actions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules?tab=overview | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules?tab=rules | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules?tab=versions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Rules | http://127.0.0.1:3100/hr-admin/payroll-rules?tab=trace | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Document Compliance Report | http://127.0.0.1:3100/hr-admin/reports/document-compliance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory?tab=overview | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory?tab=declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory?tab=compliance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory?tab=catalog | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Statutory | http://127.0.0.1:3100/hr-admin/payroll-statutory?tab=actions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=overview&connectionId=a2bcef50-df54-47fc-b25e-7ccc0be174d3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=connections&connectionId=a2bcef50-df54-47fc-b25e-7ccc0be174d3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=mapping&connectionId=a2bcef50-df54-47fc-b25e-7ccc0be174d3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=delivery&connectionId=a2bcef50-df54-47fc-b25e-7ccc0be174d3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=registry&connectionId=a2bcef50-df54-47fc-b25e-7ccc0be174d3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=overview&connectionId=d93eb919-b851-4aa8-9779-bf2b30b60100 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Providers | http://127.0.0.1:3100/hr-admin/payroll-providers?tab=overview&connectionId=3c08c010-be4f-4936-9cf4-63d8d2ea7dd4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Settlements | http://127.0.0.1:3100/hr-admin/payroll-settlements | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Adjustments | http://127.0.0.1:3100/hr-admin/payroll-adjustments?tab=overview | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Adjustments | http://127.0.0.1:3100/hr-admin/payroll-adjustments?tab=register | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Payroll | hr-admin | Payroll Adjustments | http://127.0.0.1:3100/hr-admin/payroll-adjustments?tab=detail | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Employee Master Report | http://127.0.0.1:3100/hr-admin/reports/workforce | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Lifecycle Queue Report | http://127.0.0.1:3100/hr-admin/reports/lifecycle-queue | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Lifecycle Aging and SLA Report | http://127.0.0.1:3100/hr-admin/reports/lifecycle-aging | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Daily Attendance Register | http://127.0.0.1:3100/hr-admin/reports/attendance-register | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Leave Balance Report | http://127.0.0.1:3100/hr-admin/reports/leave-balance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Attendance Exceptions SLA Report | http://127.0.0.1:3100/hr-admin/reports/attendance-exceptions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Register Report | http://127.0.0.1:3100/hr-admin/reports/payroll-register | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Salary Variance Report | http://127.0.0.1:3100/hr-admin/reports/salary-variance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| reports | hr-admin | Payroll Review Exceptions Report | http://127.0.0.1:3100/hr-admin/reports/payroll-review-exceptions | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | My workspace | http://127.0.0.1:3100/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager dashboard | http://127.0.0.1:3100/mss | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager notifications | http://127.0.0.1:3100/mss/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3100/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=history | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=05aff454-30c1-4a55-85eb-4989161d8ba4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=784b5465-6f32-4eee-aa7a-f4fa4d82bc8a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=434e594a-4bc3-4bd6-a2c5-2eb2fe70b4a3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=c8b8a728-08dd-4300-be40-893fe2bbf3ed | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=0882d0d9-3837-4a4b-a2b4-9a3ebd390ea1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=182 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Leave | http://127.0.0.1:3100/ess/leave | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Payslips | http://127.0.0.1:3100/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Attendance | http://127.0.0.1:3100/ess/attendance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Leave | http://127.0.0.1:3100/ess/leave?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Attendance | http://127.0.0.1:3100/ess/attendance?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Documents | http://127.0.0.1:3100/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Statutory Declarations | http://127.0.0.1:3100/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager notifications | http://127.0.0.1:3100/mss/notifications?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager notifications | http://127.0.0.1:3100/mss/notifications?page=113 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3100/ess/notifications?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | manager | Notifications | http://127.0.0.1:3100/ess/notifications?page=22 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance&leavePage=1&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=history&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1&leaveId=05aff454-30c1-4a55-85eb-4989161d8ba4 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1&leaveId=784b5465-6f32-4eee-aa7a-f4fa4d82bc8a | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1&leaveId=434e594a-4bc3-4bd6-a2c5-2eb2fe70b4a3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1&leaveId=c8b8a728-08dd-4300-be40-893fe2bbf3ed | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=1&leaveId=0882d0d9-3837-4a4b-a2b4-9a3ebd390ea1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&regPage=1&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=history&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance&regPage=1&regId=b5f73aa6-6576-43b2-89f4-0a58f99b8670 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=05aff454-30c1-4a55-85eb-4989161d8ba4&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=784b5465-6f32-4eee-aa7a-f4fa4d82bc8a&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=434e594a-4bc3-4bd6-a2c5-2eb2fe70b4a3&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=c8b8a728-08dd-4300-be40-893fe2bbf3ed&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leaveId=0882d0d9-3837-4a4b-a2b4-9a3ebd390ea1&leavePage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance&leavePage=2&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=history&leavePage=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2&leaveId=8854269d-a1d2-4308-b660-88d1268a3c11 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2&leaveId=dcfd97df-0c3e-4c9e-9e7a-ec8c17e2ea96 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2&leaveId=355816f6-6c62-40cb-8de9-1a35d3b019b5 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2&leaveId=34a077ba-9dff-4060-83b5-2334ecfa507e | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=2&leaveId=0dde9383-cb18-4561-803a-01db43c4be51 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=attendance&leavePage=182&regPage=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=history&leavePage=182 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Manager Self Service | manager | Manager approvals | http://127.0.0.1:3100/mss/approvals?queue=leave&leavePage=182&leaveId=01b50caf-eaeb-4003-aacd-debfdf7fb2e6 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | My workspace | http://127.0.0.1:3100/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | My workspace | http://127.0.0.1:3100/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | http://127.0.0.1:3100/ess/statutory-declarations | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3100/ess/notifications | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Documents | http://127.0.0.1:3100/ess/documents | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=all&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=pending&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=partially_approved&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=approved&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=rejected&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=withdrawn&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=cancelled&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page=1&page_size=5&payslipId=a0ae5a5c-b396-40f1-9304-baaefe41fa16 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page=1&page_size=5&payslipId=a4253dab-6074-4b29-83fa-00335c81a199 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page=1&page_size=5&payslipId=770518cd-d5ee-4add-89f8-67a73fba47c0 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page=1&page_size=5&payslipId=8140684c-1d93-470f-bee3-3d8d02a7abb7 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page=1&page_size=5&payslipId=bf33fc4d-8857-4c6c-9b38-32d44f0ddc39 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page_size=5&payslipId=a0ae5a5c-b396-40f1-9304-baaefe41fa16&page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Payslips | http://127.0.0.1:3100/ess/payslips?page_size=5&payslipId=a0ae5a5c-b396-40f1-9304-baaefe41fa16&page=9 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?status=all&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?status=pending&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?status=approved&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?status=rejected&page=1 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Attendance | http://127.0.0.1:3100/ess/attendance?page=3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | http://127.0.0.1:3100/ess/statutory-declarations?declarationId=3f2af8ca-08dc-4bec-9bd1-b9b1bf656279&page_size=10 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Statutory Declarations | http://127.0.0.1:3100/ess/statutory-declarations?declarationId=172e7270-5ee4-4f4f-8cb8-80a41631fce2&page_size=10 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | My workspace | http://127.0.0.1:3100/ess | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3100/ess/notifications?page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Notifications | http://127.0.0.1:3100/ess/notifications?page=26 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=all&page=2 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?status=all&page=3 | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=all | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=pending | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=partially_approved | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=approved | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=rejected | Yes | Inventory and safe interactions | Screenshot captured | PASS |
| Employee Self Service | employee | Leave | http://127.0.0.1:3100/ess/leave?page=1&status=withdrawn | Yes | Inventory and safe interactions | Screenshot captured | PASS |

## Defect Report

| Severity | Module | Screen | Issue | Screenshot | Recommendation |
|---|---|---|---|---|---|
| MEDIUM | Platform Admin | Launch Readiness | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/006-platform-admin-onboarding.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Readiness | Console error logged: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/platform-..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/platform-..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="platform-a...">
                <SegmentTrieNode>
                <PlatformAdminLayout>
                  <WorkspaceChrome footerDescription="Customer o..." navGroups={[...]} navItems={[...]} ...>
                    <div className="app-shell ...">
                      <aside>
                      <div className="app-main a...">
                        <header className="app-topbar...">
                          <div>
                          <WorkspaceSearch groups={[...]} quickLinks={[...]} router={{...}} searchDestinations={[...]} ...>
                            <div className="workspace-..." onFocus={function onFocus}>
                              <label className="search-chi..." aria-label="Workspace ...">
                                <span>
                                <input
                                  aria-label="Workspace search"
                                  autoComplete="off"
                                  className="workspace-search__input"
                                  onChange={function onChange}
                                  onKeyDown={function onKeyDown}
                                  placeholder="Search tenants, leads, templates, and launch status"
                                  ref={{current:null}}
                                  type="search"
                                  value=""
-                                 style={{caret-color:"transparent"}}
                                >
                                ...
                          ...
                        ...
                          <section className="section su...">
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleTenantPatch}>
                                <div>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="name"
                                    required={true}
                                    defaultValue="Acme India"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="legal_name"
                                    defaultValue="Acme India Pvt Ltd"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="primary_email"
                                    type="email"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_phone"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_domain"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="timezone"
                                    defaultValue="Asia/Kolkata"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="country_code"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_sandbox"
                                    type="checkbox"
                                    defaultChecked={false}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." onSubmit={function handlePolicyPackItemCreate}>
                                <div>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="item_key"
                                    required={true}
                                    placeholder="casual-leave-type"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="name"
                                    placeholder="Casual Leave"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="sort_order"
                                    defaultValue="10"
                                    min={0}
                                    type="number"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="dependency_keys"
                                    placeholder="casual-leave-type, general-shift"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <GuidedPolicyItemFields itemType="leave_type">
                                  <div className="platform-g...">
                                    <div>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_code"
                                        required={true}
                                        defaultValue=""
                                        placeholder="casual-leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_name"
                                        required={true}
                                        defaultValue=""
                                        placeholder="Casual Leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label>
                                    <label>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_requires_attachment"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_allow_negative_balance"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_is_approval_required"
                                        type="checkbox"
                                        defaultChecked={true}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <details className="platform-a...">
                                      <summary>
                                      <label className="form-field...">
                                        <span>
                                        <textarea
                                          className="input-control"
                                          name="payload"
                                          defaultValue=""
                                          rows={8}
                                          placeholder={"{\n  \"code\": \"casual-leave\",\n  \"name\": \"Casual Leave\..."}
-                                         style={{caret-color:"transparent"}}
                                        >
                                        ...
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_required"
                                    type="checkbox"
                                    defaultChecked={true}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleOnboardingPatch}>
                                <div>
                                <label>
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="country_context"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="industry_context"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="internal_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="customer_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
            ...
 | platform-admin/006-platform-admin-onboarding.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/015-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/030-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/036-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/042-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/048-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/054-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Console error logged: Failed to load resource: net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/css/app/layout.css?v=1792128065382 net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/main-app.js?v=1792128065382 net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app-pages-internals.js net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/error.js net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/webpack.js?v=1792128065382 net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/layout.js net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Admin Access | Failed network request: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/admins/page.js net::ERR_CONNECTION_REFUSED | platform-admin/055-platform-admin-admins.png | Check the route proxy, backend endpoint, auth cookie propagation, and resource path. |
| MEDIUM | Platform Admin | Launch Blueprint | Console error logged: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme | platform-admin/060-platform-admin-launch.png | Remove the runtime error source or downgrade intentional diagnostics away from console.error. |

## Detailed Defects

### QA-001: Console error logged

- Module: Platform Admin
- Screen: Launch Readiness
- URL: http://127.0.0.1:3100/platform-admin/onboarding
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/onboarding.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/006-platform-admin-onboarding.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-002: Console error logged

- Module: Platform Admin
- Screen: Launch Readiness
- URL: http://127.0.0.1:3100/platform-admin/onboarding
- Severity: MEDIUM
- Category: Browser Console
- Description: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/platform-..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/platform-..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="platform-a...">
                <SegmentTrieNode>
                <PlatformAdminLayout>
                  <WorkspaceChrome footerDescription="Customer o..." navGroups={[...]} navItems={[...]} ...>
                    <div className="app-shell ...">
                      <aside>
                      <div className="app-main a...">
                        <header className="app-topbar...">
                          <div>
                          <WorkspaceSearch groups={[...]} quickLinks={[...]} router={{...}} searchDestinations={[...]} ...>
                            <div className="workspace-..." onFocus={function onFocus}>
                              <label className="search-chi..." aria-label="Workspace ...">
                                <span>
                                <input
                                  aria-label="Workspace search"
                                  autoComplete="off"
                                  className="workspace-search__input"
                                  onChange={function onChange}
                                  onKeyDown={function onKeyDown}
                                  placeholder="Search tenants, leads, templates, and launch status"
                                  ref={{current:null}}
                                  type="search"
                                  value=""
-                                 style={{caret-color:"transparent"}}
                                >
                                ...
                          ...
                        ...
                          <section className="section su...">
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleTenantPatch}>
                                <div>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="name"
                                    required={true}
                                    defaultValue="Acme India"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="legal_name"
                                    defaultValue="Acme India Pvt Ltd"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="primary_email"
                                    type="email"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_phone"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_domain"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="timezone"
                                    defaultValue="Asia/Kolkata"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="country_code"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_sandbox"
                                    type="checkbox"
                                    defaultChecked={false}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." onSubmit={function handlePolicyPackItemCreate}>
                                <div>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="item_key"
                                    required={true}
                                    placeholder="casual-leave-type"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="name"
                                    placeholder="Casual Leave"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="sort_order"
                                    defaultValue="10"
                                    min={0}
                                    type="number"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="dependency_keys"
                                    placeholder="casual-leave-type, general-shift"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <GuidedPolicyItemFields itemType="leave_type">
                                  <div className="platform-g...">
                                    <div>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_code"
                                        required={true}
                                        defaultValue=""
                                        placeholder="casual-leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_name"
                                        required={true}
                                        defaultValue=""
                                        placeholder="Casual Leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label>
                                    <label>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_requires_attachment"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_allow_negative_balance"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_is_approval_required"
                                        type="checkbox"
                                        defaultChecked={true}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <details className="platform-a...">
                                      <summary>
                                      <label className="form-field...">
                                        <span>
                                        <textarea
                                          className="input-control"
                                          name="payload"
                                          defaultValue=""
                                          rows={8}
                                          placeholder={"{\n  \"code\": \"casual-leave\",\n  \"name\": \"Casual Leave\..."}
-                                         style={{caret-color:"transparent"}}
                                        >
                                        ...
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_required"
                                    type="checkbox"
                                    defaultChecked={true}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleOnboardingPatch}>
                                <div>
                                <label>
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="country_context"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="industry_context"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="internal_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="customer_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
            ...

- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/onboarding.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/platform-..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/platform-..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="platform-a...">
                <SegmentTrieNode>
                <PlatformAdminLayout>
                  <WorkspaceChrome footerDescription="Customer o..." navGroups={[...]} navItems={[...]} ...>
                    <div className="app-shell ...">
                      <aside>
                      <div className="app-main a...">
                        <header className="app-topbar...">
                          <div>
                          <WorkspaceSearch groups={[...]} quickLinks={[...]} router={{...}} searchDestinations={[...]} ...>
                            <div className="workspace-..." onFocus={function onFocus}>
                              <label className="search-chi..." aria-label="Workspace ...">
                                <span>
                                <input
                                  aria-label="Workspace search"
                                  autoComplete="off"
                                  className="workspace-search__input"
                                  onChange={function onChange}
                                  onKeyDown={function onKeyDown}
                                  placeholder="Search tenants, leads, templates, and launch status"
                                  ref={{current:null}}
                                  type="search"
                                  value=""
-                                 style={{caret-color:"transparent"}}
                                >
                                ...
                          ...
                        ...
                          <section className="section su...">
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleTenantPatch}>
                                <div>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="name"
                                    required={true}
                                    defaultValue="Acme India"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="legal_name"
                                    defaultValue="Acme India Pvt Ltd"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="primary_email"
                                    type="email"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_phone"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_domain"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="timezone"
                                    defaultValue="Asia/Kolkata"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="country_code"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_sandbox"
                                    type="checkbox"
                                    defaultChecked={false}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." onSubmit={function handlePolicyPackItemCreate}>
                                <div>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="item_key"
                                    required={true}
                                    placeholder="casual-leave-type"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="name"
                                    placeholder="Casual Leave"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="sort_order"
                                    defaultValue="10"
                                    min={0}
                                    type="number"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="dependency_keys"
                                    placeholder="casual-leave-type, general-shift"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <GuidedPolicyItemFields itemType="leave_type">
                                  <div className="platform-g...">
                                    <div>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_code"
                                        required={true}
                                        defaultValue=""
                                        placeholder="casual-leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_name"
                                        required={true}
                                        defaultValue=""
                                        placeholder="Casual Leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label>
                                    <label>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_requires_attachment"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_allow_negative_balance"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_is_approval_required"
                                        type="checkbox"
                                        defaultChecked={true}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <details className="platform-a...">
                                      <summary>
                                      <label className="form-field...">
                                        <span>
                                        <textarea
                                          className="input-control"
                                          name="payload"
                                          defaultValue=""
                                          rows={8}
                                          placeholder={"{\n  \"code\": \"casual-leave\",\n  \"name\": \"Casual Leave\..."}
-                                         style={{caret-color:"transparent"}}
                                        >
                                        ...
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_required"
                                    type="checkbox"
                                    defaultChecked={true}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleOnboardingPatch}>
                                <div>
                                <label>
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="country_context"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="industry_context"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="internal_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="customer_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
            ...

- Screenshot: platform-admin/006-platform-admin-onboarding.png
- Console Error: A tree hydrated but some attributes of the server rendered HTML didn't match the client properties. This won't be patched up. This can happen if a SSR-ed Client Component used:

- A server/client branch `if (typeof window !== 'undefined')`.
- Variable input such as `Date.now()` or `Math.random()` which changes each time it's called.
- Date formatting in a user's locale which doesn't match the server.
- External changing data without sending a snapshot of it along with the HTML.
- Invalid HTML tag nesting.

It can also happen if the client has a browser extension installed which messes with the HTML before React loaded.

%s%s https://react.dev/link/hydration-mismatch

  ...
    <HTTPAccessFallbackBoundary notFound={<SegmentViewNode>} forbidden={undefined} unauthorized={undefined}>
      <HTTPAccessFallbackErrorBoundary pathname="/platform-..." notFound={<SegmentViewNode>} forbidden={undefined} ...>
        <RedirectBoundary>
          <RedirectErrorBoundary router={{...}}>
            <InnerLayoutRouter url="/platform-..." tree={[...]} cacheNode={{lazyData:null, ...}} segmentPath={[...]}>
              <SegmentViewNode type="layout" pagePath="platform-a...">
                <SegmentTrieNode>
                <PlatformAdminLayout>
                  <WorkspaceChrome footerDescription="Customer o..." navGroups={[...]} navItems={[...]} ...>
                    <div className="app-shell ...">
                      <aside>
                      <div className="app-main a...">
                        <header className="app-topbar...">
                          <div>
                          <WorkspaceSearch groups={[...]} quickLinks={[...]} router={{...}} searchDestinations={[...]} ...>
                            <div className="workspace-..." onFocus={function onFocus}>
                              <label className="search-chi..." aria-label="Workspace ...">
                                <span>
                                <input
                                  aria-label="Workspace search"
                                  autoComplete="off"
                                  className="workspace-search__input"
                                  onChange={function onChange}
                                  onKeyDown={function onKeyDown}
                                  placeholder="Search tenants, leads, templates, and launch status"
                                  ref={{current:null}}
                                  type="search"
                                  value=""
-                                 style={{caret-color:"transparent"}}
                                >
                                ...
                          ...
                        ...
                          <section className="section su...">
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleTenantPatch}>
                                <div>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="name"
                                    required={true}
                                    defaultValue="Acme India"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="legal_name"
                                    defaultValue="Acme India Pvt Ltd"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="primary_email"
                                    type="email"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_phone"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="primary_domain"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="timezone"
                                    defaultValue="Asia/Kolkata"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="country_code"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_sandbox"
                                    type="checkbox"
                                    defaultChecked={false}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." onSubmit={function handlePolicyPackItemCreate}>
                                <div>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="item_key"
                                    required={true}
                                    placeholder="casual-leave-type"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="name"
                                    placeholder="Casual Leave"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="sort_order"
                                    defaultValue="10"
                                    min={0}
                                    type="number"
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    className="input-control"
                                    name="dependency_keys"
                                    placeholder="casual-leave-type, general-shift"
-                                   style={{caret-color:"transparent"}}
                                  >
                                  ...
                                <GuidedPolicyItemFields itemType="leave_type">
                                  <div className="platform-g...">
                                    <div>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_code"
                                        required={true}
                                        defaultValue=""
                                        placeholder="casual-leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        className="input-control"
                                        name="payload_name"
                                        required={true}
                                        defaultValue=""
                                        placeholder="Casual Leave"
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label>
                                    <label>
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_requires_attachment"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_allow_negative_balance"
                                        type="checkbox"
                                        defaultChecked={false}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <label className="form-field">
                                      <span>
                                      <input
                                        name="payload_is_approval_required"
                                        type="checkbox"
                                        defaultChecked={true}
-                                       style={{caret-color:"transparent"}}
                                      >
                                    <details className="platform-a...">
                                      <summary>
                                      <label className="form-field...">
                                        <span>
                                        <textarea
                                          className="input-control"
                                          name="payload"
                                          defaultValue=""
                                          rows={8}
                                          placeholder={"{\n  \"code\": \"casual-leave\",\n  \"name\": \"Casual Leave\..."}
-                                         style={{caret-color:"transparent"}}
                                        >
                                        ...
                                <label className="form-field...">
                                  <span>
                                  <input
                                    name="is_required"
                                    type="checkbox"
                                    defaultChecked={true}
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
                            <article className="record-car...">
                              <div>
                              <form className="form-grid ..." noValidate={true} onSubmit={function handleOnboardingPatch}>
                                <div>
                                <label>
                                <label>
                                <label>
                                <label>
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="country_context"
                                    defaultValue="IN"
                                    maxLength={2}
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field">
                                  <span>
                                  <input
                                    aria-invalid={false}
                                    className="input-control"
                                    name="industry_context"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="internal_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                <label className="form-field...">
                                  <span>
                                  <textarea
                                    className="input-control"
                                    name="customer_handoff_notes"
                                    defaultValue=""
-                                   style={{caret-color:"transparent"}}
                                  >
                                ...
            ...

- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-003: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=f72fca51-c2cc-4e3a-af38-8ed5739fc351.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/015-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-004: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=136331ed-fd66-4484-a099-50fd59707a09
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=136331ed-fd66-4484-a099-50fd59707a09.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/030-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-005: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=e14c1e1b-104e-41b1-9978-f92d7611c8b7.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/036-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-006: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=3881fb6f-6e3e-4194-ac70-7433696a3de2.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/042-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-007: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=02eff182-1b76-4419-bf5e-c208bc8a6cdd.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/048-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-008: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/054-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-009: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-010: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-011: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-012: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-013: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-014: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-015: Console error logged

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Browser Console
- Description: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: Failed to load resource: net::ERR_CONNECTION_REFUSED
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

### QA-016: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/css/app/layout.css?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/css/app/layout.css?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/css/app/layout.css?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-017: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/main-app.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/main-app.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/main-app.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-018: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app-pages-internals.js net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app-pages-internals.js net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app-pages-internals.js net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-019: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/error.js net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/error.js net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/error.js net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-020: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/webpack.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/webpack.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/webpack.js?v=1792128065382 net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-021: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/layout.js net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/layout.js net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/layout.js net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-022: Failed network request

- Module: Platform Admin
- Screen: Admin Access
- URL: http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe
- Severity: MEDIUM
- Category: Network
- Description: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/admins/page.js net::ERR_CONNECTION_REFUSED
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/admins?tenantId=830b5018-3b27-4ad0-8953-1ea369f6fefe. / Review captured network calls.
- Expected Result: All page resources and API calls should complete successfully.
- Actual Result: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/admins/page.js net::ERR_CONNECTION_REFUSED
- Screenshot: platform-admin/055-platform-admin-admins.png
- Console Error: None captured
- Failed API: FAILED GET http://127.0.0.1:3100/_next/static/chunks/app/platform-admin/admins/page.js net::ERR_CONNECTION_REFUSED
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Check the route proxy, backend endpoint, auth cookie propagation, and resource path.

### QA-023: Console error logged

- Module: Platform Admin
- Screen: Launch Blueprint
- URL: http://127.0.0.1:3100/platform-admin/launch?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f
- Severity: MEDIUM
- Category: Browser Console
- Description: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Steps to Reproduce: Login as platform-admin. / Open http://127.0.0.1:3100/platform-admin/launch?tenantId=d5fdd80e-f1fd-404f-a269-99da65c5e91f.
- Expected Result: No console.error output should be emitted during normal use.
- Actual Result: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Screenshot: platform-admin/060-platform-admin-launch.png
- Console Error: Encountered two children with the same key, `%s`. Keys should be unique so that components maintain their identity across updates. Non-unique keys may cause children to be duplicated and/or omitted — the behavior is unsupported and could change in a future version. india-standard-sme
- Failed API: None captured
- Browser: Chromium
- Viewport: 1366x768 crawl plus screenshot
- Suggested Fix: Remove the runtime error source or downgrade intentional diagnostics away from console.error.

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

Recommendation: READY WITH MINOR FIXES

The crawler did not detect blocking defects, failed resources, console errors, or accessibility label issues in the discovered screens.

## Artifact Locations

- Application map: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/application-map.json
- Element inventory: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/element-inventory.json
- Defects JSON: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/defects.json
- Screenshots: /Users/ansh/Documents/hrms-payroll-saas/web/qa-artifacts/final-app-review-2026-09-08/screenshots
