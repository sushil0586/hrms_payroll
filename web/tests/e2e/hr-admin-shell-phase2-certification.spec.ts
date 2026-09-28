import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal, gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

const screenshotDir = path.join(process.cwd(), "test-results", "hr-admin-shell-phase2");

const phase2Routes = [
  "/hr-admin",
  "/hr-admin/launch-remediation",
];

function slugForRoute(route: string) {
  return route
    .replace(/^\/+/, "")
    .replace(/[/?=&.#]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
}

async function capture(page: Page, route: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ fullPage: true, path: path.join(screenshotDir, `${slugForRoute(route)}.png`) });
}

async function expectCompactHeadings(page: Page, route: string) {
  const headingIssues = await page.locator("main h1, main h2").evaluateAll((headings) =>
    headings.flatMap((heading) => {
      const rect = heading.getBoundingClientRect();
      const style = window.getComputedStyle(heading);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }

      const level = heading.tagName.toLowerCase();
      const text = (heading.textContent || "").trim().replace(/\s+/g, " ");
      const fontSize = Number.parseFloat(style.fontSize);
      const maxSize = level === "h1" ? 30 : 24;
      const issues: string[] = [];
      if (fontSize > maxSize) {
        issues.push(`${level} "${text}" is too large at ${fontSize}px`);
      }
      if (text.length > 52 && level === "h2") {
        issues.push(`${level} "${text}" is too long for a compact section heading`);
      }
      return issues;
    }),
  );

  expect(headingIssues, `${route} should keep headings compact and meaningful`).toEqual([]);
}

async function expectShellHealthy(page: Page, route: string) {
  await suppressBrowserTestNoise(page);
  const sidebar = page.locator("aside.app-sidebar").first();
  const mobileMenu = page.locator("header .mobile-workspace-nav summary").first();
  if (await sidebar.isVisible().catch(() => false)) {
    await expect(sidebar, `${route} should render desktop sidebar`).toBeVisible();
  } else {
    await expect(mobileMenu, `${route} should expose mobile workspace menu when sidebar is hidden`).toBeVisible();
  }
  await expect(page.locator("header.app-topbar").first(), `${route} should render topbar`).toBeVisible();
  await expect(page.locator("main.shell").first(), `${route} should render page shell`).toBeVisible();
  await expect(page.locator("h1").first(), `${route} should expose a page heading`).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectCompactHeadings(page, route);
  await expectVisibleLinksAreReal(page, route);
  await auditVisibleControls(page, route, 36);
}

async function expectLaunchActionsRightAligned(page: Page) {
  const alignmentIssues = await page.locator("main .launch-remediation-card").evaluateAll((cards) =>
    cards.flatMap((card) => {
      const button = card.querySelector<HTMLButtonElement>(".launch-remediation-actions__summary .button");
      if (!button) {
        return [];
      }
      const cardRect = card.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();
      const rightGap = Math.round(cardRect.right - buttonRect.right);
      return rightGap > 24 ? [`Manage button is ${rightGap}px from the card right edge`] : [];
    }),
  );

  expect(alignmentIssues, "Launch remediation card actions should be right aligned on desktop").toEqual([]);
}

test.describe("HR Admin Phase 2 shell and launch UX certification", () => {
  test("dashboard and launch pages keep shell, headings, and links clean", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of phase2Routes) {
      await gotoDemoHrAdmin(page, route);
      await expectShellHealthy(page, route);
      await capture(page, route);
    }
  });

  test("launch blocker actions use a focused modal when rows exist", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1440, height: 960 });
    await gotoDemoHrAdmin(page, "/hr-admin/launch-remediation");
    await expectShellHealthy(page, "/hr-admin/launch-remediation");

    const manageButton = page.locator("main .launch-remediation-actions__summary button", { hasText: "Manage" }).first();
    if (!(await manageButton.isVisible().catch(() => false))) {
      await capture(page, "/hr-admin/launch-remediation-no-open-actions");
      return;
    }

    await expectLaunchActionsRightAligned(page);
    await manageButton.click();
    const dialog = page.getByRole("dialog", { name: "Manage blocker" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Owner role")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Acknowledge" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Assign" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await capture(page, "/hr-admin/launch-remediation-modal");
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toHaveCount(0);
  });

  test("phase 2 pages remain usable on mobile width", async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of phase2Routes) {
      await gotoDemoHrAdmin(page, route);
      await expectShellHealthy(page, route);
      await page.locator("header .mobile-workspace-nav summary").first().click();
      await expect(page.locator("header .mobile-workspace-nav__panel").first()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await capture(page, `${route}-mobile`);
    }
  });
});
