import { mkdirSync } from "node:fs";
import path from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal, gotoDemoHrAdmin } from "../helpers/hr-admin-ui-audit";

const screenshotDir = path.join(process.cwd(), "test-results", "hr-admin-time-leave-tl4");

const timeLeavePolishRoutes = [
  "/hr-admin/attendance-operations",
  "/hr-admin/attendance-records",
  "/hr-admin/attendance-regularizations",
  "/hr-admin/leave-balances",
  "/hr-admin/policies",
  "/hr-admin/policy-assignments",
  "/hr-admin/shifts",
  "/hr-admin/employee-shift-assignments",
  "/hr-admin/shift-roster-templates",
  "/hr-admin/holiday-calendars",
  "/hr-admin/leave-types",
  "/hr-admin/leave-policies",
  "/hr-admin/leave-policy-assignments",
  "/hr-admin/attendance-policies",
  "/hr-admin/attendance-policy-assignments",
];

const compactMobileRoutes = [
  "/hr-admin/attendance-operations",
  "/hr-admin/attendance-records",
  "/hr-admin/attendance-regularizations",
  "/hr-admin/leave-balances",
  "/hr-admin/policies",
  "/hr-admin/leave-policies",
  "/hr-admin/attendance-policies",
];

function slugForRoute(route: string, viewportLabel: string) {
  const routeSlug = route
    .replace(/^\/+/, "")
    .replace(/[/?=&.#]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/-$/, "");
  return `${routeSlug}.${viewportLabel}.png`;
}

async function capture(page: Page, route: string, viewportLabel: string) {
  mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({
    fullPage: true,
    path: path.join(screenshotDir, slugForRoute(route, viewportLabel)),
    animations: "disabled",
  });
}

async function expectCompactTypography(page: Page, route: string) {
  const issues = await page.locator("main h1, main h2, main h3, main .page-title, main .section-title").evaluateAll((headings) =>
    headings.flatMap((heading) => {
      const rect = heading.getBoundingClientRect();
      const style = window.getComputedStyle(heading);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }

      const text = (heading.textContent || "").trim().replace(/\s+/g, " ");
      const fontSize = Number.parseFloat(style.fontSize);
      const tag = heading.tagName.toLowerCase();
      const isH1 = tag === "h1" || heading.classList.contains("page-title");
      const isH2 = tag === "h2" || heading.classList.contains("section-title");
      const maxFontSize = isH1 ? 34 : isH2 ? 24 : 21;
      const maxTextLength = isH1 ? 72 : isH2 ? 70 : 58;
      const failures: string[] = [];

      if (fontSize > maxFontSize) {
        failures.push(`${tag} "${text}" is too large at ${fontSize}px`);
      }
      if (text.length > maxTextLength) {
        failures.push(`${tag} "${text}" is too wordy for a scannable operations page`);
      }
      return failures;
    }),
  );

  expect(issues, `${route} should keep headings compact and meaningful`).toEqual([]);
}

async function expectReadableCardsAndRows(page: Page, route: string) {
  const issues = await page
    .locator(
      [
        "main article",
        "main .record-card",
        "main .tableish__row",
        "main .detail-row",
        "main .metric-card",
        "main .status-card",
        "main label.form-field",
      ].join(", "),
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
          return [];
        }

        const text = (element.textContent || "").trim().replace(/\s+/g, " ");
        const failures: string[] = [];
        if (element.scrollWidth > element.clientWidth + 2) {
          failures.push(`content clips horizontally: ${text.slice(0, 90)}`);
        }
        if (rect.width < 260 && text.length > 180 && !element.closest("form")) {
          failures.push(`dense narrow card has too much visible text: ${text.slice(0, 90)}`);
        }
        return failures;
      }),
    );

  expect(issues, `${route} should keep cards, rows, and form fields readable`).toEqual([]);
}

async function expectNoButtonCrowding(page: Page, route: string) {
  const issues = await page.locator("main button, main a.button, main summary").evaluateAll((controls) =>
    controls.flatMap((control) => {
      const rect = control.getBoundingClientRect();
      const style = window.getComputedStyle(control);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }

      const text = (control.textContent || control.getAttribute("aria-label") || control.tagName).trim().replace(/\s+/g, " ");
      const failures: string[] = [];
      if (control.scrollWidth > control.clientWidth + 2) {
        failures.push(`control text is clipped: ${text}`);
      }
      if (rect.height < 32 && !["SUMMARY"].includes(control.tagName)) {
        failures.push(`control is too short for comfortable clicking: ${text}`);
      }
      if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
        failures.push(`control is outside viewport: ${text}`);
      }
      return failures;
    }),
  );

  expect(issues, `${route} should keep action controls comfortable and unclipped`).toEqual([]);
}

async function expectTimeLeavePagePolished(page: Page, route: string) {
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first(), `${route} should render the app shell`).toBeVisible();
  await expect(page.locator("h1").first(), `${route} should expose a page heading`).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await expectCompactTypography(page, route);
  await expectReadableCardsAndRows(page, route);
  await expectNoButtonCrowding(page, route);
  await expectVisibleLinksAreReal(page, route);
  await auditVisibleControls(page, route, 40);
}

test.describe("TL-4 Time & Leave real-user polish pass", () => {
  test("core Time & Leave pages stay smooth at desktop width", async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of timeLeavePolishRoutes) {
      await gotoDemoHrAdmin(page, route);
      await expectTimeLeavePagePolished(page, route);
      await capture(page, route, "desktop");
    }
  });

  test("high-use Time & Leave pages remain readable at tablet width", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 820, height: 1080 });

    for (const route of compactMobileRoutes) {
      await gotoDemoHrAdmin(page, route);
      await expectTimeLeavePagePolished(page, route);
      await capture(page, route, "tablet");
    }
  });

  test("high-use Time & Leave pages remain usable on mobile width", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 390, height: 844 });

    for (const route of compactMobileRoutes) {
      await gotoDemoHrAdmin(page, route);
      await expectTimeLeavePagePolished(page, route);
      await capture(page, route, "mobile");
    }
  });
});
