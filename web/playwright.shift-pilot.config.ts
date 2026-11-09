import path from "node:path";
import { defineConfig } from "@playwright/test";

const listing = process.argv.includes("--list");
const run = process.env.HRMS_PILOT_RUN;
if (!listing && !run) throw new Error("Use node web/scripts/run-shift-pilot.mjs to reserve isolated evidence before execution");
const engines = ["chromium", "firefox", "webkit"] as const;
const viewports = [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }, { width: 320, height: 800 }];
export default defineConfig({
  testDir: "./tests", workers: 1, retries: 0, timeout: 180_000,
  metadata: { browserEngines: engines, viewportMatrix: viewports, actionViewport: viewports[0], sharedSpecsMayOverrideViewport: true },
  outputDir: run ? path.join(run, "results") : undefined,
  reporter: listing ? [["list"]] : [["list"], ["json", { outputFile: path.join(run!, "results.json") }]],
  use: { baseURL: "http://127.0.0.1:3259", trace: "retain-on-failure", screenshot: "on" },
  projects: [
    ...engines.flatMap(browserName => viewports.map(viewport => ({ name: `${browserName}-${viewport.width}`, testMatch: ["**/shift-pilot/accessibility.spec.ts", "**/shift-pilot/states.spec.ts", "**/shift-pilot/closure.spec.ts"], use: { browserName, viewport } }))),
    ...engines.map(browserName => ({ name: `${browserName}-actions`, testMatch: ["**/attendance-setup-actions/shift-roster-lifecycle.spec.ts", "**/employee-shift-actions/employee-shift-lifecycle.spec.ts"], grep: /shift Inspect|employee shift assignment buttons/, use: { browserName, viewport: viewports[0] } })),
    ...engines.map(browserName => ({ name: `${browserName}-shared`, testMatch: ["**/shell/global-shell.spec.ts", "**/ui-ux-rollout/dialogs.spec.ts"], use: { browserName, viewport: viewports[0] } })),
  ],
});
