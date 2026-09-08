import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";

test.describe("Tenant admin console", () => {
  test("shows account, seats, configuration, and commercial evidence", async ({ page }) => {
    await page.goto("/tenant-admin");
    await expectPageReady(page, "Tenant Admin Console");
    await expect(page.getByRole("main").getByText("Account posture", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Northstar Foods" })).toBeVisible();
    await expect(page.getByRole("main").getByText("Governance checks", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Role coverage", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Configuration health", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Member mutations", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Email")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Username")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Tenant Admin")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Invite member" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Update roles" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Suspend" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Change requests", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Billing and configuration queue" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Type")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Payload")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Submit request" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Approve" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Mark applied" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Support access", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Scoped support grants" })).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Support agent")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Duration")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Reason")).toBeVisible();
    await expect(page.getByRole("main").getByLabel("Account posture")).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Request access" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Start session" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByRole("button", { name: "Revoke" }).first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Usage evidence", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Commercial audit", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Workspaces" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
