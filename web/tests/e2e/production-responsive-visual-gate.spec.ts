import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import type { RouteExpectation } from "../helpers/routes";
import { gotoAuthenticated } from "../helpers/staging-auth";

type LaunchViewport = {
  label: string;
  width: number;
  height: number;
};

type LayoutIssue = {
  kind: "viewport" | "overlap" | "tiny-control";
  detail: string;
};

const launchViewports: LaunchViewport[] = [
  { label: "wide-desktop", width: 1920, height: 1080 },
  { label: "desktop", width: 1440, height: 900 },
  { label: "launch-laptop", width: 1366, height: 768 },
  { label: "compact-laptop", width: 1280, height: 720 },
  { label: "tablet", width: 820, height: 1180 },
  { label: "mobile", width: 390, height: 844 },
];

const launchRoutes: RouteExpectation[] = [
  { path: "/", heading: "Choose your workspace" },
  { path: "/hr-admin", heading: "Control center" },
  { path: "/hr-admin/payroll-readiness", heading: "Payroll Readiness" },
  { path: "/hr-admin/payroll-inputs", heading: "Payroll Inputs" },
  { path: "/hr-admin/payroll-calculations", heading: "Payroll Calculations" },
  { path: "/hr-admin/payroll-review", heading: "Payroll Review" },
  { path: "/hr-admin/payroll-outputs", heading: "Payroll Outputs" },
  { path: "/hr-admin/payroll-handoff", heading: "Payroll Handoff" },
  { path: "/hr-admin/payroll-providers", heading: "Payroll Providers" },
  { path: "/hr-admin/notifications?retry_state=retry_ready", heading: "Notification queue" },
  { path: "/hr-admin/notification-delivery", heading: "Notification delivery" },
  { path: "/tenant-admin", heading: "Tenant Admin Console" },
  { path: "/tenant-admin/security-readiness", heading: "Enterprise Security Readiness" },
  { path: "/support", heading: "Support Console" },
  { path: "/ess/payslips", heading: "Payslips" },
  { path: "/ess/notifications?subject_type=payroll_payslip", heading: "Notifications" },
  { path: "/mss/approvals", heading: "Manager inbox" },
];

const isRemoteStagingRun = /^https?:\/\//.test(process.env.PLAYWRIGHT_BASE_URL || "");
const responsiveGateTimeoutMs = isRemoteStagingRun ? 300_000 : 120_000;

