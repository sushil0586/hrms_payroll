import { test } from "@playwright/test";

import { suppressBrowserTestNoise } from "../helpers/assertions";
import {
  employee,
  hrAdmin,
  loginIfRequired,
  manager,
  payrollFinanceManager,
  platformAdmin,
  tenantAdmin,
} from "../helpers/staging-auth";

const screenshotRoot = "../docs-site/docs/assets/screenshots";

const captures = [
  {
    route: "/hr-admin",
    file: `${screenshotRoot}/hr-admin/dashboard-overview.png`,
    heading: /HR Control Center/i,
  },
  {
    route: "/hr-admin/employees",
    file: `${screenshotRoot}/hr-admin/employees-directory-detail.png`,
    heading: /Employees/i,
  },
  {
    route: "/hr-admin/documents",
    file: `${screenshotRoot}/hr-admin/documents-dashboard.png`,
    heading: /Documents control/i,
  },
  {
    route: "/hr-admin/notifications?status=failed",
    file: `${screenshotRoot}/hr-admin/notifications-queue.png`,
    heading: /Notification queue/i,
  },
  {
    route: "/hr-admin/notification-delivery",
    file: `${screenshotRoot}/hr-admin/notification-delivery-health.png`,
    heading: /Notification delivery/i,
  },
  {
    route: "/hr-admin/lifecycle",
    file: `${screenshotRoot}/hr-admin/lifecycle-overview.png`,
    heading: /Lifecycle/i,
  },
  {
    route: "/hr-admin/organization",
    file: `${screenshotRoot}/hr-admin/organization-guided-setup.png`,
    heading: /Organization/i,
  },
  {
    route: "/hr-admin/attendance-operations",
    file: `${screenshotRoot}/hr-admin/attendance-exceptions.png`,
    heading: /Attendance/i,
  },
  {
    route: "/hr-admin/leave-balances",
    file: `${screenshotRoot}/hr-admin/leave-balances.png`,
    heading: /Leave/i,
  },
  {
    route: "/hr-admin/policies",
    file: `${screenshotRoot}/hr-admin/policies-overview.png`,
    heading: /Policy control/i,
  },
  {
    route: "/hr-admin/workflows",
    file: `${screenshotRoot}/hr-admin/workflows-overview.png`,
    heading: /Workflow/i,
  },
  {
    route: "/hr-admin/reports",
    file: `${screenshotRoot}/hr-admin/reports-catalog.png`,
    heading: /Reports/i,
  },
  {
    route: "/hr-admin/audit",
    file: `${screenshotRoot}/hr-admin/audit-log-detail.png`,
    heading: /Audit/i,
  },
  {
    route: "/hr-admin/launch-remediation",
    file: `${screenshotRoot}/hr-admin/launch-remediation.png`,
    heading: /Launch/i,
  },
  {
    route: "/hr-admin/payroll-readiness",
    file: `${screenshotRoot}/payroll/payroll-control-summary.png`,
    heading: /Payroll Readiness/i,
  },
  {
    route: "/hr-admin/payroll-setup",
    file: `${screenshotRoot}/payroll/payroll-setup-calendars.png`,
    heading: /Payroll Setup/i,
  },
  {
    route: "/hr-admin/salary-setup",
    file: `${screenshotRoot}/payroll/salary-setup-components.png`,
    heading: /Salary Setup/i,
  },
  {
    route: "/hr-admin/payroll-rules?tab=trace",
    file: `${screenshotRoot}/payroll/payroll-rules-trace.png`,
    heading: /Payroll Rules/i,
  },
  {
    route: "/hr-admin/payroll-inputs",
    file: `${screenshotRoot}/payroll/payroll-inputs-snapshot-trace.png`,
    heading: /Payroll Inputs/i,
  },
  {
    route: "/hr-admin/payroll-calculations",
    file: `${screenshotRoot}/payroll/payroll-calculations-line-trace.png`,
    heading: /Payroll Calculations/i,
  },
  {
    route: "/hr-admin/payroll-review",
    file: `${screenshotRoot}/payroll/payroll-review-exceptions.png`,
    heading: /Payroll Review/i,
  },
  {
    route: "/hr-admin/payroll-outputs",
    file: `${screenshotRoot}/payroll/payroll-outputs-artifacts.png`,
    heading: /Payroll Outputs/i,
  },
  {
    route: "/hr-admin/payroll-handoff",
    file: `${screenshotRoot}/payroll/payroll-handoff-provider-jobs.png`,
    heading: /Payroll Handoff/i,
  },
  {
    route: "/hr-admin/payroll-providers",
    file: `${screenshotRoot}/payroll/payroll-providers-certification.png`,
    heading: /Payroll Providers/i,
  },
  {
    route: "/hr-admin/payroll-adjustments",
    file: `${screenshotRoot}/payroll/adjustments-settlements-workflow.png`,
    heading: /Adjustments/i,
  },
  {
    route: "/hr-admin/payroll-statutory",
    file: `${screenshotRoot}/payroll/statutory-payroll-setup.png`,
    heading: /Statutory/i,
  },
];

