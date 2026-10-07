import { expect, test, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { employee, gotoAuthenticated, hrAdmin, manager, type Persona } from "../helpers/staging-auth";

const viewports = [
  { name: "desktop", width: 1440, height: 960 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const moduleRoutes: Array<{ route: string; persona: Persona; label: string }> = [
  { route: "/ess/leave", persona: employee, label: "ESS leave" },
  { route: "/ess/attendance", persona: employee, label: "ESS attendance" },
  { route: "/ess/documents", persona: employee, label: "ESS documents" },
  { route: "/ess/notifications", persona: employee, label: "ESS notifications" },
  { route: "/mss/approvals", persona: manager, label: "MSS leave approvals" },
  { route: "/mss/approvals?queue=attendance", persona: manager, label: "MSS attendance approvals" },
  { route: "/hr-admin/employee-documents", persona: hrAdmin, label: "HR document queue" },
  { route: "/hr-admin/notifications", persona: hrAdmin, label: "HR notification queue" },
];

async function expectNoControlIssues(page: Page, context: string) {
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, context, 80);
  await expectVisibleLinksAreReal(page, context);
  const clippedControls = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) =>
    elements.flatMap((element) => {
      if (element.closest("details:not([open])") && element.tagName !== "SUMMARY") {
        return [];
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }
      const label = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim();
      const outsideX = rect.left < -2 || rect.right > document.documentElement.clientWidth + 2;
      const clippedText = (element.classList.contains("button") || element.tagName === "BUTTON") && element.scrollWidth > element.clientWidth + 2;
      return outsideX || clippedText ? [`${label || element.tagName} is clipped`] : [];
    }),
  );
  expect(clippedControls, `${context} should not clip visible controls`).toEqual([]);
}

async function openIfVisible(page: Page, buttonName: string | RegExp, dialogName: string | RegExp, context: string) {
  const button = page.getByRole("button", { name: buttonName }).first();
  if (!(await button.isVisible().catch(() => false)) || !(await button.isEnabled().catch(() => false))) {
    return;
  }
  await button.click();
  const dialog = page.getByRole("dialog", { name: dialogName });
  await expect(dialog, `${context} should open ${String(dialogName)} dialog`).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(dialog, `${context} should close ${String(dialogName)} dialog with Escape`).toHaveCount(0);
}

test.describe("Leave attendance documents notifications responsive UX audit", () => {
  for (const viewport of viewports) {
    test(`certifies core modules at ${viewport.name}`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const item of moduleRoutes) {
        await gotoAuthenticated(page, item.route, item.persona);
        await suppressBrowserTestNoise(page);
        await expect(page.locator("main.shell:not(.app-loading-shell)").first(), `${item.label} should render app shell`).toBeVisible();
        await expect(page.locator("h1").first(), `${item.label} should expose a page heading`).toBeVisible();
        await expectNoAppError(page);
        await expectNoControlIssues(page, `${item.label} ${viewport.name}`);
      }

      await gotoAuthenticated(page, "/ess/leave", employee);
      await openIfVisible(page, "Apply leave", "Apply leave", `ESS leave ${viewport.name}`);

      await gotoAuthenticated(page, "/ess/attendance", employee);
      await openIfVisible(page, "Regularize attendance", "Regularize attendance", `ESS attendance ${viewport.name}`);

      await gotoAuthenticated(page, "/mss/approvals", manager);
      await openIfVisible(page, "Review", /Leave approval review|Attendance approval review/, `MSS approval ${viewport.name}`);
    });
  }
});
