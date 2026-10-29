import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

const evidence = path.resolve(process.cwd(), "../docs/qa/evidence/local-update-phase2b-2026-10-29");
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
mkdirSync(evidence, { recursive: true });

async function scan(page: Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await (window as any).axe.run(document.querySelector("main"), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations);
}

for (const workspace of [
  { name: "shifts", route: "/hr-admin/shifts", heading: "Shifts" },
  { name: "shift-assignments", route: "/hr-admin/employee-shift-assignments", heading: "Shift assignments" },
  { name: "roster-templates", route: "/hr-admin/shift-roster-templates", heading: "Roster templates" },
  { name: "holiday-calendars", route: "/hr-admin/holiday-calendars", heading: "Holiday calendars" },
] as const) {
  test(`${workspace.name} responsive layout and selected accessibility rules`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 }); const response = await page.goto(workspace.route, { waitUntil: "domcontentloaded" }); expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1, name: workspace.heading })).toBeVisible(); await expect(page.locator("[data-local-update-hydrated='true']")).toBeVisible();
      await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const violations = await scan(page); writeFileSync(path.join(evidence, `${testInfo.project.name}-${workspace.name}-${width}-axe.json`), `${JSON.stringify(violations, null, 2)}\n`); expect(violations).toEqual([]);
      await page.screenshot({ path: path.join(evidence, `${testInfo.project.name}-${workspace.name}-${width}.png`), fullPage: true });
    }
  });
}