test.describe("documentation screenshots", () => {
  for (const capture of captures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, hrAdmin, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});

const tenantCaptures = [
  {
    route: "/tenant-admin",
    file: `${screenshotRoot}/tenant-admin/dashboard.png`,
    heading: /Account Control Center|Tenant Admin|Dashboard/i,
  },
  {
    route: "/tenant-admin/users",
    file: `${screenshotRoot}/tenant-admin/users.png`,
    heading: /Users|User management/i,
  },
  {
    route: "/tenant-admin/roles",
    file: `${screenshotRoot}/tenant-admin/roles.png`,
    heading: /Access model|Roles/i,
  },
  {
    route: "/tenant-admin/plan",
    file: `${screenshotRoot}/tenant-admin/plan.png`,
    heading: /Plan|Subscription/i,
  },
  {
    route: "/tenant-admin/setup",
    file: `${screenshotRoot}/tenant-admin/setup-guide.png`,
    heading: /Setup Guide|Launch steps/i,
  },
  {
    route: "/tenant-admin/support-access",
    file: `${screenshotRoot}/tenant-admin/support-access.png`,
    heading: /Support Access|Assisted operations/i,
  },
  {
    route: "/tenant-admin/trust-audit",
    file: `${screenshotRoot}/tenant-admin/trust-audit.png`,
    heading: /Trust Audit|Evidence review/i,
  },
  {
    route: "/tenant-admin/settings",
    file: `${screenshotRoot}/tenant-admin/settings.png`,
    heading: /Settings|Account controls/i,
  },
  {
    route: "/tenant-admin/security-readiness",
    file: `${screenshotRoot}/tenant-admin/security-readiness.png`,
    heading: /Security|Enterprise readiness/i,
  },
];

test.describe("tenant admin documentation screenshots", () => {
  for (const capture of tenantCaptures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, tenantAdmin, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});

const platformCaptures = [
  {
    route: "/platform-admin",
    file: `${screenshotRoot}/platform-admin/dashboard.png`,
    heading: /Platform Admin Dashboard/i,
  },
  {
    route: "/platform-admin/leads",
    file: `${screenshotRoot}/platform-admin/leads.png`,
    heading: /Leads/i,
  },
  {
    route: "/platform-admin/tenants",
    file: `${screenshotRoot}/platform-admin/tenants.png`,
    heading: /Tenants/i,
  },
  {
    route: "/platform-admin/onboarding",
    file: `${screenshotRoot}/platform-admin/launch-readiness.png`,
    heading: /Launch Readiness/i,
  },
  {
    route: "/platform-admin/admins",
    file: `${screenshotRoot}/platform-admin/admin-access.png`,
    heading: /Admin Access/i,
  },
  {
    route: "/platform-admin/policy-packs",
    file: `${screenshotRoot}/platform-admin/setup-templates.png`,
    heading: /Setup Templates/i,
  },
  {
    route: "/platform-admin/permissions",
    file: `${screenshotRoot}/platform-admin/permissions.png`,
    heading: /Permission Catalog/i,
  },
  {
    route: "/platform-admin/audit-logs",
    file: `${screenshotRoot}/platform-admin/audit-logs.png`,
    heading: /Audit Logs/i,
  },
];

test.describe("platform admin documentation screenshots", () => {
  for (const capture of platformCaptures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, platformAdmin, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});

const essCaptures = [
  {
    route: "/ess",
    file: `${screenshotRoot}/ess/overview.png`,
    heading: /Self service/i,
  },
  {
    route: "/ess/payslips",
    file: `${screenshotRoot}/ess/payslips.png`,
    heading: /Payslips/i,
  },
  {
    route: "/ess/documents",
    file: `${screenshotRoot}/ess/documents.png`,
    heading: /Documents/i,
  },
  {
    route: "/ess/statutory-declarations",
    file: `${screenshotRoot}/ess/statutory-declarations.png`,
    heading: /Statutory Declarations/i,
  },
  {
    route: "/ess/notifications",
    file: `${screenshotRoot}/ess/notifications.png`,
    heading: /Notifications|Notification/i,
  },
];

test.describe("ess documentation screenshots", () => {
  for (const capture of essCaptures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, employee, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});

const mssCaptures = [
  {
    route: "/mss",
    file: `${screenshotRoot}/mss/control-center.png`,
    heading: /Manager control center/i,
  },
  {
    route: "/mss/approvals",
    file: `${screenshotRoot}/mss/approvals.png`,
    heading: /Manager inbox/i,
  },
  {
    route: "/mss/notifications",
    file: `${screenshotRoot}/mss/notifications.png`,
    heading: /Notifications|Notification/i,
  },
];

test.describe("mss documentation screenshots", () => {
  for (const capture of mssCaptures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, manager, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});

const financeCaptures = [
  {
    route: "/finance-manager",
    file: `${screenshotRoot}/finance-manager/control-center.png`,
    heading: /Finance control center/i,
  },
];

test.describe("finance manager documentation screenshots", () => {
  for (const capture of financeCaptures) {
    test(`captures ${capture.file}`, async ({ page }) => {
      suppressBrowserTestNoise(page);
      await page.setViewportSize({ width: 1440, height: 960 });
      await loginIfRequired(page, payrollFinanceManager, capture.route);
      await page.locator("main").getByRole("heading", { name: capture.heading }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.locator("main").screenshot({
        path: capture.file,
        animations: "disabled",
      });
    });
  }
});
