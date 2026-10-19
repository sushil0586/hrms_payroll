import { expect, test } from "@playwright/test";

import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const resetIdentifier = process.env.PLAYWRIGHT_SES_RESET_IDENTIFIER ?? "";
const testMembershipId = process.env.PLAYWRIGHT_SES_TEST_MEMBERSHIP_ID ?? "";

test.describe("Lightsail SES operational certification", () => {
  test("password reset is acknowledged through the production browser flow", async ({ page }) => {
    test.skip(!resetIdentifier, "Set PLAYWRIGHT_SES_RESET_IDENTIFIER to an isolated synthetic account.");

    await page.goto("/forgot-password", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await page.getByLabel("Username or email").fill(resetIdentifier);

    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) => candidate.url().includes("/api/auth/password-reset/request") && candidate.request().method() === "POST",
      ),
      page.getByRole("button", { name: "Send setup link" }).click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.getByRole("status")).toContainText("Password setup email requested");
    await expect(page.getByRole("button", { name: "Send setup link" })).toBeEnabled();
  });

  test("HR Admin template test send is delivered through the authenticated browser session", async ({ page }) => {
    test.skip(!testMembershipId, "Set PLAYWRIGHT_SES_TEST_MEMBERSHIP_ID to an isolated synthetic membership.");

    await gotoAuthenticated(page, "/hr-admin/notification-templates/new", hrAdmin);
    const response = await page.request.post("/api/hr-admin/notification-templates/test-send", {
      data: {
        channel: "email",
        subject_template: "Accerio HRMS staging template proof",
        title_template: "Staging email delivery proof",
        body_template: "Hello {employee_name}. This is an authorized synthetic staging email test.",
        metadata_template: { certification: "lightsail-ses" },
        sample_payload: { employee_name: "Synthetic Employee" },
        membership_id: testMembershipId,
        process_now: true,
      },
    });
    const payload = await response.json().catch(() => ({}));

    expect(response.ok(), JSON.stringify(payload)).toBeTruthy();
    expect(payload.test_notification?.status).toBe("delivered");
    expect(payload.test_notification?.recipient_address).toContain("+hrms-reset-20261018@gmail.com");
    expect(payload.test_notification?.delivery_logs?.[0]?.provider_name).toBe("email_smtp");
    expect(payload.test_notification?.delivery_logs?.[0]?.error_message ?? "").toBe("");
  });
});