function safeScreenshotName(routePath: string, viewportLabel: string) {
  const routeName = routePath === "/"
    ? "home"
    : routePath
      .replace(/^\//, "")
      .replace(/[/?=&]+/g, "-")
      .replace(/-+$/g, "");
  return `${viewportLabel}-${routeName}.png`;
}

async function captureResponsiveStep(page: Page, testInfo: TestInfo, routePath: string, viewportLabel: string) {
  const path = testInfo.outputPath(`production-responsive-visual/${safeScreenshotName(routePath, viewportLabel)}`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function collectLayoutIssues(page: Page): Promise<LayoutIssue[]> {
  return page.evaluate(() => {
    const issues: LayoutIssue[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const interactiveSelector = [
      "a[href]",
      "button",
      "input",
      "select",
      "textarea",
      "[role='button']",
      "[role='link']",
      "[role='combobox']",
      "[role='checkbox']",
    ].join(",");

    function labelFor(element: Element) {
      return (
        element.getAttribute("aria-label") ||
        element.getAttribute("name") ||
        element.textContent ||
        element.getAttribute("href") ||
        element.tagName
      ).trim().replace(/\s+/g, " ").slice(0, 90);
    }

    function isVisible(element: Element, rect: DOMRect) {
      const style = window.getComputedStyle(element);
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        Number(style.opacity || "1") > 0.01
      );
    }

    function isInsideHorizontalScroller(element: Element) {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const allowsHorizontalScroll = ["auto", "scroll"].includes(style.overflowX);
        if (allowsHorizontalScroll && current.scrollWidth > current.clientWidth + 2) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }

    function visibleRectFor(element: Element, rect: DOMRect) {
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        const clipsContent = ["auto", "scroll", "hidden", "clip"].includes(style.overflowY) || ["auto", "scroll", "hidden", "clip"].includes(style.overflowX);
        if (clipsContent) {
          const ancestorRect = current.getBoundingClientRect();
          left = Math.max(left, ancestorRect.left);
          right = Math.min(right, ancestorRect.right);
          top = Math.max(top, ancestorRect.top);
          bottom = Math.min(bottom, ancestorRect.bottom);
        }
        current = current.parentElement;
      }
      return new DOMRect(left, top, Math.max(0, right - left), Math.max(0, bottom - top));
    }

    const controls = Array.from(document.querySelectorAll(interactiveSelector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { element, rawRect: rect, rect: visibleRectFor(element, rect), label: labelFor(element) };
      })
      .filter((entry) => isVisible(entry.element, entry.rawRect) && entry.rect.width > 1 && entry.rect.height > 1);

    for (const entry of controls) {
      const { rect } = entry;
      if ((rect.left < -2 || rect.right > viewportWidth + 2) && !isInsideHorizontalScroller(entry.element)) {
        issues.push({
          kind: "viewport",
          detail: `${entry.label || entry.element.tagName} extends outside viewport: ${Math.round(rect.left)}-${Math.round(rect.right)} of ${viewportWidth}`,
        });
      }
      const tagName = entry.element.tagName.toLowerCase();
      const inputType = entry.element.getAttribute("type");
      const isNativeChoiceInput = tagName === "input" && ["checkbox", "radio"].includes(inputType || "");
      const isTextInput = ["input", "select", "textarea"].includes(tagName);
      const isTinyButtonLike = ["a", "button"].includes(tagName) || entry.element.getAttribute("role") === "button";
      if (!isNativeChoiceInput && ((isTextInput && (rect.width < 44 || rect.height < 28)) || (isTinyButtonLike && rect.width < 20 && rect.height < 20))) {
        issues.push({
          kind: "tiny-control",
          detail: `${entry.label || entry.element.tagName} is too small: ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    }

    for (let leftIndex = 0; leftIndex < controls.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < controls.length; rightIndex += 1) {
        const left = controls[leftIndex];
        const right = controls[rightIndex];
        if (left.element.contains(right.element) || right.element.contains(left.element)) {
          continue;
        }
        const overlapWidth = Math.min(left.rect.right, right.rect.right) - Math.max(left.rect.left, right.rect.left);
        const overlapHeight = Math.min(left.rect.bottom, right.rect.bottom) - Math.max(left.rect.top, right.rect.top);
        if (overlapWidth <= 0 || overlapHeight <= 0) {
          continue;
        }
        const overlapArea = overlapWidth * overlapHeight;
        const smallerArea = Math.min(left.rect.width * left.rect.height, right.rect.width * right.rect.height);
        if (smallerArea > 0 && overlapArea / smallerArea > 0.2 && overlapArea > 64) {
          issues.push({
            kind: "overlap",
            detail: `${left.label || left.element.tagName} overlaps ${right.label || right.element.tagName}`,
          });
        }
      }
    }

    return issues.slice(0, 12);
  });
}

test.describe("Production responsive visual launch gate", () => {
  for (const viewport of launchViewports) {
    test(`launch-critical screens hold layout at ${viewport.label}`, async ({ page }, testInfo) => {
      test.setTimeout(responsiveGateTimeoutMs);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of launchRoutes) {
        if (route.path === "/") {
          await page.goto(route.path);
        } else {
          await gotoAuthenticated(page, route.path);
        }
        await expectPageReady(page, route.heading);
        await expectNoHorizontalOverflow(page);
        const issues = await collectLayoutIssues(page);
        expect(issues, `${route.path} layout issues at ${viewport.label}`).toEqual([]);
        await captureResponsiveStep(page, testInfo, route.path, viewport.label);
      }
    });
  }
});
