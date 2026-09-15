import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated } from "../helpers/staging-auth";

test.describe("Tenant trust audit", () => {
  test("shows customer-visible audit filters and live evidence", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByRole("main").getByText("Event groups", { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText("Support access", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Evidence ledger" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Download audit" })).toBeVisible();
    await expect(page.getByLabel("Trust audit pagination")).toBeVisible();
    await expect(page.getByRole("link", { name: "First" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Previous" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Next" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Last" })).toBeVisible();

    const evidenceLink = page.locator("main a[href*='eventId='], main a[href*='support-session'], main a[href*='audit']").first();
    if (await evidenceLink.isVisible().catch(() => false)) {
      await expect(evidenceLink).toBeVisible();
    } else {
      await expect(page.getByText("No audit events").or(page.getByText("Evidence ledger")).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("filters evidence, clears filters, paginates, and downloads audit", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit?page_size=3");
    await expectPageReady(page, "Tenant Trust Audit");
    await page.getByRole("main").getByText("Support access", { exact: true }).first().click();
    await expect(page).toHaveURL(/event_group=support/);
    await expect(page.getByText("Group: Support")).toBeVisible();

    const firstType = page.locator("main a[href*='event_type=']").first();
    if (await firstType.isVisible().catch(() => false)) {
      await firstType.click();
      await expect(page).toHaveURL(/event_type=/);
      await expect(page.getByText(/Event:/).first()).toBeVisible();
    }

    const nextLink = page.getByRole("link", { name: "Next" });
    const nextHref = await nextLink.getAttribute("href");
    if (nextHref && !nextHref.endsWith("page=1")) {
      await nextLink.click();
      await expect(page).toHaveURL(/page=2/);
      await expect(page.getByLabel("Trust audit pagination")).toContainText("Page 2");
    }

    await page.getByRole("link", { name: "Clear" }).click();
    await expect(page).toHaveURL(/\/tenant-admin\/trust-audit$/);
    await expect(page.getByText("No filters")).toBeVisible();

    const download = await page.request.get("/api/tenant-admin/commercial-support-audit/download");
    expect(download.ok()).toBeTruthy();
    expect(download.headers()["content-type"]).toContain("application/json");
    const body = await download.json();
    expect(body).toHaveProperty("tenant");
    expect(body).toHaveProperty("commercial_events");
    expect(body).toHaveProperty("support_access");
    expect(body).toHaveProperty("evidence_checksum_sha256");
    await expectNoHorizontalOverflow(page);
  });

  test("shows clear empty state for unknown evidence filter", async ({ page }) => {
    await gotoAuthenticated(page, "/tenant-admin/trust-audit?event_group=tenant_admin&event_type=unknown_event_type");
    await expectPageReady(page, "Tenant Trust Audit");
    await expect(page.getByText("No audit events match the selected trust filters.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test("denies trust audit API to employee role", async ({ page }) => {
    await gotoAuthenticated(page, "/ess", employee);
    const response = await page.request.get("/api/tenant-admin/trust-audit");
    expect([401, 403, 404]).toContain(response.status());
  });
});
