import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { employee, gotoAuthenticated, hrAdmin, manager, platformAdmin, type Persona } from "../helpers/staging-auth";

type Phase8Route = {
  path: string;
  heading: string | RegExp;
  persona?: Persona;
  label: string;
  expectsSidebar?: boolean;
};

type UiIssue = {
  kind: string;
  detail: string;
};

const viewports = [
  { label: "desktop", width: 1440, height: 900 },
  { label: "mobile", width: 390, height: 844 },
];

const routes: Phase8Route[] = [
  { path: "/", heading: "Choose your workspace", label: "workspace-chooser" },
  { path: "/hr-admin", heading: "Control center", persona: hrAdmin, label: "hr-admin-control", expectsSidebar: true },
  { path: "/hr-admin/employees", heading: "Employees", persona: hrAdmin, label: "hr-admin-employees", expectsSidebar: true },
  { path: "/hr-admin/saas-control-plane", heading: "SaaS Control Plane", persona: hrAdmin, label: "saas-control-plane", expectsSidebar: true },
  { path: "/tenant-admin", heading: "Tenant Admin Console", persona: hrAdmin, label: "tenant-admin" },
  { path: "/platform-admin", heading: "Platform Admin", persona: platformAdmin, label: "platform-admin" },
  { path: "/ess/payslips", heading: "Payslips", persona: employee, label: "ess-payslips", expectsSidebar: true },
  { path: "/mss/approvals", heading: "Manager inbox", persona: manager, label: "mss-approvals", expectsSidebar: true },
  { path: "/support", heading: "Support Console", persona: platformAdmin, label: "support-console" },
];

async function capturePhase8Step(page: Page, testInfo: TestInfo, routeLabel: string, viewportLabel: string) {
  const path = testInfo.outputPath(`phase8a-workspace-shell/${viewportLabel}-${routeLabel}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function openRoute(page: Page, route: Phase8Route) {
  if (route.persona) {
    await gotoAuthenticated(page, route.path, route.persona);
    return;
  }
  await page.goto(route.path, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
}

async function expectWorkspaceShellAccessible(page: Page, route: Phase8Route) {
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();

  const visibleButtons = page.locator("button:visible");
  const visibleLinks = page.locator("a[href]:visible");
  const buttonCount = await visibleButtons.count();
  const linkCount = await visibleLinks.count();
  expect(buttonCount + linkCount, `${route.path} should expose at least one interactive command`).toBeGreaterThan(0);

  if (route.expectsSidebar) {
    await expect(page.locator("aside").first()).toBeVisible();
    await expect(page.locator("nav[aria-label]").first()).toBeVisible();
  }

  const firstFocusable = page.locator("a[href], button, input, select, textarea, [tabindex]:not([tabindex='-1'])").locator("visible=true").first();
  if (await firstFocusable.count()) {
    await firstFocusable.focus();
    await expect(firstFocusable).toBeFocused();
  }
}

async function collectUiIssues(page: Page): Promise<UiIssue[]> {
  return page.evaluate(() => {
    const issues: UiIssue[] = [];
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

    function isVisible(element: Element, rect: DOMRect) {
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity || "1") > 0.01;
    }

    function accessibleName(element: Element) {
      const ariaLabel = element.getAttribute("aria-label") || element.getAttribute("title");
      if (ariaLabel?.trim()) {
        return ariaLabel.trim();
      }
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const label = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
          .trim();
        if (label) {
          return label;
        }
      }
      const id = element.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim();
        if (label) {
          return label;
        }
      }
      const parentLabel = element.closest("label")?.textContent?.trim();
      if (parentLabel) {
        return parentLabel;
      }
      return (element.textContent || element.getAttribute("placeholder") || "").trim();
    }

    function labelFor(element: Element) {
      return (accessibleName(element) || element.getAttribute("href") || element.tagName).replace(/\s+/g, " ").slice(0, 90);
    }

    function isInsideHorizontalScroller(element: Element) {
      let current = element.parentElement;
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current);
        if (["auto", "scroll"].includes(style.overflowX) && current.scrollWidth > current.clientWidth + 2) {
          return true;
        }
        current = current.parentElement;
      }
      return false;
    }

    const viewportWidth = document.documentElement.clientWidth;
    const interactive = Array.from(document.querySelectorAll(interactiveSelector))
      .map((element) => ({ element, rect: element.getBoundingClientRect() }))
      .filter(({ element, rect }) => isVisible(element, rect));

    for (const { element, rect } of interactive) {
      const tagName = element.tagName.toLowerCase();
      const inputType = element.getAttribute("type") || "";
      const isHiddenInput = tagName === "input" && inputType === "hidden";
      if (!isHiddenInput && !accessibleName(element)) {
        issues.push({ kind: "missing-accessible-name", detail: `${element.tagName} has no accessible name` });
      }
      if ((rect.left < -2 || rect.right > viewportWidth + 2) && !isInsideHorizontalScroller(element)) {
        issues.push({ kind: "outside-viewport", detail: `${labelFor(element)} extends ${Math.round(rect.left)}-${Math.round(rect.right)} beyond ${viewportWidth}` });
      }
      const isNativeSmallInput = tagName === "input" && ["checkbox", "radio", "file"].includes(inputType);
      const isTextInput = ["input", "select", "textarea"].includes(tagName);
      if (!isNativeSmallInput && isTextInput && (rect.width < 44 || rect.height < 28)) {
        issues.push({ kind: "tiny-field", detail: `${labelFor(element)} is ${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
      if ((tagName === "button" || element.getAttribute("role") === "button") && rect.width < 20 && rect.height < 20) {
        issues.push({ kind: "tiny-command", detail: `${labelFor(element)} is ${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
    }

    if (!document.querySelector("main")) {
      issues.push({ kind: "missing-main", detail: "Page has no main landmark" });
    }
    if (document.querySelectorAll("h1").length !== 1) {
      issues.push({ kind: "h1-count", detail: `Page has ${document.querySelectorAll("h1").length} h1 elements` });
    }

    return issues.slice(0, 20);
  });
}

test.describe("Phase 8A workspace shell UX and accessibility", () => {
  for (const viewport of viewports) {
    test(`key workspaces expose accessible modern shell at ${viewport.label}`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      for (const route of routes) {
        await openRoute(page, route);
        await expectPageReady(page, route.heading);
        await expectWorkspaceShellAccessible(page, route);
        await expectNoHorizontalOverflow(page);
        const issues = await collectUiIssues(page);
        expect(issues, `${route.path} UX/accessibility issues at ${viewport.label}`).toEqual([]);
        await capturePhase8Step(page, testInfo, route.label, viewport.label);
      }
    });
  }
});
