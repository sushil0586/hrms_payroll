import { expect, type Page } from "@playwright/test";

export async function expectAppShell(page: Page) {
  await expect(page.locator("main.shell:not(.app-loading-shell)").first()).toBeVisible();
}

export async function expectModernHeader(page: Page, heading: string | RegExp) {
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
}

export async function expectNoAppError(page: Page) {
  await expect(page.getByText(/application error|could not load the live|unhandled runtime error/i)).toHaveCount(0);
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth);
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

export async function suppressBrowserTestNoise(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-dialog-overlay],
      [data-nextjs-toast],
      [data-nextjs-build-indicator],
      [aria-label="Next.js logo"] {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
}

export async function expectPageReady(page: Page, heading: string | RegExp) {
  await suppressBrowserTestNoise(page);
  await expectAppShell(page);
  await expectModernHeader(page, heading);
  await expectNoAppError(page);
  await expectNoHorizontalOverflow(page);
}
