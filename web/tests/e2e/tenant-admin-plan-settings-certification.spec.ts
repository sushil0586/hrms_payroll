import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant admin plan and settings certification", () => {
  test("routes account settings into a prefilled configuration-change request", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/settings");
    await expectPageReady(page, "Tenant Settings");

    const requestAccountChange = page.getByRole("main").getByRole("link", { name: "Request account change" });
    await expect(requestAccountChange).toBeVisible();
    await requestAccountChange.click();

    await expectPageReady(page, "Plans And Subscription");
    await expect(page.getByRole("main").getByLabel("Type")).toHaveValue("configuration_change");
    await expect(page.getByRole("main").getByLabel("Title")).toHaveValue("Update tenant account profile");
    await expect(page.getByRole("main").getByLabel("Target ref")).toHaveValue("tenant.account.profile");
    await expect(page.getByRole("main").getByLabel("Description")).toHaveValue(
      "Request a platform-reviewed tenant profile change."
    );
    await expect(page.getByRole("main").getByLabel("Payload")).toContainText("tenant.account.profile");
    await expect(page.getByRole("main").getByRole("button", { name: "Submit request" })).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("validates configuration-change request fields before submit", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/plan");
    await expectPageReady(page, "Plans And Subscription");

    const requestType = page.getByRole("main").getByLabel("Type");
    const title = page.getByRole("main").getByLabel("Title");
    const targetRef = page.getByRole("main").getByLabel("Target ref");
    const payload = page.getByRole("main").getByLabel("Payload");
    const submit = page.getByRole("main").getByRole("button", { name: "Submit request" });

    await requestType.selectOption("configuration_change");
    await expect(page.getByText("Title is required.")).toBeVisible();
    await expect(title).toHaveAttribute("aria-invalid", "true");
    await targetRef.clear();
    await expect(page.getByText("Target reference is required for this request type.")).toBeVisible();
    await expect(targetRef).toHaveAttribute("aria-invalid", "true");
    await expect(submit).toBeDisabled();

    await title.fill(`Settings validation ${Date.now()}`);
    await targetRef.fill("tenant.account.profile");
    await payload.fill("{");
    await expect(page.getByText("Payload must be valid JSON.")).toBeVisible();
    await expect(payload).toHaveAttribute("aria-invalid", "true");
    await expect(submit).toBeDisabled();

    await payload.fill("{\n  \"configuration_key\": \"tenant.account.profile\",\n  \"change_summary\": \"Request display name review\"\n}");
    await expect(submit).toBeEnabled();
    await expectNoHorizontalOverflow(page);
  });

  test("creates and cancels a disposable configuration-change request", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/plan");
    await expectPageReady(page, "Plans And Subscription");

    const requestTitle = `Settings cancel proof ${Date.now()}`;
    await page.getByRole("main").getByLabel("Type").selectOption("configuration_change");
    await page.getByRole("main").getByLabel("Title").fill(requestTitle);
    await page.getByRole("main").getByLabel("Target ref").fill("tenant.account.profile");
    await page.getByRole("main").getByLabel("Description").fill("Disposable browser certification request.");
    await page
      .getByRole("main")
      .getByLabel("Payload")
      .fill("{\n  \"configuration_key\": \"tenant.account.profile\",\n  \"change_summary\": \"Disposable certification request\"\n}");

    const createResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/change-requests") && response.request().method() === "POST",
      { timeout: 20_000 }
    );
    await page.getByRole("main").getByRole("button", { name: "Submit request" }).click();
    await expect((await createResponse).ok()).toBeTruthy();

    const createdRequest = page.locator(".tenant-change-request-row").filter({ hasText: requestTitle }).first();
    await expect(createdRequest).toBeVisible({ timeout: 20_000 });
    await expect(createdRequest.getByText("Submitted")).toBeVisible();
    await expect(createdRequest.getByRole("button", { name: "Cancel" })).toBeEnabled();

    const cancelResponse = page.waitForResponse(
      (response) => response.url().includes("/api/tenant-admin/change-requests/") && response.request().method() === "PATCH",
      { timeout: 20_000 }
    );
    await createdRequest.getByRole("button", { name: "Cancel" }).click();
    await expect((await cancelResponse).ok()).toBeTruthy();
    await expect(createdRequest.getByText("Canceled")).toBeVisible({ timeout: 20_000 });
    await expect(createdRequest.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the change request queue paginated and role protected", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/plan");
    await expectPageReady(page, "Plans And Subscription");

    const rows = page.locator(".tenant-change-request-row");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeLessThanOrEqual(5);
    await expect(page.getByLabel("Change request pagination")).toBeVisible();

    const nextButton = page.getByLabel("Change request pagination").getByRole("button", { name: "Next" });
    if (await nextButton.isEnabled().catch(() => false)) {
      const firstPageText = (await rows.first().innerText()).replace(/\s+/g, "");
      await nextButton.click();
      await expect.poll(async () => (await rows.first().innerText()).replace(/\s+/g, "")).not.toBe(firstPageText);
      await page.getByLabel("Change request pagination").getByRole("button", { name: "Previous" }).click();
      await expect.poll(async () => (await rows.first().innerText()).replace(/\s+/g, "")).toBe(firstPageText);
    }

    await page.context().clearCookies();
    const unauthenticatedCreate = await page.request.post("/api/tenant-admin/change-requests", {
      data: {
        request_type: "configuration_change",
        title: "Unauthorized request",
        target_ref: "tenant.account.profile",
        requested_payload: { configuration_key: "tenant.account.profile" },
      },
    });
    expect([401, 403]).toContain(unauthenticatedCreate.status());

    await gotoAuthenticated(page, "/ess", employee);
    const employeeCreate = await page.request.post("/api/tenant-admin/change-requests", {
      data: {
        request_type: "configuration_change",
        title: "Employee request",
        target_ref: "tenant.account.profile",
        requested_payload: { configuration_key: "tenant.account.profile" },
      },
    });
    expect([401, 403, 404]).toContain(employeeCreate.status());
  });
});
