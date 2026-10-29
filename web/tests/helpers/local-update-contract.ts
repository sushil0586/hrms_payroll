import { expect, type Locator, type Page } from "@playwright/test";

export async function markLocalUpdateShell(page: Page, selector = "main") {
  const shell = page.locator(selector);
  await expect(shell).toHaveCount(1);
  await shell.evaluate((node: HTMLElement) => {
    node.dataset.localUpdateMarker = "preserved";
  });
  return shell;
}

export async function expectLocalUpdateShell(shell: Locator) {
  await expect(shell).toHaveAttribute("data-local-update-marker", "preserved");
}

export async function documentNavigationCount(page: Page) {
  return page.evaluate(() => performance.getEntriesByType("navigation").length);
}

export async function expectNoDocumentNavigation(page: Page, initialCount: number) {
  expect(await documentNavigationCount(page)).toBe(initialCount);
}

export async function expectScopedBusy(page: Page, region: Locator, pageHeading: Locator) {
  await expect(region).toHaveAttribute("aria-busy", "true");
  await expect(pageHeading).toBeVisible();
  await expect(page.locator("body")).not.toHaveAttribute("aria-busy", "true");
}
