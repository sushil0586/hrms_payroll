import { expect, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";

test.describe("Auth and public frontend validation", () => {
  test("login blocks empty credentials before calling the API", async ({ page }) => {
    let loginCalls = 0;
    await page.route("**/api/auth/login", async (route) => {
      loginCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/login", { waitUntil: "networkidle" });
    await suppressBrowserTestNoise(page);
    await page.getByRole("button", { name: "Sign in" }).click();

    const form = page.locator("form.auth-form-shell");
    await expect(form.getByText("Enter your username or email.")).toBeVisible();
    await expect(form.getByText("Enter your password.")).toBeVisible();
    await expect(form.getByLabel("Username or email")).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByLabel("Password")).toHaveAttribute("aria-invalid", "true");
    expect(loginCalls).toBe(0);
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);
  });

  test("forgot password blocks malformed email before calling the API", async ({ page }) => {
    let requestCalls = 0;
    await page.route("**/api/auth/password-reset/request", async (route) => {
      requestCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/forgot-password", { waitUntil: "networkidle" });
    await suppressBrowserTestNoise(page);
    const form = page.locator("form.auth-form-shell");
    await form.getByLabel("Username or email").fill("not-an-email@");
    await form.getByRole("button", { name: "Send setup link" }).click();

    await expect(form.getByText("Enter a valid email address.")).toBeVisible();
    await expect(form.getByLabel("Username or email")).toHaveAttribute("aria-invalid", "true");
    expect(requestCalls).toBe(0);
  });

  test("reset password blocks mismatched passwords before calling the API", async ({ page }) => {
    let resetCalls = 0;
    await page.route("**/api/auth/password-reset/confirm", async (route) => {
      resetCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/reset-password?uid=user-1&token=token-1", { waitUntil: "networkidle" });
    await suppressBrowserTestNoise(page);
    const form = page.locator("form.auth-form-shell");
    await form.getByLabel("New password").fill("Password@123");
    await form.getByLabel("Confirm password").fill("Password@456");
    await form.getByRole("button", { name: "Update password" }).click();

    await expect(form.getByText("Passwords do not match.")).toBeVisible();
    await expect(form.getByLabel("Confirm password")).toHaveAttribute("aria-invalid", "true");
    expect(resetCalls).toBe(0);
  });

  test("public lead form blocks invalid frontend fields before calling the API", async ({ page }) => {
    let leadCalls = 0;
    await page.route("**/api/public-leads", async (route) => {
      leadCalls += 1;
      await route.fulfill({ status: 500, contentType: "application/json", body: "{}" });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await suppressBrowserTestNoise(page);
    const form = page.locator("#signup");
    await form.getByLabel("Company name").fill("Acme Payroll Services");
    await form.getByLabel("Your name").fill("Priya Sharma");
    await form.getByLabel("Work email").fill("not-an-email");
    await form.getByLabel("Employees").fill("0");
    await form.getByRole("button", { name: "Request pilot access" }).click();

    await expect(form.getByText("Enter a valid work email.")).toBeVisible();
    await expect(form.getByText("Employee count must be at least 1.")).toBeVisible();
    expect(leadCalls).toBe(0);
  });
});
