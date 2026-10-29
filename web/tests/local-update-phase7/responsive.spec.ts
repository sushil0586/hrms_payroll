import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

const evidence = path.resolve(process.cwd(), "../docs/qa/evidence/local-update-phase7-2026-10-29");
const axeSource = readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
mkdirSync(evidence, { recursive: true });

async function scan(page: Page) {
  await page.addScriptTag({ content: axeSource });
  return page.evaluate(async () => (await (window as unknown as {
    axe: { run: (node: Element, options: unknown) => Promise<{ violations: unknown[] }> };
  }).axe.run(document.querySelector("main")!, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
  })).violations);
}

const routes = [
  { name: "catalog", path: "/hr-admin/reports" },
  { name: "attendance-register", path: "/hr-admin/reports/attendance-register" },
  { name: "attendance-exceptions", path: "/hr-admin/reports/attendance-exceptions" },
  { name: "leave-balance", path: "/hr-admin/reports/leave-balance" },
  { name: "workforce", path: "/hr-admin/reports/workforce" },
  { name: "payroll-register", path: "/hr-admin/reports/payroll-register" },
  { name: "payroll-close-readiness", path: "/hr-admin/reports/payroll-close-readiness" },
  { name: "statutory-deductions", path: "/hr-admin/reports/statutory-deductions" },
  { name: "document-compliance", path: "/hr-admin/reports/document-compliance" },
  { name: "export-audits", path: "/hr-admin/reports/export-audits" },
] as const;

test("Phase 7 report routes remain responsive and pass selected axe rules", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium", "Responsive evidence is captured once in Chromium.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const route of routes) {
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(response?.status(), route.path).toBe(200);
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const violations = await scan(page);
      writeFileSync(path.join(evidence, `chromium-${route.name}-${width}-axe.json`), `${JSON.stringify(violations, null, 2)}\n`);
      expect(violations).toEqual([]);
      await page.screenshot({ path: path.join(evidence, `chromium-${route.name}-${width}.png`), fullPage: true });
    }
  }
});
