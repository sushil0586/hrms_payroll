import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function runCertificationForVisibleConnection(page: Page) {
  const runButton = page.getByRole("button", { name: "Run certification" }).first();
  if (!(await runButton.isVisible().catch(() => false)) || !(await runButton.isEnabled().catch(() => false))) {
    return;
  }
  const [response] = await Promise.all([
    page.waitForResponse((item) => item.url().includes("/api/hr-admin/payroll-provider-connections/") && item.url().includes("/run-certification") && item.request().method() === "POST"),
    runButton.click(),
  ]);
  const payload = await response.json().catch(() => ({}));
  expect(response.ok(), `Provider certification failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
  await expect(page.getByRole("status").filter({ hasText: "Certification run completed." })).toBeVisible();
}

test.describe("Phase 9E provider ready rehearsal", () => {
  test("HR admin certifies provider lanes and records a ready launch rehearsal through browser UI", async ({ page }) => {
    test.setTimeout(8 * 60 * 1000);

    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");
    await expect(page.getByRole("heading", { name: "Launch rehearsal" })).toBeVisible();

    const connectionHrefs = await page.locator("table.payroll-provider-table a[href*='connectionId=']").evaluateAll((items) =>
      Array.from(new Set(items.map((item) => (item as HTMLAnchorElement).href))),
    );
    expect(connectionHrefs.length).toBeGreaterThan(0);

    for (const href of connectionHrefs) {
      await page.goto(href);
      await expectPageReady(page, "Payroll Providers");
      await runCertificationForVisibleConnection(page);
    }

    await gotoAuthenticated(page, "/hr-admin/payroll-providers");
    await expectPageReady(page, "Payroll Providers");
    const [response] = await Promise.all([
      page.waitForResponse((item) => item.url().includes("/api/hr-admin/payroll-provider-launch-rehearsals/run") && item.request().method() === "POST"),
      page.getByRole("button", { name: "Run rehearsal" }).click(),
    ]);
    const payload = await response.json().catch(() => ({}));
    expect(response.ok(), `Launch rehearsal failed with ${response.status()}: ${JSON.stringify(payload)}`).toBeTruthy();
    await expect(page.getByRole("status").filter({ hasText: "Launch rehearsal recorded." })).toBeVisible();

    await page.reload({ waitUntil: "domcontentloaded" });
    await expectPageReady(page, "Payroll Providers");
    const launchSection = page.locator("section").filter({ has: page.getByRole("heading", { name: "Launch rehearsal" }) }).first();
    await expect(launchSection.getByText("Ready").first()).toBeVisible();
    await expect(launchSection.getByText("None").first()).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
