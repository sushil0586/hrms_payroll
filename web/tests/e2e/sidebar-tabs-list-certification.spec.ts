import { expect, type Page, test } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

type WorkspaceCase = {
  name: string;
  entryPath: string;
  heading: string | RegExp;
  persona: Persona;
};

const workspaces: WorkspaceCase[] = [
  { name: "Platform admin", entryPath: "/platform-admin", heading: "Platform Admin Console", persona: platformAdmin },
  { name: "HR admin", entryPath: "/hr-admin", heading: "Control center", persona: hrAdmin },
  { name: "Employee self service", entryPath: "/ess", heading: "Self Service", persona: employee },
  { name: "Manager self service", entryPath: "/mss/approvals", heading: /Approvals|Manager/i, persona: manager },
  { name: "Tenant admin", entryPath: "/tenant-admin", heading: "Tenant Admin Console", persona: hrAdmin },
];

function uniqueByHref(items: Array<{ href: string; label: string }>) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

async function visibleSidebarLinks(page: Page) {
  await page.locator(".app-sidebar__nav details.nav-group--collapsible:not([open]) summary").evaluateAll((summaries) => {
    summaries.forEach((summary) => (summary as HTMLElement).click());
  });
  const links = page.locator(".app-sidebar__nav a.nav-item");
  const count = await links.count();
  const items: Array<{ href: string; label: string }> = [];
  for (let index = 0; index < count; index += 1) {
    const link = links.nth(index);
    const href = await link.getAttribute("href");
    const label = (await link.locator(".nav-item__content strong").innerText().catch(() => "")).trim();
    if (href && label) items.push({ href, label });
  }
  return uniqueByHref(items);
}

async function certifyTabs(page: Page) {
  const tabs = page.getByRole("tab");
  const count = await tabs.count();
  for (let index = 0; index < count; index += 1) {
    const tab = tabs.nth(index);
    const label = (await tab.innerText()).trim().replace(/\s+/g, " ");
    await expect(tab, `tab ${label}`).toBeVisible();
    await tab.click();
    await expect(tab, `active tab ${label}`).toHaveAttribute("aria-selected", "true");
    await expectNoHorizontalOverflow(page);
  }
}

async function longListDefects(page: Page) {
  return page.evaluate(() => {
    const defects: string[] = [];
    const hasPagination = Boolean(document.querySelector(".pagination-bar"));
    const tenantRows = document.querySelectorAll(".employee-directory-item").length;
    const supportRows = document.querySelectorAll(".tenant-support-access-row").length;
    const tableRows = Array.from(document.querySelectorAll("table")).map((table) => table.querySelectorAll("tbody tr").length);
    const largestTable = Math.max(0, ...tableRows);

    if (tenantRows > 8 && !hasPagination) defects.push(`tenant directory has ${tenantRows} rows without pagination`);
    if (supportRows > 8 && !hasPagination) defects.push(`support/list rows have ${supportRows} rows without pagination`);
    if (largestTable > 25 && !hasPagination) defects.push(`table has ${largestTable} rows without pagination`);

    return defects;
  });
}

async function certifyCurrentPage(page: Page, label: string) {
  await expect(page.locator("main.shell:not(.app-loading-shell)").first(), label).toBeVisible();
  await expect(page.getByText(/application error|could not load the live|unhandled runtime error/i), label).toHaveCount(0);
  await certifyTabs(page);
  const defects = await longListDefects(page);
  expect(defects, `${label} long-list pagination defects`).toEqual([]);
  await expectNoHorizontalOverflow(page);
}

test.describe("Certification: sidebar, tabs, lists, and pagination", () => {
  for (const workspace of workspaces) {
    test(`${workspace.name} sidebar pages, tabs, and long lists are certified`, async ({ page }) => {
      test.setTimeout(240_000);

      await gotoAuthenticated(page, workspace.entryPath, workspace.persona);
      await expectPageReady(page, workspace.heading);
      await expect(page.locator(".app-sidebar__nav details.nav-group--collapsible").first()).toBeVisible();

      const links = await visibleSidebarLinks(page);
      expect(links.length, `${workspace.name} sidebar link count`).toBeGreaterThan(0);

      for (const link of links) {
        await page.goto(link.href, { waitUntil: "domcontentloaded" });
        await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
        await certifyCurrentPage(page, `${workspace.name} > ${link.label} (${link.href})`);
      }
    });
  }
});
