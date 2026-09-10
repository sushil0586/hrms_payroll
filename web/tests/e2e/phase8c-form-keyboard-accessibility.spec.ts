import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { expect, type Locator, type Page, test, type TestInfo } from "@playwright/test";

import { expectNoHorizontalOverflow, expectPageReady } from "../helpers/assertions";
import { gotoAuthenticated } from "../helpers/staging-auth";

type FormRoute = {
  path: string;
  heading: string;
  consoleHeading: string;
  expectedForms: Array<{
    testId: string;
    label: string;
    minimumControls: number;
  }>;
};

type ControlIssue = {
  kind: string;
  detail: string;
};

const formRoutes: FormRoute[] = [
  {
    path: "/hr-admin/salary-setup",
    heading: "Salary Setup",
    consoleHeading: "Salary setup controls",
    expectedForms: [
      { testId: "salary-component-form", label: "Salary component form", minimumControls: 14 },
      { testId: "salary-structure-form", label: "Salary structure form", minimumControls: 8 },
      { testId: "salary-version-form", label: "Salary structure version form", minimumControls: 9 },
      { testId: "salary-line-form", label: "Salary structure component line form", minimumControls: 10 },
      { testId: "salary-assignment-form", label: "Employee salary assignment form", minimumControls: 9 },
    ],
  },
  {
    path: "/hr-admin/payroll-setup",
    heading: "Payroll Setup",
    consoleHeading: "Payroll setup controls",
    expectedForms: [
      { testId: "payroll-calendar-form", label: "Payroll calendar form", minimumControls: 9 },
      { testId: "payroll-period-form", label: "Payroll period form", minimumControls: 9 },
      { testId: "pay-group-form", label: "Pay group form", minimumControls: 12 },
      { testId: "pay-group-assignment-form", label: "Pay group assignment form", minimumControls: 7 },
    ],
  },
  {
    path: "/hr-admin/payroll-inputs",
    heading: "Payroll Inputs",
    consoleHeading: "Payroll input operations",
    expectedForms: [
      { testId: "payroll-run-form", label: "Payroll run form", minimumControls: 10 },
      { testId: "payroll-input-snapshot-form", label: "Payroll input snapshot form", minimumControls: 13 },
      { testId: "payroll-input-lock-form", label: "Payroll input lock panel", minimumControls: 1 },
    ],
  },
  {
    path: "/hr-admin/payroll-statutory",
    heading: "Payroll Statutory",
    consoleHeading: "Statutory setup controls",
    expectedForms: [
      { testId: "statutory-pack-form", label: "Statutory pack form", minimumControls: 12 },
      { testId: "statutory-component-form", label: "Statutory component form", minimumControls: 11 },
      { testId: "statutory-slab-form", label: "Statutory slab form", minimumControls: 13 },
      { testId: "statutory-registration-form", label: "Employer statutory registration form", minimumControls: 13 },
      { testId: "statutory-filing-form", label: "Statutory filing calendar form", minimumControls: 14 },
      { testId: "statutory-profile-form", label: "Employee statutory profile form", minimumControls: 21 },
      { testId: "statutory-declaration-form", label: "Employee statutory declaration form", minimumControls: 14 },
      { testId: "statutory-declaration-item-form", label: "Employee statutory declaration item form", minimumControls: 14 },
    ],
  },
  {
    path: "/hr-admin/probation-reviews/new",
    heading: "Create probation review",
    consoleHeading: "Create probation review",
    expectedForms: [
      { testId: "probation-review-form", label: "Probation review form", minimumControls: 10 },
    ],
  },
  {
    path: "/hr-admin/movements/new",
    heading: "Create movement",
    consoleHeading: "Create movement event",
    expectedForms: [
      { testId: "movement-event-form", label: "Movement event form", minimumControls: 13 },
    ],
  },
  {
    path: "/hr-admin/exits/new",
    heading: "Create exit record",
    consoleHeading: "Create exit record",
    expectedForms: [
      { testId: "exit-record-form", label: "Exit record form", minimumControls: 16 },
    ],
  },
  {
    path: "/hr-admin/attendance-records",
    heading: "Attendance records review window.",
    consoleHeading: "Attendance records",
    expectedForms: [
      { testId: "attendance-records-toolbar", label: "Attendance records toolbar", minimumControls: 11 },
    ],
  },
  {
    path: "/hr-admin/notifications",
    heading: "Notification queue",
    consoleHeading: "Notifications",
    expectedForms: [
      { testId: "notification-queue-toolbar", label: "Notification queue toolbar", minimumControls: 11 },
    ],
  },
  {
    path: "/tenant-admin",
    heading: "Tenant Admin Console",
    consoleHeading: "Scoped support grants",
    expectedForms: [
      { testId: "tenant-support-access-form", label: "Tenant support access form", minimumControls: 7 },
    ],
  },
];

const visibleControlSelector = [
  "a[href]",
  "button:not(:disabled)",
  "input:not([type='hidden']):not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  "[role='button']",
  "[role='link']",
  "[role='combobox']",
  "[role='checkbox']",
].join(",");

function focusableControls(scope: Locator) {
  return scope.locator(visibleControlSelector).locator("visible=true");
}

