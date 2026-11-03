import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

import {
  cleanupIsolatedQaWorkspace,
  provisionIsolatedQaWorkspace,
  workspacePersona,
  type IsolatedQaWorkspace,
} from "../helpers/isolated-qa-workspace";

const repo = path.resolve(__dirname, "../../..");
const reports = [
  "attendance-register",
  "attendance-derivation-exceptions",
  "attendance-exceptions",
  "leave-attendance-collisions",
  "roster-rollout-audit",
] as const;
let fixture: IsolatedQaWorkspace;

test.beforeAll(async ({}, info) => {
  test.setTimeout(180_000);
  fixture = await provisionIsolatedQaWorkspace(info);
});

test.afterAll(async () => cleanupIsolatedQaWorkspace(fixture));

test.beforeEach(async ({ page }) => {
  const persona = workspacePersona(fixture, "hr_admin");
  expect((await page.request.post("/api/auth/login", { data: { identifier: persona.username, password: persona.password } })).status()).toBe(200);
});

async function openReport(page: Page, report: string) {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration|did not match/i.test(message.text())) hydrationErrors.push(message.text());
  });
  await page.goto(`/hr-admin/reports/${report}`);
  await expect(page.locator("main h1").first()).toBeVisible();
  await expect(page.locator(`[data-testid="${report}-report"]`)).toBeVisible();
  await expect(page.locator("[data-workspace-error]")).toHaveCount(0);
  expect(hydrationErrors).toEqual([]);
}

test("all attendance reports preserve filters, reset cleanly, and export authorized evidence", async ({ page }) => {
  for (const report of reports) {
    await openReport(page, report);
    const workspace = page.locator(`[data-testid="${report}-report"]`);
    await expect(workspace.locator(".report-command-panel")).toBeVisible();
    await expect(workspace.locator(".report-filter-panel")).toBeVisible();

    const search = workspace.getByRole("searchbox");
    await search.fill("QA-NO-SUCH-REPORT-ROW");
    await expect(page).toHaveURL(/q=QA-NO-SUCH-REPORT-ROW/);
    await expect(workspace.locator(".empty-state")).toBeVisible();
    await page.reload();
    await expect(workspace.getByRole("searchbox")).toHaveValue("QA-NO-SUCH-REPORT-ROW");

    await workspace.getByRole("button", { name: "Clear filters" }).click();
    await expect(workspace.getByRole("searchbox")).toHaveValue("");
    expect(new URL(page.url()).searchParams.get("q")).toBeNull();

    const csv = await page.evaluate(async (reportKey) => {
      const response = await fetch(`/api/hr-admin/reports/${reportKey}`, { credentials: "same-origin" });
      return { status: response.status, contentType: response.headers.get("content-type"), reportKey: response.headers.get("x-hrms-report-key"), body: await response.text() };
    }, report);
    expect(csv.status).toBe(200);
    expect(csv.contentType).toContain("text/csv");
    expect(csv.reportKey).toBe(report);
    expect(csv.body.length).toBeGreaterThan(10);

    const manifest = await page.evaluate(async (reportKey) => {
      const response = await fetch(`/api/hr-admin/reports/${reportKey}?format=manifest`, { credentials: "same-origin" });
      return { status: response.status, contentType: response.headers.get("content-type") };
    }, report);
    expect(manifest.status).toBe(200);
    expect(manifest.contentType).toContain("json");
  }
});

test("attendance report tables remain operable and accessible across responsive viewports", async ({ page }, info) => {
  for (const report of reports) {
    await openReport(page, report);
    for (const width of [1440, 768, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
      const tableRegion = page.locator("main .workspace-table-region").first();
      await tableRegion.focus();
      await expect(tableRegion).toBeFocused();
      if (await tableRegion.evaluate((element) => element.scrollWidth > element.clientWidth)) {
        await tableRegion.press("ArrowRight");
        expect(await tableRegion.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      }
      if (width === 390) {
        for (const button of await page.locator("main .button:visible").all()) {
          const box = await button.boundingBox();
          if (box) expect(box.height, await button.innerText()).toBeGreaterThanOrEqual(44);
        }
      }
      await page.screenshot({
        path: path.join(repo, "docs/qa/evidence/attendance-reports-actions", `${report}-${width}.png`),
        fullPage: true,
      });
    }

    await page.addScriptTag({ path: require.resolve("axe-core/axe.min.js") });
    const result = await page.evaluate(async () => {
      return (window as unknown as { axe: { run: (context: object, options: object) => Promise<{ violations: unknown[] }> } }).axe.run(
        { include: [["main"]] },
        { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } },
      );
    });
    await info.attach(`${report}-axe`, { body: JSON.stringify(result), contentType: "application/json" });
    expect(result.violations).toEqual([]);
  }
});
