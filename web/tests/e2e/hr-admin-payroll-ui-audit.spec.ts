import { expect, type Page, test } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "../helpers/assertions";
import { auditVisibleControls, expectVisibleLinksAreReal } from "../helpers/hr-admin-ui-audit";
import { gotoAuthenticated } from "../helpers/staging-auth";

const payrollCoreRoutes = [
  "/hr-admin/payroll-readiness",
  "/hr-admin/payroll-setup",
  "/hr-admin/salary-setup",
  "/hr-admin/payroll-inputs",
  "/hr-admin/payroll-rules",
  "/hr-admin/payroll-adjustments",
  "/hr-admin/payroll-settlements",
  "/hr-admin/payroll-calculations",
  "/hr-admin/payroll-review",
  "/hr-admin/payroll-outputs",
  "/hr-admin/payroll-handoff",
  "/hr-admin/payroll-statutory",
  "/hr-admin/payroll-providers",
];

const payrollCorePathPatterns = [
  /^\/hr-admin\/payroll-readiness$/,
  /^\/hr-admin\/payroll-setup$/,
  /^\/hr-admin\/salary-setup$/,
  /^\/hr-admin\/payroll-inputs$/,
  /^\/hr-admin\/payroll-rules$/,
  /^\/hr-admin\/payroll-adjustments$/,
  /^\/hr-admin\/payroll-settlements$/,
  /^\/hr-admin\/payroll-calculations$/,
  /^\/hr-admin\/payroll-review$/,
  /^\/hr-admin\/payroll-outputs$/,
  /^\/hr-admin\/payroll-handoff$/,
  /^\/hr-admin\/payroll-statutory$/,
  /^\/hr-admin\/payroll-providers$/,
];

function normalizePayrollHref(rawHref: string, baseUrl: string) {
  const url = new URL(rawHref, baseUrl);
  if (url.origin !== new URL(baseUrl).origin) {
    return null;
  }
  if (!payrollCorePathPatterns.some((pattern) => pattern.test(url.pathname))) {
    return null;
  }
  if (url.pathname.includes("[") || url.pathname.includes("]") || url.pathname.includes("undefined") || url.pathname.includes("null")) {
    return null;
  }
  return `${url.pathname}${url.search}`;
}

async function expectVisiblePayrollLinksHealthy(page: Page, route: string) {
  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => (link as HTMLAnchorElement).href),
  );
  const normalizedHrefs = [...new Set(hrefs.map((href) => normalizePayrollHref(href, page.url())).filter((href): href is string => Boolean(href)))];
  const unsupportedPayrollHrefs = hrefs.filter((href) => {
    const url = new URL(href, page.url());
    return url.origin === new URL(page.url()).origin
      && url.pathname.startsWith("/hr-admin/payroll")
      && !normalizePayrollHref(href, page.url());
  });

  expect(unsupportedPayrollHrefs, `${route} exposes unsupported payroll hrefs`).toEqual([]);
  expect(normalizedHrefs.length, `${route} should expose at least one certified payroll navigation link`).toBeGreaterThan(0);
}

