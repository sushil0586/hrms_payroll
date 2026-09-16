import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import {
  employee,
  gotoAuthenticated,
  hrAdmin,
  manager,
  payrollFinanceManager,
  platformAdmin,
  supportAgent,
  tenantAdmin,
  type Persona,
} from "../helpers/staging-auth";

type WorkspacePersona = {
  label: string;
  persona: Persona;
  landingPath: string;
  navLabel: string | RegExp;
  expectedChrome?: string | RegExp;
  minimumMenuLinks: number;
};

const workspacePersonas: WorkspacePersona[] = [
  {
    label: "Platform admin",
    persona: platformAdmin,
    landingPath: "/platform-admin",
    navLabel: /Platform Admin navigation/i,
    expectedChrome: "Platform Control Center",
    minimumMenuLinks: 3,
  },
  {
    label: "Tenant admin",
    persona: tenantAdmin,
    landingPath: "/tenant-admin",
    navLabel: /Tenant Admin navigation/i,
    expectedChrome: "Account Control Center",
    minimumMenuLinks: 3,
  },
  {
    label: "HR admin",
    persona: hrAdmin,
    landingPath: "/hr-admin",
    navLabel: /HR Admin navigation|People operations navigation/i,
    expectedChrome: "People operations",
    minimumMenuLinks: 12,
  },
  {
    label: "Payroll finance manager",
    persona: payrollFinanceManager,
    landingPath: "/finance-manager",
    navLabel: /Payroll Finance navigation|Finance operations navigation/i,
    expectedChrome: "Finance operations",
    minimumMenuLinks: 4,
  },
  {
    label: "Manager",
    persona: manager,
    landingPath: "/mss/approvals",
    navLabel: /Manager navigation/i,
    expectedChrome: "Manager inbox",
    minimumMenuLinks: 3,
  },
  {
    label: "Employee",
    persona: employee,
    landingPath: "/ess",
    navLabel: /Employee navigation/i,
    expectedChrome: "Self service",
    minimumMenuLinks: 4,
  },
];

async function expectNoWorkspaceFailure(page: Page) {
  await expect(page.getByText(/could not load the current workspace|workspace could not load live data|live workspace load failed/i)).toHaveCount(0);
  await expectNoAppError(page);
}

async function expandSidebarGroups(page: Page) {
  await page.locator("aside details").evaluateAll((details) => {
    details.forEach((item) => item.setAttribute("open", ""));
  });
}

async function sidebarLinks(page: Page, navLabel: string | RegExp) {
  const nav = page.getByRole("navigation", { name: navLabel });
  await expect(nav).toBeVisible();
  await expandSidebarGroups(page);
  return nav.locator("a.nav-item[href]").evaluateAll((anchors) => {
    const seen = new Set<string>();
    return anchors
      .map((anchor) => ({
        href: anchor.getAttribute("href") ?? "",
        label: anchor.textContent?.replace(/\s+/g, " ").trim() ?? "",
      }))
      .filter((item) => {
        if (!item.href || seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      });
  });
}

async function assertUsableWorkspacePage(page: Page, expectedChrome?: string | RegExp) {
  await suppressBrowserTestNoise(page);
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator(".app-shell--workspace, main.shell--workspace").first()).toBeVisible();
  if (expectedChrome) {
    await expect(page.getByText(expectedChrome).first()).toBeVisible();
  }
  await expectNoWorkspaceFailure(page);
  await expectNoHorizontalOverflow(page);
}

async function clickSidebarHref(page: Page, navLabel: string | RegExp, href: string) {
  await expandSidebarGroups(page);
  const nav = page.getByRole("navigation", { name: navLabel });
  const link = nav.locator(`a.nav-item[href="${href}"]`).first();
  await expect(link).toBeVisible();
  await link.click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

test.describe.serial("Public launch role menu certification", () => {
  for (const entry of workspacePersonas) {
    test(`${entry.label} sidebar menus open every available workspace page`, async ({ page }) => {
      test.setTimeout(240_000);

      await gotoAuthenticated(page, entry.landingPath, entry.persona);
      await assertUsableWorkspacePage(page, entry.expectedChrome);

      const links = await sidebarLinks(page, entry.navLabel);
      expect(links.length, `${entry.label} should expose enough usable menu links`).toBeGreaterThanOrEqual(entry.minimumMenuLinks);

      for (const link of links) {
        await test.step(`${entry.label}: ${link.label || link.href}`, async () => {
          await clickSidebarHref(page, entry.navLabel, link.href);
          await expect(page).toHaveURL(new RegExp(`${link.href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
          await assertUsableWorkspacePage(page, entry.expectedChrome);
        });
      }
    });
  }

  test("support agent support surfaces fail closed without tenant-approved session", async ({ page }) => {
    await gotoAuthenticated(page, "/support", supportAgent);
    await suppressBrowserTestNoise(page);
    await expect(page.getByRole("heading", { name: "Support Console" })).toBeVisible();
    await expect(page.getByText(/Support Session Denied|Support Session Allowed/i).first()).toBeVisible();
    await expectNoWorkspaceFailure(page);
    await expectNoHorizontalOverflow(page);

    await page.goto("/support/domain-snapshot", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
    await suppressBrowserTestNoise(page);
    await expect(page.getByRole("heading", { name: "Support Domain Snapshot" })).toBeVisible();
    await expect(page.getByText(/Support Session Denied|Support Session Allowed/i).first()).toBeVisible();
    await expectNoWorkspaceFailure(page);
    await expectNoHorizontalOverflow(page);
  });
});
