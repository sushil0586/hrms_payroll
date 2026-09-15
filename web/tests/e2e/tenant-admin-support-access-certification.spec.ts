import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin support access certification", () => {
  test("validates request fields and support scopes clearly", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/support-access");
    await expectPageReady(page, "Support Access");

    const form = page.getByTestId("tenant-support-access-form");
    const supportAgent = form.getByLabel("Support agent");
    const duration = form.getByLabel("Duration");
    const reason = form.getByLabel("Reason");
    const requestButton = form.getByRole("button", { name: "Request access" });

    await expect(supportAgent).toHaveAttribute("aria-invalid", "true");
    await expect(reason).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByText("Support agent is required.")).toBeVisible();
    await expect(form.getByText("Reason is required.")).toBeVisible();
    await expect(requestButton).toBeDisabled();

    await duration.fill("0");
    await expect(duration).toHaveAttribute("aria-invalid", "true");
    await expect(form.getByText(/Duration must be between 1 and/)).toBeVisible();

    for (const scope of await form.locator(".tenant-role-picker input").all()) {
      if (await scope.isChecked()) {
        await scope.uncheck();
      }
    }
    await expect(form.getByText("Select at least one support scope.")).toBeVisible();

    await supportAgent.fill("support.agent");
    await reason.fill(`Support validation ${Date.now()}`);
    await duration.fill("30");
    await form.locator(".tenant-role-picker input").first().check();
    await expect(requestButton).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("creates, rejects, and keeps rejected grants closed", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/support-access");
    await expectPageReady(page, "Support Access");

    const reason = `Support reject proof ${Date.now()}`;
    const form = page.getByTestId("tenant-support-access-form");
    await form.getByLabel("Support agent").fill("support.agent");
    await form.getByLabel("Duration").fill("30");
    await form.getByLabel("Reason").fill(reason);

    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await form.getByRole("button", { name: "Request access" }).click();
    await expect((await createResponse).ok()).toBeTruthy();

    const grant = page.locator(".tenant-support-access-row").filter({ hasText: reason }).first();
    await expect(grant).toBeVisible({ timeout: 20_000 });
    await expect(grant.getByText("Requested")).toBeVisible();
    await expect(grant.getByRole("button", { name: "Reject" })).toBeDisabled();
    await grant.getByLabel("Decision note").fill("Rejected during support access certification.");
    await expect(grant.getByRole("button", { name: "Reject" })).toBeEnabled();

    const rejectResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/support-access-grants/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await grant.getByRole("button", { name: "Reject" }).click();
    await expect((await rejectResponse).ok()).toBeTruthy();
    await expect(grant.getByText("Rejected")).toBeVisible({ timeout: 20_000 });
    await expect(grant.getByRole("button", { name: "Approve" })).toBeDisabled();
    await expect(grant.getByRole("button", { name: "Start session" })).toBeDisabled();
    await expect(grant.getByRole("button", { name: "Revoke" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
  });

  test("searches and paginates support grant history", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/support-access");
    await expectPageReady(page, "Support Access");

    const rows = page.locator(".tenant-support-access-row");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeLessThanOrEqual(5);
    await expect(page.getByLabel("Support grant pagination")).toBeVisible();

    const firstReason = (await rows.first().locator("span").nth(1).innerText()).trim();
    await page.getByLabel("Search support grants").fill(firstReason);
    await expect(rows.first()).toContainText(firstReason);
    expect(await rows.count()).toBeLessThanOrEqual(5);

    await page.getByLabel("Search support grants").fill("no-support-grant-matches-this-query");
    await expect(page.getByText("No support grants match the current search.")).toBeVisible();
    await expect(rows).toHaveCount(0);

    await page.getByLabel("Search support grants").clear();
    await expect(rows.first()).toBeVisible();
    const nextButton = page.getByLabel("Support grant pagination").getByRole("button", { name: "Next" });
    if (await nextButton.isEnabled().catch(() => false)) {
      const firstPageText = (await rows.first().innerText()).replace(/\s+/g, "");
      await nextButton.click();
      await expect.poll(async () => (await rows.first().innerText()).replace(/\s+/g, "")).not.toBe(firstPageText);
      await page.getByLabel("Support grant pagination").getByRole("button", { name: "Previous" }).click();
      await expect.poll(async () => (await rows.first().innerText()).replace(/\s+/g, "")).toBe(firstPageText);
    }
    await expectNoHorizontalOverflow(page);
  });

  test("denies support access mutations outside tenant-admin authority", async ({ page }) => {
    await page.context().clearCookies();
    const unauthenticatedCreate = await page.request.post("/api/tenant-admin/support-access-grants", {
      data: {
        support_agent_identifier: "support.agent",
        reason: "Unauthenticated support request",
        scope_refs: ["account_posture"],
        requested_duration_minutes: 30,
      },
    });
    expect([401, 403]).toContain(unauthenticatedCreate.status());

    await gotoAuthenticated(page, "/ess", employee);
    const employeeCreate = await page.request.post("/api/tenant-admin/support-access-grants", {
      data: {
        support_agent_identifier: "support.agent",
        reason: "Employee support request",
        scope_refs: ["account_posture"],
        requested_duration_minutes: 30,
      },
    });
    expect([401, 403, 404]).toContain(employeeCreate.status());
  });
});
