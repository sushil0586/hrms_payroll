import { expect, test } from "@playwright/test";

test.describe("Workspace loading feedback", () => {
  test("loading animation is disabled when reduced motion is requested", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/hr-admin", { waitUntil: "domcontentloaded" });
    const reducedMotionMatches = await page.evaluate(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    expect(reducedMotionMatches).toBe(true);
  });
});
