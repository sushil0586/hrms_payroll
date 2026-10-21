import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/leave-feedback", workers: 1, retries: 0, timeout: 180000,
  outputDir: "../docs/qa/evidence/leave-feedback/latest/results",
  reporter: [["list"], ["json", { outputFile: "../docs/qa/evidence/leave-feedback/latest/results.json" }]],
  use: { baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3217", trace: "on", actionTimeout: 15000 },
  projects: ["chromium", "firefox", "webkit"].map(name => ({ name, use: { ...devices[name === "chromium" ? "Desktop Chrome" : name === "firefox" ? "Desktop Firefox" : "Desktop Safari"] } })),
});