async function expectNoVisibleControlCollisions(page: Page, route: string) {
  const collisions = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary").evaluateAll((elements) => {
    function clippedRect(element: Element) {
      let rect = element.getBoundingClientRect();
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
      const rect = clippedRect(element);
      const style = window.getComputedStyle(element);
      if (rect.width <= 0 || rect.height <= 0 || style.display === "none" || style.visibility === "hidden") {
        return [];
      }
      return [{
        index,
        label: (element.textContent || element.getAttribute("aria-label") || element.getAttribute("name") || element.tagName).trim(),
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        area: rect.width * rect.height,
        originalLeft: rect.original.left,
        originalRight: rect.original.right,
      }];
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

  expect(collisions, `${route} has clipped or overlapping payroll controls`).toEqual([]);
}

async function expectPayrollTypographyConsistent(page: Page, route: string) {
  const fontIssues = await page.locator("main").evaluate((main) => {
    const expectedFontToken = "Avenir Next";
    const sampledSelectors = [
      "h1",
      "h2",
      "h3",
      ".page-intro__title",
      ".workspace-card__title",
      ".metric-tile__value",
      ".payroll-setup-tab",
      ".payroll-setup-tab strong",
      ".setup-action-tab",
      ".setup-action-tab strong",
      ".button",
      "button",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "table th",
      "table td",
    ];

    function isVisible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    return sampledSelectors.flatMap((selector) => {
      const elements = Array.from(main.querySelectorAll(selector)).filter(isVisible).slice(0, 8);
      return elements.flatMap((element) => {
        const fontFamily = window.getComputedStyle(element).fontFamily;
        const isMonospaceContext = Boolean(element.closest("code, pre, kbd, samp"));
        if (isMonospaceContext || fontFamily.includes(expectedFontToken)) {
          return [];
        }
        const label = (element.textContent || element.getAttribute("aria-label") || selector).trim().replace(/\s+/g, " ").slice(0, 60);
        return [`${selector} "${label}" uses ${fontFamily}`];
      });
    }).slice(0, 12);
  });

  expect(fontIssues, `${route} has payroll typography drift`).toEqual([]);
}

async function expectSharedTabStructureConsistent(page: Page, route: string) {
  const tabIssues = await page.locator("main").evaluate((main) => {
    function isVisible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    const issues: string[] = [];
    const navs = Array.from(main.querySelectorAll<HTMLElement>(".payroll-setup-tabs, .setup-action-tabs"));
    navs.forEach((nav, navIndex) => {
      if (!isVisible(nav)) {
        return;
      }
      const tabSelector = nav.classList.contains("setup-action-tabs") ? ".setup-action-tab" : ".payroll-setup-tab";
      const activeSelector = nav.classList.contains("setup-action-tabs") ? ".setup-action-tab--active" : ".payroll-setup-tab--active";
      const tabs = Array.from(nav.querySelectorAll<HTMLElement>(tabSelector)).filter(isVisible);
      if (tabs.length < 2) {
        issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} has fewer than two visible tabs`);
        return;
      }

      const activeTabs = tabs.filter((tab) => tab.matches(activeSelector) || tab.getAttribute("aria-current") === "page");
      if (activeTabs.length !== 1) {
        issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} should expose exactly one active tab`);
      }

      const heights = tabs.map((tab) => tab.getBoundingClientRect().height);
      const minHeight = Math.min(...heights);
      const maxHeight = Math.max(...heights);
      if (maxHeight - minHeight > 18) {
        issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} has uneven tab heights (${Math.round(minHeight)}-${Math.round(maxHeight)}px)`);
      }

      tabs.forEach((tab, tabIndex) => {
        if (!tab.querySelector("strong")) {
          issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} tab ${tabIndex + 1} is missing a title`);
        }
        if (!tab.querySelector("span")) {
          issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} tab ${tabIndex + 1} is missing helper copy`);
        }
        const rect = tab.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 42) {
          issues.push(`${nav.getAttribute("aria-label") || `tab nav ${navIndex + 1}`} tab ${tabIndex + 1} is too compressed`);
        }
      });
    });
    return issues.slice(0, 12);
  });

  expect(tabIssues, `${route} has inconsistent payroll tab structure`).toEqual([]);
}

async function expectPayrollSectionsSmooth(page: Page, route: string) {
  const smoothnessIssues = await page.locator("main").evaluate((main) => {
    function isVisible(element: Element) {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    }

    function labelFor(element: Element, fallback: string) {
      return (element.textContent || element.getAttribute("aria-label") || fallback).trim().replace(/\s+/g, " ").slice(0, 72);
    }

    const issues: string[] = [];
    const pageTitle = main.querySelector("h1");
    if (pageTitle && isVisible(pageTitle)) {
      const titleStyle = window.getComputedStyle(pageTitle);
      const fontSize = Number.parseFloat(titleStyle.fontSize);
      const lineHeight = Number.parseFloat(titleStyle.lineHeight);
      if (fontSize > 38) {
        issues.push(`Page title is oversized at ${Math.round(fontSize)}px`);
      }
      if (Number.isFinite(lineHeight) && lineHeight / fontSize < 1.05) {
        issues.push("Page title line-height is too tight");
      }
    }

    const compactHeadings = Array.from(main.querySelectorAll<HTMLElement>(
      ".payroll-setup-panel__header h2, .payroll-setup-panel__header h3, .payroll-cycle-workbench-guide h2, .payroll-rule-workbench-guide h2",
    )).filter(isVisible);
    compactHeadings.forEach((heading) => {
      const style = window.getComputedStyle(heading);
      const fontSize = Number.parseFloat(style.fontSize);
      const lineHeight = Number.parseFloat(style.lineHeight);
      if (fontSize > 23) {
        issues.push(`Section heading "${labelFor(heading, "heading")}" is too dominant at ${Math.round(fontSize)}px`);
      }
      if (Number.isFinite(lineHeight) && lineHeight / fontSize < 1.08) {
        issues.push(`Section heading "${labelFor(heading, "heading")}" line-height is too tight`);
      }
    });

    const textCriticalControls = Array.from(main.querySelectorAll<HTMLElement>(
      [
        "button",
        "a.button",
        ".readiness-badge",
        ".payroll-setup-count",
        ".payroll-rule-selected-marker",
        ".payroll-input-run-card__counts span",
        ".payroll-cycle-workbench-guide__steps strong",
        ".payroll-cycle-workbench-guide__steps small",
        ".payroll-rule-workbench-guide__steps strong",
        ".payroll-rule-workbench-guide__steps small",
      ].join(", "),
    )).filter(isVisible);
    textCriticalControls.forEach((element) => {
      const style = window.getComputedStyle(element);
      const allowsWrap = style.whiteSpace !== "nowrap" && style.overflowWrap !== "normal";
      const isEllipsis = style.textOverflow === "ellipsis";
      if (!allowsWrap && !isEllipsis && element.scrollWidth > element.clientWidth + 3) {
        issues.push(`Text is clipped in "${labelFor(element, element.tagName)}"`);
      }
    });

    const actionRows = Array.from(main.querySelectorAll<HTMLElement>(
      ".page-intro__actions, .record-card__actions, .salary-crud-form__actions, .payroll-close-actions, .payroll-setup-panel__header--split",
    )).filter((element) => isVisible(element) && element.querySelectorAll("button, a.button").length > 1);
    actionRows.forEach((row) => {
      const style = window.getComputedStyle(row);
      if (style.display === "flex" && style.flexWrap === "nowrap" && row.scrollWidth > row.clientWidth + 2) {
        issues.push(`Action row "${labelFor(row, "actions")}" is cramped and cannot wrap`);
      }
      const buttons = Array.from(row.querySelectorAll<HTMLElement>("button, a.button")).filter(isVisible);
      buttons.forEach((button) => {
        const rect = button.getBoundingClientRect();
        if (rect.width < 72 && labelFor(button, "button").length > 8) {
          issues.push(`Button "${labelFor(button, "button")}" is too narrow`);
        }
      });
    });

    const heavyPanels = Array.from(main.querySelectorAll<HTMLElement>(
      ".payroll-setup-assignment-panel, .payroll-setup-main-panel, .payroll-setup-detail-panel, .payroll-setup-rail",
    )).filter(isVisible);
    heavyPanels.forEach((panel) => {
      const directVisibleControls = Array.from(panel.children).filter((child) =>
        isVisible(child) && Boolean(child.querySelector("button, a.button, input:not([type='hidden']), select, textarea")),
      ).length;
      const hasLocalStructure = Boolean(panel.querySelector(".payroll-setup-tabs, .setup-action-tabs, .payroll-setup-pagination, .payroll-table-scroll, details, .record-card__actions"));
      if (directVisibleControls > 8 && !hasLocalStructure) {
        issues.push(`Panel "${labelFor(panel, "panel")}" looks overcrowded without tabs, pagination, or drilldown structure`);
      }
    });

    const denseTables = Array.from(main.querySelectorAll<HTMLTableElement>("table")).filter(isVisible);
    denseTables.forEach((table) => {
      const visibleRows = Array.from(table.querySelectorAll("tbody tr")).filter(isVisible);
      const parentPanel = table.closest(".payroll-setup-assignment-panel, .payroll-setup-main-panel, .payroll-setup-detail-panel, .payroll-setup-rail");
      const hasPagination = Boolean(parentPanel?.querySelector(".payroll-setup-pagination"));
      const hasScrollContainer = Boolean(table.closest(".payroll-table-scroll"));
      if (visibleRows.length > 10 && !hasPagination) {
        issues.push(`Table "${labelFor(table, "table")}" shows ${visibleRows.length} rows without pagination`);
      }
      if (table.scrollWidth > table.clientWidth + 2 && !hasScrollContainer) {
        issues.push(`Table "${labelFor(table, "table")}" can overflow without a scroll container`);
      }
    });

    return issues.slice(0, 16);
  });

  expect(smoothnessIssues, `${route} has payroll section smoothness issues`).toEqual([]);
}

async function auditPayrollCoreRoute(page: Page, route: string) {
  await gotoAuthenticated(page, route);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
  await expect(page.locator("h1").first()).toBeVisible();
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
  await auditVisibleControls(page, route, 52);
  await expectVisibleLinksAreReal(page, route);
  await expectNoVisibleControlCollisions(page, route);
  await expectPayrollTypographyConsistent(page, route);
  await expectSharedTabStructureConsistent(page, route);
  await expectPayrollSectionsSmooth(page, route);
  await expectVisiblePayrollLinksHealthy(page, route);
}

test.describe("HR Admin payroll core UI audit", () => {
  test("certifies payroll core page layout, controls, and internal links", async ({ page }) => {
    test.setTimeout(360_000);
    await page.setViewportSize({ width: 1440, height: 960 });

    for (const route of payrollCoreRoutes) {
      await auditPayrollCoreRoute(page, route);
    }
  });
});