async function capturePhase8CStep(page: Page, testInfo: TestInfo, routePath: string) {
  const safeName = routePath.replace(/^\//, "").replace(/[/?=&]+/g, "-") || "home";
  const path = testInfo.outputPath(`phase8c-form-keyboard-accessibility/${safeName}.png`);
  await mkdir(dirname(path), { recursive: true });
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
}

async function collectFormControlIssues(form: Locator): Promise<ControlIssue[]> {
  return form.evaluate((formElement, selector) => {
    const issues: ControlIssue[] = [];
    const viewportWidth = document.documentElement.clientWidth;
    const controls = Array.from(formElement.querySelectorAll(selector));

    function visibleRect(element: Element) {
      let rect = element.getBoundingClientRect();
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const clips = ["auto", "scroll", "hidden", "clip"].includes(style.overflowX) || ["auto", "scroll", "hidden", "clip"].includes(style.overflowY);
        if (clips) {
          rect = parent.getBoundingClientRect();
          left = Math.max(left, rect.left);
          right = Math.min(right, rect.right);
          top = Math.max(top, rect.top);
          bottom = Math.min(bottom, rect.bottom);
        }
        parent = parent.parentElement;
      }
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
    }

    function accessibleName(element: Element) {
      const ariaLabel = element.getAttribute("aria-label") || element.getAttribute("title");
      if (ariaLabel?.trim()) return ariaLabel.trim();
      const labelledBy = element.getAttribute("aria-labelledby");
      if (labelledBy) {
        const label = labelledBy
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" ")
          .trim();
        if (label) return label;
      }
      const id = element.getAttribute("id");
      if (id) {
        const label = document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent?.trim();
        if (label) return label;
      }
      const parentLabel = element.closest("label")?.textContent?.trim();
      if (parentLabel) return parentLabel;
      return (element.textContent || element.getAttribute("placeholder") || "").trim();
    }

    function labelFor(element: Element) {
      return (accessibleName(element) || element.tagName).replace(/\s+/g, " ").slice(0, 90);
    }

    for (const element of controls) {
      const style = window.getComputedStyle(element);
      const rawRect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rawRect.width <= 0 || rawRect.height <= 0) {
        continue;
      }

      const rect = visibleRect(element);
      if (rect.width <= 1 || rect.height <= 1) {
        continue;
      }

      if (!accessibleName(element)) {
        issues.push({ kind: "missing-accessible-name", detail: `${element.tagName} has no accessible name` });
      }

      if (rect.left < -2 || rect.right > viewportWidth + 2) {
        issues.push({ kind: "outside-viewport", detail: `${labelFor(element)} extends ${Math.round(rect.left)}-${Math.round(rect.right)} of ${viewportWidth}` });
      }

      const tagName = element.tagName.toLowerCase();
      const inputType = element.getAttribute("type") || "";
      const isNativeSmallInput = tagName === "input" && ["checkbox", "radio", "file"].includes(inputType);
      const isTextField = ["input", "select", "textarea"].includes(tagName);
      if (!isNativeSmallInput && isTextField && (rect.width < 44 || rect.height < 28)) {
        issues.push({ kind: "tiny-field", detail: `${labelFor(element)} is ${Math.round(rect.width)}x${Math.round(rect.height)}` });
      }
    }

    return issues.slice(0, 30);
  }, visibleControlSelector);
}

async function expectFormControlsAreFocusable(form: Locator, expectedLabel: string, minimumControls: number) {
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("aria-label", expectedLabel);

  const controls = focusableControls(form);
  const count = await controls.count();
  expect(count, `${expectedLabel} should expose granular keyboard controls`).toBeGreaterThanOrEqual(minimumControls);

  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    await control.scrollIntoViewIfNeeded();
    await control.focus();
    await expect(control, `${expectedLabel} control ${index + 1} should receive focus`).toBeFocused();
  }

  const issues = await collectFormControlIssues(form);
  expect(issues, `${expectedLabel} control accessibility/layout issues`).toEqual([]);
}

async function expectTabOrderMovesForward(page: Page, form: Locator, expectedLabel: string) {
  const controls = focusableControls(form);
  const count = await controls.count();
  const sampleSize = Math.min(count, 8);
  expect(sampleSize, `${expectedLabel} needs enough controls for tab-order sampling`).toBeGreaterThan(0);

  await controls.evaluateAll((items) => {
    items.forEach((item, index) => item.setAttribute("data-phase8c-tab-index", String(index)));
  });
  await controls.first().scrollIntoViewIfNeeded();
  await controls.first().focus();
  await expect(controls.first()).toBeFocused();

  const visited = new Set([0]);
  let previousIndex = 0;
  for (let step = 1; step < sampleSize; step += 1) {
    await page.keyboard.press("Tab");
    const activeIndex = await form.evaluate((formElement) => {
      const active = document.activeElement;
      if (!active || !formElement.contains(active)) {
        return -1;
      }
      return Number(active.getAttribute("data-phase8c-tab-index") ?? "-1");
    });
    expect(activeIndex, `${expectedLabel} tab stop ${step + 1} should remain inside the form`).toBeGreaterThanOrEqual(0);
    expect(activeIndex, `${expectedLabel} tab order should not move backward`).toBeGreaterThanOrEqual(previousIndex);
    visited.add(activeIndex);
    previousIndex = Math.max(previousIndex, activeIndex);
  }
  expect(visited.size, `${expectedLabel} tab order should reach multiple distinct controls`).toBeGreaterThanOrEqual(Math.min(3, sampleSize));
}

test.describe("Phase 8C form keyboard and accessibility certification", () => {
  for (const route of formRoutes) {
    test(`${route.heading} dense forms are keyboard reachable and named`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoAuthenticated(page, route.path);
      await expectPageReady(page, route.heading);
      await expect(page.getByRole("heading", { name: route.consoleHeading }).first()).toBeVisible();
      for (const formExpectation of route.expectedForms) {
        const form = page.getByTestId(formExpectation.testId);
        await expectFormControlsAreFocusable(form, formExpectation.label, formExpectation.minimumControls);
        await expectTabOrderMovesForward(page, form, formExpectation.label);
      }

      await expectNoHorizontalOverflow(page);
      await capturePhase8CStep(page, testInfo, route.path);
    });
  }
});
