import { expect, test } from "@playwright/test";

import { expectNoAppError, expectPageReady } from "../helpers/assertions";
import {
  employee,
  gotoAuthenticated,
  hrAdmin,
  manager,
  payrollFinanceManager,
  platformAdmin,
  tenantAdmin,
  type Persona,
} from "../helpers/staging-auth";

const noAccessPersona: Persona | null = process.env.PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME
  ? {
      username: process.env.PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME,
      password: process.env.PLAYWRIGHT_LIVE_NO_ACCESS_PASSWORD ?? process.env.PLAYWRIGHT_LIVE_SEED_PASSWORD ?? "",
    }
  : null;

test.describe.serial("User journey phase 1: access and workspace routing", () => {
  test("unauthenticated users are sent to sign in before protected workspaces", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/hr-admin");
    await expect(page).toHaveURL(/\/login$/);
    await expectPageReady(page, "Sign in");
  });

  test("account recovery is understandable and fail-closed", async ({ page }) => {
    test.setTimeout(90_000);
    await page.context().clearCookies();

    await test.step("Open recovery from sign in", async () => {
      await page.goto("/login", { waitUntil: "domcontentloaded" });
      await expectPageReady(page, "Sign in");
      await page.getByRole("link", { name: "Forgot password?" }).click();
      await expect(page).toHaveURL(/\/forgot-password$/);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".auth-panel")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Accerio HRMS" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
      await expect(page.getByText(/If it matches an active account/i)).toBeVisible();
      await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
      await expectNoAppError(page);
    });

    await test.step("Unknown account does not disclose whether the account exists", async () => {
      await page.getByLabel("Username or email").fill(`missing.${Date.now()}@example.invalid`);
      await expect(page.getByRole("button", { name: "Send setup link" })).toBeEnabled();
      const [response] = await Promise.all([
        page.waitForResponse((item) => item.url().includes("/api/auth/password-reset/request") && item.request().method() === "POST"),
        page.getByRole("button", { name: "Send setup link" }).click(),
      ]);
      expect(response.ok(), `Recovery request should fail closed with a success response, got ${response.status()}`).toBeTruthy();
      await expect(page.getByText(/secure password setup link|if the account exists/i)).toBeVisible();
      await expectNoAppError(page);
    });

    await test.step("Invalid reset links explain the next action", async () => {
      await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
      await expect(page.locator(".auth-panel")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Accerio HRMS" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Set new password" })).toBeVisible();
      await expect(page.getByText("Invalid setup link.")).toBeVisible();
      await expect(page.getByRole("button", { name: "Update password" })).toBeDisabled();
      await expect(page.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/forgot-password");
      await expectNoAppError(page);
    });

    await test.step("Mismatched password confirmation is caught before submit", async () => {
      await page.goto("/reset-password?uid=invalid-user&token=invalid-token", { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");
      await expect(page.locator(".auth-panel")).toBeVisible();
      await expect(page.getByRole("heading", { name: "Accerio HRMS" })).toBeVisible();
      await page.getByLabel("New password").fill("BetterPass@456");
      await page.getByLabel("Confirm password").fill("MismatchPass@456");
      await page.getByRole("button", { name: "Update password" }).click();
      await expect(page.getByText("Passwords do not match.")).toBeVisible();
      await expectNoAppError(page);
    });
  });

  test("platform admin lands in platform control center", async ({ page }) => {
    await gotoAuthenticated(page, "/platform-admin", platformAdmin);
    await expect(page).toHaveURL(/\/platform-admin/);
    await expect(page.getByRole("heading", { name: /Platform|Control|Dashboard/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });

  test("tenant admin lands in tenant control center", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin", tenantAdmin);
    await expect(page).toHaveURL(/\/tenant-admin/);
    await expect(page.getByRole("heading", { name: /Account Control Center|Tenant/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });

  test("HR admin lands in HR control center", async ({ page }) => {
    await gotoAuthenticated(page, "/hr-admin", hrAdmin);
    await expect(page).toHaveURL(/\/hr-admin/);
    await expect(page.getByRole("heading", { name: /HR Control Center|Control Center|Dashboard/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });

  test("employee lands in ESS and cannot browse HR admin", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    await expect(page).toHaveURL(/\/ess/);
    await expect(page.getByRole("heading", { name: /My workspace|Self service|Employee/i }).first()).toBeVisible();
    await expectNoAppError(page);

    await page.goto("/hr-admin", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/ess|\/workspace-access|\/login/);
  });

  test("manager lands in MSS approvals without HR escalation", async ({ page }) => {
    await gotoAuthenticated(page, "/mss/approvals", manager);
    await expect(page).toHaveURL(/\/mss\/approvals/);
    await expect(page.getByRole("heading", { name: /Manager inbox|Approvals|Leave approvals/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });

  test("payroll finance manager lands in finance workspace", async ({ page }) => {
    await gotoAuthenticated(page, "/finance-manager", payrollFinanceManager);
    await expect(page).toHaveURL(/\/finance-manager/);
    await expect(page.getByRole("heading", { name: /Finance control center|Finance/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });

  test("active account without workspace access lands on workspace access page", async ({ page }) => {
    if (!noAccessPersona) {
      test.skip(true, "Set PLAYWRIGHT_LIVE_NO_ACCESS_USERNAME to certify no-role users.");
      return;
    }

    await gotoAuthenticated(page, "/workspace-access", noAccessPersona);
    await expect(page).toHaveURL(/\/workspace-access/);
    await expect(page.getByRole("heading", { name: /No workspace access|Choose your workspace/i }).first()).toBeVisible();
    await expectNoAppError(page);
  });
});
