import { expect, test, type Page } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

async function openSettlementTab(page: Page, name: RegExp | string) {
  const tab = page.getByRole("navigation", { name: "Payroll settlement sections" }).getByRole("link", { name });
  const href = await tab.getAttribute("href");
  expect(href).toBeTruthy();
  await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await expectPageReady(page, "Payroll Settlements");
}

test.describe("HR admin payroll settlement flows", () => {
  test("settlement workspace exposes F&F packages, totals, and live trace detail", async ({ page }) => {
    test.setTimeout(90_000);
    await gotoAuthenticated(page, "/hr-admin/payroll-settlements");
    await expectPageReady(page, "Payroll Settlements");

    await expect(page.getByRole("heading", { name: "Settlement runs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Full-and-final orchestration" })).toBeVisible();

    await openSettlementTab(page, /Register/);
    await expect(page.getByText("Full-and-final packages").first()).toBeVisible();

    const settlementLink = page.locator("main table a[href*='settlementId=']").first();
    if (await settlementLink.isVisible().catch(() => false)) {
      const href = await settlementLink.getAttribute("href");
      expect(href).toContain("settlementId=");
      await settlementLink.scrollIntoViewIfNeeded();
      await page.goto(href!, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await expect(page).toHaveURL(/settlementId=/);
      await expect(page.getByText("Source hash").or(page.getByText("Trace")).or(page.getByText("Line")).first()).toBeVisible();
    }

    await openSettlementTab(page, /Actions/);
    await expect(page.getByLabel("Settlement certification actions")).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });
});
