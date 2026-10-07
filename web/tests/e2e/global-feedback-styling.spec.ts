import { expect, test, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, expectPageReady, suppressBrowserTestNoise } from "../helpers/assertions";

async function expectFeedbackTone(locator: Locator, tone: "success" | "error") {
  await expect(locator).toBeVisible();
  await expect(locator).toHaveClass(new RegExp(`notice--${tone}`));

  const colors = await locator.evaluate((element) => {
    const styles = window.getComputedStyle(element);
    return {
      backgroundColor: styles.backgroundColor,
      color: styles.color,
    };
  });

  if (tone === "success") {
    expect(colors.backgroundColor).toBe("rgb(236, 253, 245)");
    expect(colors.color).toBe("rgb(6, 95, 70)");
    return;
  }

  expect(colors.backgroundColor).toBe("rgb(254, 242, 242)");
  expect(colors.color).toBe("rgb(153, 27, 27)");
}

async function fillSignupForm(page: Page, email: string) {
  const form = page.locator("#signup");
  await form.getByLabel("Company name").fill("Acme Payroll Services");
  await form.getByLabel("Your name").fill("Priya Sharma");
  await form.getByLabel("Work email").fill(email);
  await form.getByLabel("Phone").fill("+91 90000 00000");
  await form.getByLabel("Employees").fill("120");
  await form.getByLabel("Industry").fill("Services");
  await form.getByLabel("Message").fill("We want a guided payroll pilot.");
}

test.describe("Global feedback styling", () => {
  test("public lead form shows descriptive red failure and green success feedback", async ({ page }) => {
    let attempt = 0;
    await page.route("**/api/public-leads", async (route) => {
      attempt += 1;
      if (attempt === 1) {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Work email is required before the lead can be reviewed." }),
        });
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Request received. Our team will review it and contact you.", lead_id: "lead-1", status: "new" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await expectPageReady(page, "Run payroll, compliance, and employee operations");

    await fillSignupForm(page, "priya@acme.example");
    await page.locator("#signup").getByRole("button", { name: "Request pilot access" }).click();

    const failure = page.locator("#signup").getByRole("alert");
    await expect(failure.getByText("Lead request submission failed.")).toBeVisible();
    await expect(failure.getByText("Work email is required before the lead can be reviewed.")).toBeVisible();
    await expectFeedbackTone(failure, "error");

    await fillSignupForm(page, "priya@acme.example");
    await page.locator("#signup").getByRole("button", { name: "Request pilot access" }).click();

    const success = page.locator("#signup").getByRole("status").filter({ hasText: "Lead request submitted successfully." });
    await expect(success.getByText("Request received. Our team will review it and contact you.")).toBeVisible();
    await expectFeedbackTone(success, "success");
  });

  test("forgot password form shows descriptive red failure and green success feedback", async ({ page }) => {
    let attempt = 0;
    await page.route("**/api/auth/password-reset/request", async (route) => {
      attempt += 1;
      if (attempt === 1) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Password setup email could not be queued. Try again after the mail service recovers." }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ detail: "If the account exists, a secure password setup link will be sent shortly." }),
      });
    });

    await page.goto("/forgot-password", { waitUntil: "networkidle" });
    await suppressBrowserTestNoise(page);
    await expect(page.getByRole("heading", { level: 1, name: "Accerio HRMS" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Reset password" })).toBeVisible();
    await expectNoAppError(page);
    await expectNoHorizontalOverflow(page);

    await page.getByLabel("Username or email").fill("riya.sharma@example.com");
    await page.getByRole("button", { name: "Send setup link" }).click();

    const authForm = page.locator("form.auth-form-shell");
    const failure = authForm.getByRole("alert");
    await expect(failure.getByText("Password setup email could not be sent.")).toBeVisible();
    await expect(failure.getByText("Password setup email could not be queued. Try again after the mail service recovers.")).toBeVisible();
    await expectFeedbackTone(failure, "error");

    await page.getByLabel("Username or email").fill("riya.sharma@example.com");
    await page.getByRole("button", { name: "Send setup link" }).click();

    const success = authForm.getByRole("status").filter({ hasText: "If the account exists, a secure password setup link will be sent shortly." });
    await expect(success.getByText("Password setup email requested.")).toBeVisible();
    await expectFeedbackTone(success, "success");
  });
});
