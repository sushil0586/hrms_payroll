import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const evidence = path.resolve(process.cwd(), "../docs/qa/evidence/local-update-phase1a-2026-10-28");
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function openReady(page: Page, route: string, heading: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  await expect(page.locator("main[data-hydrated='true']")).toBeVisible();
}

async function scanMain(page: Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => {
    const axe = (window as unknown as {
      axe: { run: (root: unknown, options: unknown) => Promise<{ violations: unknown[] }> };
    }).axe;
    return (await axe.run(document.querySelector("main"), {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
    })).violations;
  });
}

for (const workspace of [
  { name: "attendance", route: "/ess/attendance", heading: "Attendance" },
  { name: "leave", route: "/ess/leave", heading: "Leave" },
] as const) {
  test(`${workspace.name} responsive layout and selected accessibility rules`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await openReady(page, workspace.route, workspace.heading);
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const violations = await scanMain(page);
      writeFileSync(
        path.join(evidence, `${testInfo.project.name}-${workspace.name}-${width}-axe.json`),
        `${JSON.stringify(violations, null, 2)}\n`,
      );
      expect(violations).toEqual([]);
      await page.screenshot({
        path: path.join(evidence, `${testInfo.project.name}-${workspace.name}-${width}.png`),
        fullPage: true,
      });
    }
  });
}
