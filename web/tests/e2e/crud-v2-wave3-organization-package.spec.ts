import { expect, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated, hrAdmin } from "../helpers/staging-auth";

const route = "/hr-admin/organization";

function filters(page: import("@playwright/test").Page) {
  return page.getByRole("form", { name: "Organization filters" });
}

async function apply(page: import("@playwright/test").Page) {
  await filters(page).getByRole("button", { name: "Apply filters" }).click();
  await page.waitForLoadState("domcontentloaded");
  await expectPageReady(page, "Organization masters");
}

test.describe("CRUD V2 Wave 3 organization screen package", () => {
  test("Search and Status return canonical results and persist across refresh", async ({ page }) => {
    await gotoAuthenticated(page, `${route}?section=departments`, hrAdmin);
    await expectPageReady(page, "Organization masters");
    const firstRow = page.getByRole("table", { name: "Organization masters" }).locator("tbody tr").first();
    const exactName = (await firstRow.locator("strong").innerText()).trim();

    await filters(page).getByLabel("Search").fill(exactName);
    await apply(page);
    await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(exactName).replace(/%20/g, "(?:%20|\\+)")}`));
    await expect(filters(page).getByLabel("Search")).toHaveValue(exactName);
    await expect(page.getByRole("table", { name: "Organization masters" }).locator("tbody tr")).toHaveCount(1);
    await expect(page.getByLabel("Organization catalog summary")).toContainText("1 matching");
    await page.reload();
    await expect(filters(page).getByLabel("Search")).toHaveValue(exactName);
    await expect(page.getByRole("table", { name: "Organization masters" })).toContainText(exactName);

    await filters(page).getByLabel("Search").fill("");
    await filters(page).getByLabel("Status").selectOption("active");
    await apply(page);
    await expect(page).toHaveURL(/status=active/);
    await expect(filters(page).getByLabel("Status")).toHaveValue("active");
    for (const cell of await page.getByRole("table", { name: "Organization masters" }).locator("tbody tr td:nth-child(2)").all()) {
      await expect(cell).toHaveText("Active");
    }
    await page.reload();
    await expect(filters(page).getByLabel("Status")).toHaveValue("active");

    await page.goto(`${route}?section=departments&status=not-a-status&q=%20%20`);
    await expect(filters(page).getByLabel("Status")).toHaveValue("all");
    await expect(filters(page).getByLabel("Search")).toHaveValue("  ");
    await expect(page.getByRole("table", { name: "Organization masters" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: "Current record loaded." })).toHaveCount(0);
  });

  test("Section Page and Page size reject malformed query state and retain approved values", async ({ page }) => {
    await gotoAuthenticated(page, `${route}?section=not-a-section&page=abc&page_size=999`, hrAdmin);
    await expectPageReady(page, "Organization masters");
    await expect(filters(page).getByLabel("Section")).toHaveValue("departments");
    await expect(filters(page).getByLabel("Page size")).toHaveValue("10");
    await expect(page.locator(".pagination-bar__summary")).toContainText("Page 1");

    for (const size of ["10", "25", "50"]) {
      await filters(page).getByLabel("Page size").selectOption(size);
      await apply(page);
      await expect(page).toHaveURL(new RegExp(`page_size=${size}`));
      await expect(filters(page).getByLabel("Page size")).toHaveValue(size);
      await page.reload();
      await expect(filters(page).getByLabel("Page size")).toHaveValue(size);
    }

    for (const malformed of ["0", "-1", "1.5", "text", "51"]) {
      await page.goto(`${route}?section=departments&page_size=${encodeURIComponent(malformed)}&page=${encodeURIComponent(malformed)}`);
      await expect(filters(page).getByLabel("Page size")).toHaveValue("10");
      await expect(page.locator(".pagination-bar__summary")).toContainText("Page 1");
    }

    await filters(page).getByLabel("Section").selectOption("legal_entities");
    await apply(page);
    await expect(page).toHaveURL(/section=legal_entities/);
    await expect(filters(page).getByLabel("Section")).toHaveValue("legal_entities");
    await page.reload();
    await expect(filters(page).getByLabel("Section")).toHaveValue("legal_entities");
  });

  test("Organization filters remain keyboard reachable and unclipped on mobile and tablet", async ({ page }) => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
      await page.setViewportSize(viewport);
      await gotoAuthenticated(page, `${route}?section=departments`, hrAdmin);
      for (const label of ["Section", "Search", "Status", "Page size"]) {
        const control = filters(page).getByLabel(label);
        await expect(control).toBeVisible();
        await control.focus();
        await expect(control).toBeFocused();
      }
      await expect(filters(page).getByRole("button", { name: "Apply filters" })).toBeVisible();
      await expect(filters(page).getByRole("link", { name: "Clear filters" })).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }
  });
});
