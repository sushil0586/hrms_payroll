import { test } from "@playwright/test";

import { expectActualUserReadyPage, type UserJourneyPage } from "../helpers/user-journey-certification";
import { employee, hrAdmin, manager, payrollFinanceManager, tenantAdmin } from "../helpers/staging-auth";

const hrAdminPages: UserJourneyPage[] = [
  { path: "/hr-admin", heading: /HR Control Center|Control Center|Dashboard/i, persona: hrAdmin, requiredText: [/Action queue|Tenant readiness|Operational readiness/i] },
  { path: "/hr-admin/employees", heading: /Employees/i, persona: hrAdmin, requiredText: [/Employee directory|Employee master detail/i] },
  { path: "/hr-admin/organization", heading: /Organization/i, persona: hrAdmin, requiredText: [/Structure catalog|Structural summary|CSV data/i] },
  { path: "/hr-admin/documents", heading: /Documents/i, persona: hrAdmin, requiredText: [/Document|Verification|Requirement/i] },
  { path: "/hr-admin/notification-delivery", heading: /Notification delivery|Delivery/i, persona: hrAdmin, requiredText: [/Channel health|Email|In-App/i] },
  { path: "/hr-admin/notifications-admin", heading: /Notifications|Notification/i, persona: hrAdmin, requiredText: [/Templates|Events|Delivery/i] },
  { path: "/hr-admin/payroll-readiness", heading: /Payroll Readiness/i, persona: hrAdmin, requiredText: [/Payroll cycle|Readiness|What to do next/i] },
  { path: "/hr-admin/payroll-setup", heading: /Payroll Setup/i, persona: hrAdmin, requiredText: [/Calendars|Periods|Pay groups|Assignments/i] },
  { path: "/hr-admin/salary-setup", heading: /Salary Setup/i, persona: hrAdmin, requiredText: [/Components|Structures|Assignments/i] },
  { path: "/hr-admin/payroll-rules", heading: /Payroll Rules/i, persona: hrAdmin, requiredText: [/Rules|Versions|Trace/i] },
  { path: "/hr-admin/payroll-inputs", heading: /Payroll Inputs/i, persona: hrAdmin, requiredText: [/Input control|Snapshots|Next action/i] },
  { path: "/hr-admin/payroll-calculations", heading: /Payroll Calculations|Calculation/i, persona: hrAdmin, requiredText: [/Calculation queue|Attempts|Validation/i] },
  { path: "/hr-admin/payroll-review", heading: /Payroll Review|Review/i, persona: hrAdmin, requiredText: [/Review|Exceptions|Approval/i] },
  { path: "/hr-admin/payroll-outputs", heading: /Payroll Outputs|Outputs/i, persona: hrAdmin, requiredText: [/Output|Publication|Payslip/i] },
  { path: "/hr-admin/payroll-handoff", heading: /Payroll Handoff|Handoff/i, persona: hrAdmin, requiredText: [/Finance|Handoff|Provider/i] },
  { path: "/hr-admin/reports", heading: /Reports/i, persona: hrAdmin, requiredText: [/Report|Export|Operational/i] },
];

const tenantAdminPages: UserJourneyPage[] = [
  { path: "/tenant-admin", heading: /Account Control Center/i, persona: tenantAdmin, requiredText: [/User Management|Access design|Tenant Status/i] },
  { path: "/tenant-admin/users", heading: /Tenant User Management|Users/i, persona: tenantAdmin, requiredText: [/User Directory|Invite member|Role coverage/i] },
  { path: "/tenant-admin/roles", heading: /Roles & Permissions|Access model/i, persona: tenantAdmin, requiredText: [/Search roles|Assignable permissions|Add role/i] },
  { path: "/tenant-admin/plan", heading: /Plan & Billing|Plan/i, persona: tenantAdmin, requiredText: [/Commercial profile|subscription|Change requests/i] },
  { path: "/tenant-admin/setup", heading: /Tenant Setup Guide|Setup/i, persona: tenantAdmin, requiredText: [/Setup areas|Dependency|master setup/i] },
  { path: "/tenant-admin/settings", heading: /Tenant Settings|Settings/i, persona: tenantAdmin, requiredText: [/Tenant account|Governance|Configuration/i] },
  { path: "/tenant-admin/security-readiness", heading: /Security Readiness|Security/i, persona: tenantAdmin, requiredText: [/Security domains|Launch posture|blockers/i] },
  { path: "/tenant-admin/support-access", heading: /Support Access/i, persona: tenantAdmin, requiredText: [/Scoped support|support can access|Scope/i] },
  { path: "/tenant-admin/trust-audit", heading: /Trust Audit|Audit/i, persona: tenantAdmin, requiredText: [/Audit events|Event groups|Download/i] },
];

const employeePages: UserJourneyPage[] = [
  { path: "/ess", heading: /My workspace|Self service|Employee/i, persona: employee, requiredText: [/Leave|Attendance|Documents|Payslip/i] },
  { path: "/ess/documents", heading: /Documents/i, persona: employee, requiredText: [/Document|Verification|Upload/i] },
  { path: "/ess/payslips", heading: /Payslip/i, persona: employee, requiredText: [/Payslip|Source hash|Access/i] },
  { path: "/ess/notifications", heading: /Notifications/i, persona: employee, requiredText: [/Notifications|Inbox|Read/i] },
  { path: "/ess/statutory-declarations", heading: /Statutory/i, persona: employee, requiredText: [/Declaration|Proof|Tax/i] },
];

const managerPages: UserJourneyPage[] = [
  { path: "/mss/approvals", heading: /Manager inbox|Approvals|Leave approvals/i, persona: manager, requiredText: [/Leave|Attendance|Approvals/i] },
  { path: "/mss/notifications", heading: /Notifications/i, persona: manager, requiredText: [/Notifications|Inbox|Read/i] },
];

const financePages: UserJourneyPage[] = [
  { path: "/finance-manager", heading: /Finance control center|Finance/i, persona: payrollFinanceManager, requiredText: [/Close|Payout|Audit|Payments/i] },
];

const suites = [
  { name: "HR Admin", pages: hrAdminPages },
  { name: "Tenant Admin", pages: tenantAdminPages },
  { name: "Employee self-service", pages: employeePages },
  { name: "Manager self-service", pages: managerPages },
  { name: "Finance manager", pages: financePages },
];

for (const suite of suites) {
  test.describe(`User journey phase 2: ${suite.name} workspace usability`, () => {
    for (const target of suite.pages) {
      test(`${target.path} is readable, usable, and stable`, async ({ page }) => {
        await test.step(`Open ${target.path} as actual ${suite.name} user`, async () => {
          await expectActualUserReadyPage(page, target);
        });
      });
    }
  });
}
