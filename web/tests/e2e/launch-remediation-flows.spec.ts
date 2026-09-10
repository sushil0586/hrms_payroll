import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

test.describe("HR admin launch remediation workspace", () => {
  test("lists launch assignments and acknowledges a row", async ({ page }) => {
    await page.route("**/api/hr-admin/launch-remediations/*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "launch-remediation-primary-bank",
          gate_ref: "employees.primary_bank",
          module_ref: "employee_master",
          module_label: "Employee master",
          label: "Primary bank coverage",
          severity: "warning",
          status: "open",
          owner_role_ref: "hr-admin",
          assigned_to_identifier: "",
          action_href: "/hr-admin/employees",
          action_label: "Review employees",
          sla_days: 3,
          current_value: "4/5",
          evidence_ref: "",
          first_seen_at: "2026-09-07T10:30:00+05:30",
          last_seen_at: "2026-09-07T10:40:00+05:30",
          acknowledged_at: "2026-09-07T10:40:00+05:30",
          acknowledged_by_identifier: "nisha.rao",
          ignored_at: null,
          ignored_by_identifier: "",
          resolved_at: null,
          resolution_note: "Reviewed in launch remediation workspace.",
          action_history: [],
          source_hash: "demo-launch-remediation-primary-bank",
        }),
      });
    });

    await gotoAuthenticated(page, "/hr-admin/launch-remediation");
    await expectPageReady(page, "Launch Remediation");
    await expect(page.getByText("Open assignments")).toBeVisible();
    await expect(page.getByText("Primary bank coverage")).toBeVisible();
    await expect(page.locator(".record-card", { hasText: "Provider launch history" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Assign owner" }).first()).toBeVisible();

    await page.getByRole("button", { name: "Acknowledge" }).first().click();
    await expect(page.getByText("Assignment updated.")).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
