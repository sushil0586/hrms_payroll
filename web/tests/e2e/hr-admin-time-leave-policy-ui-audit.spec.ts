import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const timeLeavePolicyRoutes = [
  "/hr-admin/attendance-operations",
  "/hr-admin/attendance-records",
  "/hr-admin/attendance-regularizations",
  "/hr-admin/leave-balances",
  "/hr-admin/policies",
  "/hr-admin/policy-assignments",
  "/hr-admin/leave-types",
  "/hr-admin/leave-types/new",
  "/hr-admin/leave-policies",
  "/hr-admin/leave-policies/new",
  "/hr-admin/leave-policy-assignments",
  "/hr-admin/leave-policy-assignments/new",
  "/hr-admin/shifts",
  "/hr-admin/shifts/new",
  "/hr-admin/holiday-calendars",
  "/hr-admin/holiday-calendars/new",
  "/hr-admin/attendance-policies",
  "/hr-admin/attendance-policies/new",
  "/hr-admin/attendance-policy-assignments",
  "/hr-admin/attendance-policy-assignments/new",
  "/hr-admin/employee-shift-assignments",
  "/hr-admin/employee-shift-assignments/new",
  "/hr-admin/shift-roster-templates",
  "/hr-admin/shift-roster-templates/new",
];

const timeLeavePolicyRouteGroups = [
  {
    name: "operations",
    routes: [
      "/hr-admin/attendance-operations",
      "/hr-admin/attendance-records",
      "/hr-admin/attendance-regularizations",
      "/hr-admin/leave-balances",
      "/hr-admin/policies",
      "/hr-admin/policy-assignments",
    ],
  },
  {
    name: "leave setup",
    routes: [
      "/hr-admin/leave-types",
      "/hr-admin/leave-types/new",
      "/hr-admin/leave-policies",
      "/hr-admin/leave-policies/new",
      "/hr-admin/leave-policy-assignments",
      "/hr-admin/leave-policy-assignments/new",
    ],
  },
  {
    name: "attendance setup",
    routes: [
      "/hr-admin/shifts",
      "/hr-admin/shifts/new",
      "/hr-admin/holiday-calendars",
      "/hr-admin/holiday-calendars/new",
      "/hr-admin/attendance-policies",
      "/hr-admin/attendance-policies/new",
    ],
  },
  {
    name: "assignment and roster setup",
    routes: [
      "/hr-admin/attendance-policy-assignments",
      "/hr-admin/attendance-policy-assignments/new",
      "/hr-admin/employee-shift-assignments",
      "/hr-admin/employee-shift-assignments/new",
      "/hr-admin/shift-roster-templates",
      "/hr-admin/shift-roster-templates/new",
    ],
  },
];

const timeLeavePolicyPathPatterns = [
  ...timeLeavePolicyRoutes.map((route) => new RegExp(`^${route.replaceAll("/", "\\/")}$`)),
  /^\/hr-admin\/attendance-records\/[^/]+\/edit$/,
  /^\/hr-admin\/attendance-regularizations\/[^/]+\/review$/,
  /^\/hr-admin\/attendance-policies\/[^/]+\/edit$/,
  /^\/hr-admin\/attendance-policy-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/employee-shift-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/holiday-calendars\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-policies\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-policy-assignments\/[^/]+\/edit$/,
  /^\/hr-admin\/leave-types\/[^/]+\/edit$/,
  /^\/hr-admin\/shift-roster-templates\/[^/]+\/edit$/,
  /^\/hr-admin\/shifts\/[^/]+\/edit$/,
];

const dynamicTimeLeavePolicyRoutes = [
  {
    name: "attendance record edit",
    sourceRoute: "/hr-admin/attendance-records",
    actionName: "Edit record",
    expectedUrl: /\/hr-admin\/attendance-records\?.*editRecord=[^&]+/,
  },
  {
    name: "attendance regularization review",
    sourceRoute: "/hr-admin/attendance-regularizations",
    actionName: "Review request",
    expectedUrl: /\/hr-admin\/attendance-regularizations\?.*reviewRegularization=[^&]+/,
  },
  {
    name: "attendance policy edit",
    sourceRoute: "/hr-admin/attendance-policies",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/attendance-policies\/[^/]+\/edit/,
  },
  {
    name: "attendance assignment edit",
    sourceRoute: "/hr-admin/attendance-policy-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/attendance-policy-assignments\/[^/]+\/edit/,
  },
  {
    name: "employee shift assignment edit",
    sourceRoute: "/hr-admin/employee-shift-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/employee-shift-assignments\/[^/]+\/edit/,
  },
  {
    name: "holiday calendar edit",
    sourceRoute: "/hr-admin/holiday-calendars",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/holiday-calendars\/[^/]+\/edit/,
  },
  {
    name: "leave policy edit",
    sourceRoute: "/hr-admin/leave-policies",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-policies\?.*editLeavePolicy=[^&]+/,
  },
  {
    name: "leave assignment edit",
    sourceRoute: "/hr-admin/leave-policy-assignments",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-policy-assignments\?.*editLeaveAssignment=[^&]+/,
  },
  {
    name: "leave type edit",
    sourceRoute: "/hr-admin/leave-types",
    actionName: "Edit",
    expectedUrl: /\/hr-admin\/leave-types\?.*editLeaveType=[^&]+/,
  },
  {
    name: "roster template edit",
    sourceRoute: "/hr-admin/shift-roster-templates",
    actionName: "Edit template",
    expectedUrl: /\/hr-admin\/shift-roster-templates\?.*editRoster=[^&]+/,
  },
  {
    name: "shift edit",
    sourceRoute: "/hr-admin/shifts",
    actionName: "Edit shift",
    expectedUrl: /\/hr-admin\/shifts\?.*editShift=[^&]+/,
  },
];

function normalizeTimeLeavePolicyHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!timeLeavePolicyPathPatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisibleTimeLeavePolicyLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        const hiddenByClosedDisclosure = Boolean(link.closest("details:not([open])") && link.tagName !== "SUMMARY");
        return !hiddenByClosedDisclosure && rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [
    ...new Set(hrefs.map((href) => normalizeTimeLeavePolicyHref(href, page.url())).filter((href): href is string => Boolean(href))),
  ];

  for (const href of normalizedHrefs) {
    const response = await page.request.get(href, { failOnStatusCode: false, maxRedirects: 2 });
    expect(response.status(), `${route} exposes a time/leave/policy link that does not open cleanly: ${href}`).toBeLessThan(400);
  }
}

async function expectNoVisibleControlCollisions(page: Page, route: string) {
  const activeDialog = page.getByRole("dialog").last();
  const controlRoot = (await activeDialog.isVisible().catch(() => false)) ? activeDialog : page.locator("main");
  const collisions = await controlRoot.locator("button, a.button, input:not([type='hidden']), select, textarea, summary").evaluateAll((elements) => {
    function clippedRect(element: Element) {
      const rect = element.getBoundingClientRect();
      let left = rect.left;
      let right = rect.right;
      let top = rect.top;
      let bottom = rect.bottom;
      let parent = element.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        const clipsX = /(auto|scroll|hidden|clip)/.test(style.overflowX);
        const clipsY = /(auto|scroll|hidden|clip)/.test(style.overflowY);
        if (clipsX || clipsY) {
          const parentRect = parent.getBoundingClientRect();
          if (clipsX) {
            left = Math.max(left, parentRect.left);
            right = Math.min(right, parentRect.right);
          }
          if (clipsY) {
            top = Math.max(top, parentRect.top);
            bottom = Math.min(bottom, parentRect.bottom);
          }
        }
        parent = parent.parentElement;
      }
      left = Math.max(left, 0);
      right = Math.min(right, document.documentElement.clientWidth);
      top = Math.max(top, 0);
      bottom = Math.min(bottom, document.documentElement.clientHeight);
      return { left, right, top, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top), original: rect };
    }

    const boxes = elements.flatMap((element, index) => {
      if (element.closest("details:not([open])") && element.tagName !== "SUMMARY") {
        return [];
      }
      const rect = clippedRect(element);
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }
      return [
        {
          index,
          label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim(),
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          area: rect.width * rect.height,
          originalLeft: rect.original.left,
          originalRight: rect.original.right,
        },
      ];
    });

    const issues: string[] = [];
    for (const box of boxes) {
      if (box.originalLeft < -1 || box.originalRight > document.documentElement.clientWidth + 1) {
        issues.push(`${box.label || box.index} is outside the viewport`);
      }
    }
    for (let firstIndex = 0; firstIndex < boxes.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < boxes.length; secondIndex += 1) {
        const first = boxes[firstIndex];
        const second = boxes[secondIndex];
        const overlapWidth = Math.max(0, Math.min(first.right, second.right) - Math.max(first.left, second.left));
        const overlapHeight = Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top));
        const overlapArea = overlapWidth * overlapHeight;
        const threshold = Math.min(first.area, second.area) * 0.18;
        if (overlapArea > 24 && overlapArea > threshold) {
          issues.push(`${first.label || first.index} overlaps ${second.label || second.index}`);
        }
      }
    }
    return issues.slice(0, 8);
  });

  expect(collisions, `${route} has clipped or overlapping time/leave/policy controls`).toEqual([]);
}

async function auditCurrentTimeLeavePolicyPage(page: Page, route: string) {
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 64);
  await expectVisibleLinksAreReal(page, route);
  await expectNoVisibleControlCollisions(page, route);
  await expectVisibleTimeLeavePolicyLinksHealthy(page, route);
}

async function auditTimeLeavePolicyRoute(page: Page, route: string) {
  await gotoAuthenticated(page, route);
  await auditCurrentTimeLeavePolicyPage(page, route);
}

