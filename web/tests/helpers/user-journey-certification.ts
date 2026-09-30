import { expect, type Locator, type Page } from "@playwright/test";

import { expectNoAppError, expectNoHorizontalOverflow, suppressBrowserTestNoise } from "./assertions";
import { gotoAuthenticated, type Persona } from "./staging-auth";

export type UserJourneyPage = {
  path: string;
  heading: string | RegExp;
  persona: Persona;
  requiredText?: (string | RegExp)[];
  optionalText?: (string | RegExp)[];
};

type TypographySample = {
  label: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
};

async function visible(locator: Locator) {
  return locator.isVisible().catch(() => false);
}

async function expectVisibleText(page: Page, route: string, text: string | RegExp) {
  const matches = page.getByText(text);
  const count = await matches.count();
  for (let index = 0; index < count; index += 1) {
    if (await visible(matches.nth(index))) {
      return;
    }
  }
  await expect(matches.first(), `${route} should show ${String(text)}`).toBeVisible();
}

async function expectTypographyIsProfessional(page: Page, route: string) {
  const samples = await page.locator("main h1, main h2, main h3, main p, main label, main button, main a, main td, main th")
    .evaluateAll((elements) => {
      return elements
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        })
        .slice(0, 40)
        .map((element) => {
          const style = window.getComputedStyle(element);
          const fontSize = Number.parseFloat(style.fontSize || "0");
          const lineHeight = style.lineHeight === "normal" ? fontSize * 1.2 : Number.parseFloat(style.lineHeight || "0");
          return {
            label: (element.textContent || element.tagName).trim().slice(0, 48),
            fontFamily: style.fontFamily,
            fontSize,
            fontWeight: Number.parseInt(style.fontWeight || "0", 10),
            lineHeight,
          };
        });
    }) as TypographySample[];

  expect(samples.length, `${route} should expose readable text samples`).toBeGreaterThan(0);
  for (const sample of samples) {
    expect(sample.fontSize, `${route} text "${sample.label}" should not be tiny`).toBeGreaterThanOrEqual(10);
    expect(sample.fontSize, `${route} text "${sample.label}" should not be oversized`).toBeLessThanOrEqual(44);
    expect(sample.lineHeight, `${route} text "${sample.label}" should have breathing room`).toBeGreaterThanOrEqual(sample.fontSize);
    expect(sample.fontWeight, `${route} text "${sample.label}" should avoid ultra-heavy display weight`).toBeLessThanOrEqual(900);
  }
}

async function expectControlsAreUsable(page: Page, route: string) {
  const issues = await page.locator("main button, main a.button, main input:not([type='hidden']), main select, main textarea, main summary")
    .evaluateAll((elements) => {
      return elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (rect.width <= 0 || rect.height <= 0 || style.visibility === "hidden" || style.display === "none") {
          return [];
        }

        const label = (element.textContent || element.getAttribute("aria-label") || element.getAttribute("placeholder") || element.tagName).trim();
        const inputType = element instanceof HTMLInputElement ? element.type : "";
        if (inputType === "file" && (element.classList.contains("sr-only") || element.closest("label.button"))) {
          return [];
        }
        const labelTarget = inputType === "checkbox" || inputType === "radio" ? element.closest("label") : null;
        const labelRect = labelTarget?.getBoundingClientRect();
        const hasComfortableLabelTarget = Boolean(labelRect && labelRect.width >= 28 && labelRect.height >= 28);
        const minimumSize = inputType === "checkbox" || inputType === "radio" ? 12 : 28;
        const textClipped = element.scrollWidth > element.clientWidth + 2 && Boolean((element.textContent || "").trim());

        if (rect.left < -1 || rect.right > document.documentElement.clientWidth + 1) {
          return [`${label || element.tagName} is outside the viewport`];
        }
        if ((rect.width < minimumSize || rect.height < minimumSize) && !hasComfortableLabelTarget) {
          return [`${label || element.tagName} is too small to use comfortably`];
        }
        if (textClipped) {
          return [`${label || element.tagName} has clipped text`];
        }
        return [];
      }).slice(0, 12);
    });

  expect(issues, `${route} visible controls should be usable`).toEqual([]);
}

async function expectVisibleLinksAreHealthy(page: Page, route: string) {
  const badLinks = await page.locator("main a[href], aside a[href], header a[href]").evaluateAll((links) =>
    links
      .filter((link) => {
        const rect = link.getBoundingClientRect();
        const style = window.getComputedStyle(link);
        return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      })
      .map((link) => link.getAttribute("href") ?? "")
      .filter((href) => href === "#" || href.includes("[") || href.includes("undefined") || href.includes("null")),
  );

  expect(badLinks, `${route} should not show placeholder or broken hrefs`).toEqual([]);
}

async function expectInteractiveStatesDoNotBreakLayout(page: Page, route: string) {
  const controls = page.locator("main button, main a.button, main summary, aside a, header button");
  const count = Math.min(await controls.count(), 16);
  for (let index = 0; index < count; index += 1) {
    const control = controls.nth(index);
    if (!(await visible(control))) {
      continue;
    }
    await control.scrollIntoViewIfNeeded().catch(() => undefined);
    await control.hover({ timeout: 1_000 }).catch(() => undefined);
    await expectNoHorizontalOverflow(page);
  }
}

export async function expectActualUserReadyPage(page: Page, target: UserJourneyPage) {
  await suppressBrowserTestNoise(page);
  await gotoAuthenticated(page, target.path, target.persona);
  await suppressBrowserTestNoise(page);
  await expect(page.locator("main.shell:not(.app-loading-shell), main").first(), `${target.path} should render main content`).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: target.heading }).first(), `${target.path} should expose the expected heading`).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`${target.path.split("?")[0].replaceAll("/", "\\/")}(\\?|$)`));
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);

  for (const text of target.requiredText ?? []) {
    await expectVisibleText(page, target.path, text);
  }
  for (const text of target.optionalText ?? []) {
    await page.getByText(text).first().isVisible().catch(() => false);
  }

  await expectTypographyIsProfessional(page, target.path);
  await expectControlsAreUsable(page, target.path);
  await expectVisibleLinksAreHealthy(page, target.path);
  await expectInteractiveStatesDoNotBreakLayout(page, target.path);
}