async function auditLinkedTimeLeavePolicyRoute(
  page: Page,
  sourceRoute: string,
  actionName: string,
  expectedUrl: RegExp,
  routeName: string,
) {
  await gotoAuthenticated(page, sourceRoute);
  const action = page.getByRole("link", { name: actionName, exact: true }).first();
  if ((await action.count()) === 0) {
    await auditCurrentTimeLeavePolicyPage(page, sourceRoute);
    return;
  }
  await expect(action, `${sourceRoute} should expose a ${routeName} link`).toBeVisible();
  const actionHref = await action.getAttribute("href");
  if (routeName === "leave policy edit") {
    expect(actionHref, "leave policy edit action should target the compact query-modal route").toMatch(/^\/hr-admin\/leave-policies\?editLeavePolicy=[^&]+$/);
    await page.goto(actionHref!, { waitUntil: "domcontentloaded" });
  } else {
    await action.click();
  }
  await expect(page, `${routeName} should open the intended child page`).toHaveURL(expectedUrl);

  if (routeName === "attendance record edit") {
    const recordId = new URL(actionHref ?? "", page.url()).searchParams.get("editRecord");
    expect(recordId, "attendance edit link should preserve the selected record ID").toBeTruthy();

    const dialog = page.getByRole("dialog", { name: /^Edit / });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("form.attendance-record-form")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save attendance record" })).toBeVisible();
    const notes = dialog.getByRole("textbox", { name: "Notes" });
    const persistedNote = `P3-0465 persistence ${recordId}`;
    await notes.fill(persistedNote);

    const saveResponse = page.waitForResponse((response) =>
      response.request().method() === "PATCH"
      && new URL(response.url()).pathname.endsWith(`/api/hr-admin/attendance-records/${recordId}`),
    );
    await dialog.getByRole("button", { name: "Save attendance record" }).click();
    expect((await saveResponse).ok(), "attendance record PATCH should succeed").toBe(true);
    await expect(page).not.toHaveURL(/editRecord=/);

    await page.goto(actionHref!);
    await expect(page).toHaveURL(new RegExp(`editRecord=${recordId}`));
    await expect(page.getByRole("dialog").getByRole("textbox", { name: "Notes" })).toHaveValue(persistedNote);
  }
  if (routeName === "attendance regularization review") {
    const regularizationId = new URL(actionHref ?? "", page.url()).searchParams.get("reviewRegularization");
    expect(regularizationId, "regularization review link should preserve the selected request ID").toBeTruthy();
    expect(new URL(page.url()).searchParams.get("reviewRegularization")).toBe(regularizationId);
    await expect(page.getByRole("heading", { name: "Regularization detail" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Quick review" })).toBeVisible();
  }
  if (routeName === "leave policy edit") {
    const policyId = new URL(actionHref ?? "", page.url()).searchParams.get("editLeavePolicy");
    expect(policyId, "leave policy edit link should preserve the selected policy ID").toBeTruthy();

    const dialog = page.getByRole("dialog", { name: "Edit leave policy" });
    await expect(dialog).toBeVisible();
    const nameInput = dialog.getByRole("textbox", { name: /^Name/ });
    await expect(nameInput, "selected leave policy name should be directly editable").toBeEnabled();
    await expect(dialog.getByRole("button", { name: "Save changes" }), "selected leave policy should allow direct save").toBeEnabled();
    await expect.poll(() => nameInput.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactProps")),
    ), { message: "leave policy form should be hydrated before editing" }).toBe(true);
    const originalName = await nameInput.inputValue();
    const persistedName = `${originalName} P3-0465`;
    await nameInput.fill(persistedName);

    const savePolicy = async (expectedName: string) => {
      const responsePromise = page.waitForResponse((response) =>
        response.request().method() === "PATCH"
        && new URL(response.url()).pathname.endsWith(`/api/hr-admin/leave-policies/${policyId}`),
      );
      await dialog.getByRole("button", { name: "Save changes" }).click();
      const response = await responsePromise;
      expect(response.ok(), "leave policy PATCH should succeed").toBe(true);
      expect((await response.json()).name, "leave policy PATCH should return the edited policy name").toBe(expectedName);
      await expect(page).not.toHaveURL(/editLeavePolicy=/);
    };

    await savePolicy(persistedName);
    await page.goto(actionHref!);
    await expect(page.getByRole("dialog", { name: "Edit leave policy" }).getByRole("textbox", { name: /^Name/ })).toHaveValue(persistedName);

    await nameInput.fill(originalName);
    await savePolicy(originalName);
  }
  await auditCurrentTimeLeavePolicyPage(page, routeName);
}

test.describe("HR Admin time, leave, and policy UI audit", () => {
  for (const routeGroup of timeLeavePolicyRouteGroups) {
    test(`certifies ${routeGroup.name} page layout, controls, and internal links`, async ({ page }) => {
      test.setTimeout(360_000);
      await page.setViewportSize({ width: 1440, height: 960 });

      for (const route of routeGroup.routes) {
        await auditTimeLeavePolicyRoute(page, route);
      }
    });
  }

  test("certifies time/leave/policy dynamic edit links", async ({ page }) => {
    test.setTimeout(600_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const dynamicRoute of dynamicTimeLeavePolicyRoutes) {
      await auditLinkedTimeLeavePolicyRoute(
        page,
        dynamicRoute.sourceRoute,
        dynamicRoute.actionName,
        dynamicRoute.expectedUrl,
        dynamicRoute.name,
      );
    }
  });
});
